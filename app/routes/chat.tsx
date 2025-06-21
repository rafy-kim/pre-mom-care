"use client";

import { useState, useEffect, useRef } from "react";
import { Bookmark, Settings } from "lucide-react";
import { Button } from "~/components/ui/button";
import { ChatInput } from "~/components/chat/ChatInput";
import { ChatMessage } from "~/components/chat/ChatMessage";
import { LoginBanner } from "~/components/auth/LoginBanner";
import { IMessage } from "types";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Bot } from "lucide-react";
import { TypingIndicator } from "~/components/chat/TypingIndicator";
import { type LoaderFunctionArgs, json, redirect } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { getAuth } from "@clerk/remix/ssr.server";
import { SignedIn, SignedOut, UserButton, SignInButton } from "@clerk/remix";
import { db, userProfiles } from "~/db";
import { eq } from "drizzle-orm";

export const loader = async (args: LoaderFunctionArgs) => {
  const { userId } = await getAuth(args);

  if (userId) {
    const userProfile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.id, userId),
    });

    if (!userProfile) {
      return redirect("/onboarding");
    }
    return json({ userProfile });
  }

  return json({ userProfile: null });
};

const MOCK_MESSAGES: IMessage[] = [
  {
    id: "1",
    role: "assistant",
    content: {
      answer: "안녕하세요! 저는 '안심이'에요. 무엇이든 물어보세요.",
      sources: [] 
    },
  },
];

export default function ChatPage() {
  const { userProfile } = useLoaderData<typeof loader>();
  const [messages, setMessages] = useState<IMessage[]>(MOCK_MESSAGES);
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (text: string) => {
    const newUserMessage: IMessage = {
      id: String(Date.now()),
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, newUserMessage]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: text }),
      });

      if (!response.ok) {
        throw new Error("API call failed");
      }

      const { reply } = await response.json();

      const aiResponse: IMessage = {
        id: String(Date.now() + 1),
        role: "assistant",
        content: reply,
      };
      setMessages((prev) => [...prev, aiResponse]);
    } catch (error) {
      console.error("Error fetching AI response:", error);
      const errorResponse: IMessage = {
        id: String(Date.now() + 1),
        role: "assistant",
        content: {
          answer: "죄송합니다. 답변을 생성하는 동안 오류가 발생했습니다.",
          sources: []
        },
      };
      setMessages((prev) => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const isGuest = !userProfile;

  let greeting = "아기를 만나기까지";
  let dDayText = "D - ??";

  if (userProfile) {
    greeting = `${userProfile.baby_nickname}를 만나기까지`;
    
    const dueDate = new Date(userProfile.dueDate);
    const today = new Date();
    const dDay = Math.ceil(
      (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    dDayText = dDay > 0 ? `D - ${dDay}` : dDay === 0 ? "D-Day" : `D + ${-dDay}`;
  }

  return (
    <div className="flex flex-col h-screen bg-light-gray">
      <header className="border-b bg-white">
        <div className="flex items-center justify-between w-full max-w-4xl p-4 mx-auto">
          <div>
            <h1 className="text-lg font-bold">{greeting}</h1>
            <p className="text-sm text-muted-foreground">{dDayText}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Bookmark className="w-5 h-5" />
            </Button>
            <SignedIn>
              <UserButton />
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <Button>시작하기</Button>
              </SignInButton>
            </SignedOut>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col overflow-y-hidden">
        <div className="flex-1 w-full max-w-4xl px-4 pt-4 mx-auto space-y-4 overflow-y-auto no-scrollbar">
          {messages.map((msg) => (
            <ChatMessage key={msg.id} {...msg} />
          ))}
          {isLoading && (
            <div className="flex items-start gap-3 justify-start">
              <Avatar>
                <AvatarImage src="/ansimi.png" alt="안심이 마스코트" />
                <AvatarFallback>
                  <Bot className="h-6 w-6" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-muted rounded-lg">
                <TypingIndicator />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        {isGuest && (
          <div className="w-full max-w-4xl px-4 mx-auto mt-auto pb-2">
            <LoginBanner />
          </div>
        )}
      </main>

      <footer className="bg-white border-t">
        <div className="w-full max-w-4xl p-4 mx-auto">
          <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
        </div>
      </footer>
    </div>
  );
} 