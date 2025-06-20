import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Card, CardContent, CardFooter } from "~/components/ui/card";
import { cn } from "~/lib/utils";
import { Bot } from "lucide-react";
import { IMessage } from "types";

export function ChatMessage({ role, text, source }: IMessage) {
  const isUser = role === "user";
  return (
    <div
      className={cn(
        "flex items-start gap-3",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {!isUser && (
        <Avatar>
          <AvatarFallback>
            <Bot className="h-6 w-6" />
          </AvatarFallback>
        </Avatar>
      )}
      <Card
        className={cn(
          "max-w-md",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted"
        )}
      >
        <CardContent className="p-3">
          <p>{text}</p>
        </CardContent>
        {!isUser && source && (
          <CardFooter className="p-3 pt-0">
            <p className="text-xs text-muted-foreground">출처: {source}</p>
          </CardFooter>
        )}
      </Card>
    </div>
  );
} 