import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Card, CardContent, CardFooter } from "~/components/ui/card";
import { cn } from "~/lib/utils";
import { Bot, BookOpen, Bookmark, Play, Clock } from "lucide-react";
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

  const renderSourceIcon = (refType?: string) => {
    switch (refType) {
      case 'youtube':
        return <Play className="h-3.5 w-3.5 flex-shrink-0 text-red-500" />;
      case 'book':
        return <BookOpen className="h-3.5 w-3.5 flex-shrink-0 text-blue-500" />;
      case 'paper':
        return <BookOpen className="h-3.5 w-3.5 flex-shrink-0 text-green-500" />;
      default:
        return <BookOpen className="h-3.5 w-3.5 flex-shrink-0 text-gray-500" />;
    }
  };

  const renderSourceContent = (source: ISource) => {
    if (source.refType === 'youtube') {
      return (
        <div className="flex items-center flex-wrap gap-2">
          {/* 채널명: 영상 제목 */}
          <span className="text-xs text-gray-900 flex items-center">
            <span>{source.reference}:</span>
            <span className="ml-1 truncate max-w-xs">
              {source.videoTitle || '영상 제목'}
            </span>
          </span>
          
          {/* 시청 시간 */}
          {source.timestamps && source.timestamps.length > 0 ? (
            source.timestamps.map((time, idx) => (
              <a
                key={idx}
                href={time.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-gray-100 hover:bg-gray-200 rounded text-xs text-gray-700 hover:text-gray-900 transition-colors"
              >
                <Clock className="h-2.5 w-2.5" />
                {Math.floor(time.seconds / 60)}:{Math.floor(time.seconds % 60).toString().padStart(2, '0')}
              </a>
            ))
          ) : source.timestamp !== undefined && (
            <a
              href={source.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-gray-100 hover:bg-gray-200 rounded text-xs text-gray-700 hover:text-gray-900 transition-colors"
            >
              <Clock className="h-2.5 w-2.5" />
              {Math.floor(source.timestamp / 60)}:{Math.floor(source.timestamp % 60).toString().padStart(2, '0')}
            </a>
          )}
        </div>
      );
    } else {
      // 도서 또는 논문: 책 제목 - 페이지
      return (
        <span className="text-xs text-gray-900">
          {source.reference}{source.page ? ` - p.${source.page}` : ''}
        </span>
      );
    }
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
            <CardFooter className="border-t p-3 pt-2 bg-gray-50/50">
              <div className="w-full">
                <h4 className="mb-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">참고 자료</h4>
                <div className="space-y-2">
                  {sources.map((source: ISource, index: number) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 bg-white rounded border border-gray-100 hover:border-gray-200 transition-colors"
                    >
                      {/* 아이콘 */}
                      <div className="flex-shrink-0">
                        {renderSourceIcon(source.refType)}
                      </div>
                      
                      {/* 콘텐츠 */}
                      <div className="flex-1 min-w-0">
                        {renderSourceContent(source)}
                      </div>
                    </div>
                  ))}
                </div>
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