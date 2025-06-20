"use client";

import { useState, useEffect, useRef } from "react";
import { Bookmark, Settings } from "lucide-react";
import { Button } from "~/components/ui/button";
import { ChatInput } from "~/components/chat/ChatInput";
import { ChatMessage, IMessage } from "~/components/chat/ChatMessage";
import { LoginBanner } from "~/components/auth/LoginBanner";

const MOCK_MESSAGES: IMessage[] = [
  {
    id: "1",
    role: "assistant",
    text: "안녕하세요! 예비맘, 안심 톡입니다. 무엇이든 물어보세요.",
    source: "튼튼맘의 임신출산백과",
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

  const handleSendMessage = (text: string) => {
    const newUserMessage: IMessage = {
      id: String(Date.now()),
      role: "user",
      text,
    };
    setMessages((prev) => [...prev, newUserMessage]);
    setUserMessageCount(prev => prev + 1);
    setIsLoading(true);

    // AI 응답 시뮬레이션
    setTimeout(() => {
      const aiResponse: IMessage = {
        id: String(Date.now() + 1),
        role: "assistant",
        text: `\"${text}\"에 대한 답변을 생성했습니다. (시뮬레이션)`,
        source: "AI 시뮬레이션"
      };
      setMessages((prev) => [...prev, aiResponse]);
      setIsLoading(false);
    }, 1500);
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
        <div ref={messagesEndRef} />
      </main>

      <footer className="p-4 bg-white border-t">
        {showLoginBanner && <div className="mb-4"><LoginBanner onLogin={handleLogin} onDismiss={handleDismissBanner} /></div>}
        <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
      </footer>
    </div>
  );
} 