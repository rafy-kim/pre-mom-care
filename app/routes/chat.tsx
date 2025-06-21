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

const MOCK_MESSAGES: IMessage[] = [
  {
    id: "1",
    role: "assistant",
    content: {
      answer: "안녕하세요! 예비맘, 안심 톡입니다. 무엇이든 물어보세요.",
      sources: [] 
    },
  },
];

export default function ChatPage() {
  const [messages, setMessages] = useState<IMessage[]>(MOCK_MESSAGES);
  const [isLoading, setIsLoading] = useState(false);
  
  // 로그인 기능 관련 상태
  const [userMessageCount, setUserMessageCount] = useState(0);
  const [showLoginBanner, setShowLoginBanner] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  useEffect(() => {
    if (userMessageCount >= 3) {
      setShowLoginBanner(true);
    }
  }, [userMessageCount]);

  const handleSendMessage = async (text: string) => {
    const newUserMessage: IMessage = {
      id: String(Date.now()),
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, newUserMessage]);
    setUserMessageCount(prev => prev + 1);
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
  
  const handleLogin = () => {
    console.log("카카오 로그인 시도...");
    setShowLoginBanner(false);
  }
  
  const handleDismissBanner = () => {
    setShowLoginBanner(false);
  }

  return (
    <div className="flex flex-col h-screen bg-light-gray">
      <header className="flex items-center justify-between p-4 border-b bg-white">
        <div>
          <h1 className="text-lg font-bold">튼튼이 아빠, 안녕하세요!</h1>
          <p className="text-sm text-muted-foreground">D-180</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon"><Bookmark className="h-5 w-5" /></Button>
          <Button variant="ghost" size="icon"><Settings className="h-5 w-5" /></Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-4">
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
      </main>

      <footer className="p-4 bg-white border-t">
        {showLoginBanner && <div className="mb-4"><LoginBanner onLogin={handleLogin} onDismiss={handleDismissBanner} /></div>}
        <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
      </footer>
    </div>
  );
} 