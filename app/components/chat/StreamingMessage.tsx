import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Card, CardContent } from "~/components/ui/card";
import { Bot } from "lucide-react";

const loadingMessages = [
  "답변을 생성하고 있어요...",
  "신뢰할 수 있는 정보를 찾고 있어요...",
  "전문가의 지식을 확인하고 있어요...",
  "거의 다 됐어요...",
];

export function StreamingMessage() {
  const [messageIndex, setMessageIndex] = useState(0);
  const [dots, setDots] = useState("");

  useEffect(() => {
    // 메시지 순환
    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 2000);

    // 점 애니메이션
    const dotsInterval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 500);

    return () => {
      clearInterval(messageInterval);
      clearInterval(dotsInterval);
    };
  }, []);

  return (
    <div className="flex items-start justify-start gap-2 sm:gap-3 w-full min-w-0">
      <Avatar className="flex-shrink-0">
        <AvatarImage src="/ansimi.png" alt="안심이 마스코트" />
        <AvatarFallback>
          <Bot className="h-6 w-6" />
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <Card className="relative w-full bg-muted animate-pulse">
          <CardContent className="p-3 sm:p-4">
            <p className="text-muted-foreground">
              {loadingMessages[messageIndex]}{dots}
            </p>
            <div className="mt-2 space-y-2">
              <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}