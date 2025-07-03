"use client";

import { useState, useRef, KeyboardEvent, useEffect, CompositionEvent } from "react";
import Textarea from "react-textarea-autosize";
import { Button } from "~/components/ui/button";
import { SendHorizonal } from "lucide-react";
import { cn } from "~/lib/utils";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

export function ChatInput({ onSendMessage, isLoading }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isLoading && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isLoading]);

  const handleSubmit = (e?: React.FormEvent) => {
    // console.log('📝 [ChatInput] handleSubmit 호출됨:', message);
    e?.preventDefault();
    // console.log('📝 [ChatInput] preventDefault 완료');
    if (!message.trim() || isLoading) {
      // console.log('📝 [ChatInput] 메시지 비어있거나 로딩 중 - 리턴');
      return;
    }
    // console.log('📝 [ChatInput] onSendMessage 호출 시작:', message);
    onSendMessage(message);
    // console.log('📝 [ChatInput] onSendMessage 호출 완료');
    setMessage("");
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      // console.log('⌨️ [ChatInput] Enter 키 처리 - isComposing:', isComposing);
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleCompositionStart = (e: CompositionEvent<HTMLTextAreaElement>) => {
    // console.log('🔤 [ChatInput] Composition 시작');
    setIsComposing(true);
  };

  const handleCompositionEnd = (e: CompositionEvent<HTMLTextAreaElement>) => {
    // console.log('🔤 [ChatInput] Composition 종료');
    setIsComposing(false);
  };

  return (
    <div className="flex items-start gap-2 w-full min-w-0">
      <Textarea
        ref={textareaRef}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        placeholder="무엇이든 물어보세요"
        disabled={isLoading}
        className={cn(
          "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          "resize-none min-w-0 touch-manipulation",
          "text-base sm:text-sm" // 모바일에서 폰트 크기를 키워 줌 확대 방지
        )}
        minRows={1}
        maxRows={5}
      />
      <Button 
        type="button" 
        size="icon" 
        disabled={isLoading || !message.trim()}
        className="flex-shrink-0 touch-manipulation"
        onClick={() => handleSubmit()}
      >
        <SendHorizonal className="h-4 w-4" />
      </Button>
    </div>
  );
} 