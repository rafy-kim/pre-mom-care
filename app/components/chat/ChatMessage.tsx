import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Card, CardContent, CardFooter } from "~/components/ui/card";
import { cn } from "~/lib/utils";
import { Bot, BookOpen } from "lucide-react";
import { IMessage, ISource } from "types";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function ChatMessage({ role, content }: IMessage) {
  const isUser = role === "user";

  const renderContent = () => {
    const textContent = typeof content === 'string' ? content : content.answer;
    
    // For user messages, we still want to preserve line breaks but not apply markdown.
    if (isUser) {
      return <div className="whitespace-pre-wrap">{textContent}</div>;
    }
    
    // For AI messages, apply markdown rendering
    return (
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
          }}
        >
          {textContent}
        </ReactMarkdown>
      </div>
    );
  };

  const sources = typeof content === 'object' && content.sources;

  return (
    <div
      className={cn(
        "flex items-start gap-3",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {!isUser && (
        <Avatar>
          <AvatarImage src="/ansimi.png" alt="안심이 마스코트" />
          <AvatarFallback>
            <Bot className="h-6 w-6" />
          </AvatarFallback>
        </Avatar>
      )}
      <Card
        className={cn(
          "max-w-2xl",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted"
        )}
      >
        <CardContent className="p-4">
          {renderContent()}
        </CardContent>
        {!isUser && sources && sources.length > 0 && (
          <CardFooter className="p-4 pt-0 border-t mt-2">
            <div>
              <h4 className="text-xs font-semibold mb-2">참고 자료</h4>
              <ul className="space-y-1">
                {sources.map((source: ISource, index: number) => (
                  <li key={index} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <BookOpen className="h-4 w-4 flex-shrink-0" />
                    <span>
                      {source.reference}
                      {source.page ? ` (p.${source.page})` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
} 