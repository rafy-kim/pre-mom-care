"use client";

import { useState, useEffect, useRef } from "react";
import { type ActionFunctionArgs, json, redirect } from "@remix-run/node";
import { useSubmit } from "@remix-run/react";
import { getAuth } from "@clerk/remix/ssr.server";
import { nanoid } from "nanoid";
import { db, chats, messages } from "~/db";
import { IMessage } from "types";

import { ChatInput } from "~/components/chat/ChatInput";
import { ChatMessage } from "~/components/chat/ChatMessage";
import { TypingIndicator } from "~/components/chat/TypingIndicator";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Bot } from "lucide-react";
import { LoginBanner } from "~/components/auth/LoginBanner";

export const action = async (args: ActionFunctionArgs) => {
  const { userId } = await getAuth(args);
  if (!userId) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await args.request.formData();
  const userMessageContent = formData.get("message") as string;

  if (!userMessageContent) {
    return json({ error: "Message is required" }, { status: 400 });
  }
  
  // 1. 새 대화(chat) 생성
  const newChatId = nanoid();
  await db.insert(chats).values({
    id: newChatId,
    userId: userId,
    title: userMessageContent.substring(0, 50), // 첫 메시지를 제목으로 사용
  });

  // 2. 초기 인사 메시지 저장
  const greetingMessage: IMessage = {
    id: nanoid(),
    role: "assistant",
    content: {
      answer: "안녕하세요! 저는 '안심이'에요. 무엇이든 물어보세요.",
      sources: [] 
    },
  };
  await db.insert(messages).values({
    id: greetingMessage.id,
    chatId: newChatId,
    role: greetingMessage.role,
    content: greetingMessage.content,
  });

  // 3. 사용자 메시지 저장
  const userMessage: IMessage = {
    id: nanoid(),
    role: "user",
    content: userMessageContent,
  };
  await db.insert(messages).values({
    id: userMessage.id,
    chatId: newChatId,
    role: userMessage.role,
    content: userMessage.content,
  });

  // 4. 사용자의 첫 메시지에 대한 AI 응답 생성
  try {
    const geminiResponse = await fetch(
      new URL("/api/gemini", args.request.url),
      {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          // Clerk 인증 정보만 선택적으로 전달
          ...(args.request.headers.get("authorization") && {
            "authorization": args.request.headers.get("authorization")!
          }),
          ...(args.request.headers.get("cookie") && {
            "cookie": args.request.headers.get("cookie")!
          })
        },
        body: JSON.stringify({ message: userMessageContent }),
      }
    );

    if (geminiResponse.ok) {
      const { reply } = await geminiResponse.json();
      const aiMessage: IMessage = {
        id: nanoid(),
        role: "assistant",
        content: reply,
      };
      await db.insert(messages).values({
        id: aiMessage.id,
        chatId: newChatId,
        role: aiMessage.role,
        content: aiMessage.content as any,
      });
    }
  } catch (error) {
    console.error("Error fetching AI response for the first message:", error);
    // AI 첫 응답에 실패하더라도 일단 대화방은 만들어주도록 리디렉션합니다.
  }
  
  // 5. 생성된 대화 페이지로 리디렉션
  return redirect(`/chat/${newChatId}`);
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

export default function ChatIndexPage() {
  const [messages, setMessages] = useState<IMessage[]>(MOCK_MESSAGES);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const submit = useSubmit();

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

    const formData = new FormData();
    formData.append("message", text);
    submit(formData, { method: "post" });
  };

  return (
    <div className="flex flex-col h-full mobile-container">
      <div className="flex-1 w-full max-w-4xl px-2 sm:px-4 pt-4 mx-auto space-y-4 overflow-y-auto no-scrollbar overscroll-contain">
        {messages.map((msg) => (
          <div key={msg.id} className="w-full min-w-0">
            <ChatMessage {...msg} />
          </div>
        ))}
        {isLoading && (
          <div className="flex items-start gap-2 sm:gap-3 justify-start w-full min-w-0">
            <Avatar className="flex-shrink-0">
              <AvatarImage src="/ansimi.png" alt="안심이 마스코트" />
              <AvatarFallback>
                <Bot className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>
            <div className="bg-muted rounded-lg p-3 min-w-0">
              <TypingIndicator />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <footer className="bg-white border-t pb-safe">
        <div className="w-full max-w-4xl p-4 mx-auto">
          <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
        </div>
      </footer>
    </div>
  );
} 