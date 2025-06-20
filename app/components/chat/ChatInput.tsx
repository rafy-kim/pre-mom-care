"use client";

import { useState, useRef, KeyboardEvent, useEffect } from "react";
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isLoading && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isLoading]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!message.trim() || isLoading) return;
    onSendMessage(message);
    setMessage("");
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-start gap-2">
      <Textarea
        ref={textareaRef}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="무엇이든 물어보세요... (Shift+Enter로 줄바꿈)"
        disabled={isLoading}
        className={cn(
          "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          "resize-none"
        )}
        minRows={1}
        maxRows={5}
      />
      <Button type="submit" size="icon" disabled={isLoading || !message.trim()}>
        <SendHorizonal className="h-4 w-4" />
      </Button>
    </form>
  );
} 