import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Card, CardContent, CardFooter } from "~/components/ui/card";
import { cn } from "~/lib/utils";
import { Bot, BookOpen, Bookmark } from "lucide-react";
import { IMessage, ISource } from "types";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useFetcher } from '@remix-run/react';
import { Button } from '../ui/button';

interface ChatMessageProps extends IMessage {
  isBookmarked?: boolean;
}

export function ChatMessage({
  id,
  role,
  content,
  isBookmarked,
}: ChatMessageProps) {
  const isUser = role === "user";
  const fetcher = useFetcher();

  // Optimistic UI for bookmark
  const isCurrentlyBookmarked = fetcher.formData
    ? fetcher.formData.get('intent') === 'bookmark'
    : isBookmarked;

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
        "group flex items-start gap-3",
        isUser ? "justify-end" : "justify-start"
      )}
      id={id}
    >
      {!isUser && (
        <Avatar>
          <AvatarImage src="/ansimi.png" alt="안심이 마스코트" />
          <AvatarFallback>
            <Bot className="h-6 w-6" />
          </AvatarFallback>
        </Avatar>
      )}
      <div className={cn('relative', !isUser && 'flex-1')}>
        <Card
          className={cn(
            "max-w-2xl",
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted",
            !isUser && "pr-12" // Add padding for the bookmark button
          )}
        >
          <CardContent className="p-4">
            {renderContent()}
          </CardContent>
          {!isUser && sources && sources.length > 0 && (
            <CardFooter className="mt-2 border-t p-4 pt-0">
              <div>
                <h4 className="mb-2 text-xs font-semibold">참고 자료</h4>
                <ul className="space-y-1">
                  {sources.map((source: ISource, index: number) => (
                    <li
                      key={index}
                      className="flex items-center gap-2 text-xs text-muted-foreground"
                    >
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
        {!isUser && (
          <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
            <fetcher.Form method="post" action="/api/bookmark">
              <input type="hidden" name="messageId" value={id} />
              <Button
                type="submit"
                name="intent"
                value={isCurrentlyBookmarked ? 'unbookmark' : 'bookmark'}
                variant="ghost"
                size="icon"
                className="h-8 w-8"
              >
                <Bookmark
                  className={cn(
                    'h-4 w-4',
                    isCurrentlyBookmarked && 'fill-yellow-400 text-yellow-500',
                  )}
                />
              </Button>
            </fetcher.Form>
          </div>
        )}
      </div>
    </div>
  );
} 