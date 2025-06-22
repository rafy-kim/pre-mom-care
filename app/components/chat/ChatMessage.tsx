import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Card, CardContent, CardFooter } from "~/components/ui/card";
import { cn } from "~/lib/utils";
import { Bot, BookOpen, Bookmark, Play } from "lucide-react";
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
      <div className={cn(!isUser && 'flex-1')}>
        <Card
          className={cn(
            "max-w-2xl relative",
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted",
            !isUser && "pr-10" // Add padding for the bookmark button
          )}
        >
          <CardContent className="p-4">
            {renderContent()}
          </CardContent>
          {!isUser && sources && sources.length > 0 && (
            <CardFooter className="mt-2 border-t p-4 pt-0">
              <div>
                <h4 className="mb-2 text-xs font-semibold">참고 자료</h4>
                <ul className="space-y-2">
                  {sources.map((source: ISource, index: number) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 text-xs text-muted-foreground"
                    >
                      {source.refType === 'youtube' ? (
                        <Play className="h-4 w-4 flex-shrink-0 mt-0.5 text-red-500" />
                      ) : (
                        <BookOpen className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        {source.refType === 'youtube' ? (
                          <div className="space-y-1">
                            {/* 채널명 */}
                            <div className="text-xs text-gray-500 font-medium">
                              📺 {source.reference}
                            </div>
                            
                            {/* 영상 제목 */}
                            <div className="text-xs text-gray-600 leading-tight">
                              {source.videoTitle && source.videoTitle !== source.reference ? source.videoTitle : '영상 제목'}
                            </div>
                            
                            {/* 재생 시간들 */}
                            {source.timestamps && source.timestamps.length > 0 ? (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {source.timestamps.map((time, idx) => (
                                  <a
                                    key={idx}
                                    href={time.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium"
                                  >
                                    🕒 {Math.floor(time.seconds / 60)}:{Math.floor(time.seconds % 60).toString().padStart(2, '0')}
                                  </a>
                                ))}
                              </div>
                            ) : source.timestamp !== undefined && (
                              <div className="flex items-center gap-1 text-xs">
                                <a
                                  href={source.videoUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline font-medium"
                                >
                                  🕒 {Math.floor(source.timestamp / 60)}:{Math.floor(source.timestamp % 60).toString().padStart(2, '0')}
                                </a>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span>
                            {source.reference}
                            {source.page ? ` (p.${source.page})` : ''}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </CardFooter>
          )}
          {!isUser && (
            <div className="absolute right-2 top-2">
              <fetcher.Form method="post" action="/api/bookmark">
                <input type="hidden" name="messageId" value={id} />
                <Button
                  type="submit"
                  name="intent"
                  value={isCurrentlyBookmarked ? 'unbookmark' : 'bookmark'}
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-7 w-7 rounded-full transition-all duration-200",
                    isCurrentlyBookmarked 
                      ? "bg-yellow-100 hover:bg-yellow-200 text-yellow-600" 
                      : "bg-white/80 hover:bg-white text-gray-400 hover:text-gray-600 shadow-sm"
                  )}
                >
                  <Bookmark
                    className={cn(
                      'h-3.5 w-3.5 transition-colors',
                      isCurrentlyBookmarked ? 'fill-current' : '',
                    )}
                  />
                </Button>
              </fetcher.Form>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
} 