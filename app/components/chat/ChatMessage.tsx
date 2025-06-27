import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Card, CardContent, CardFooter } from "~/components/ui/card";
import { cn } from "~/lib/utils";
import { Bot, BookOpen, Bookmark, Play, Clock, Share } from "lucide-react";
import { IMessage, ISource } from "types";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useFetcher } from '@remix-run/react';
import { Button } from '../ui/button';

interface ChatMessageProps extends IMessage {
  isBookmarked?: boolean;
  disableActions?: boolean; // 북마크/공유 버튼 비활성화 여부
}

export function ChatMessage({
  id,
  role,
  content,
  isBookmarked,
  disableActions = false,
}: ChatMessageProps) {
  const isUser = role === "user";
  const fetcher = useFetcher();

  // Optimistic UI for bookmark
  const isCurrentlyBookmarked = fetcher.formData
    ? fetcher.formData.get('intent') === 'bookmark'
    : isBookmarked;

  // 안심이의 첫 인사말인지 확인
  const textContent = typeof content === 'string' ? content : content.answer;
  const isGreetingMessage = !isUser && textContent === "안녕하세요! 저는 '안심이'에요. 무엇이든 물어보세요.";

  const handleShare = async () => {
    // 메시지 상세 페이지 URL 생성
    const shareUrl = `${window.location.origin}/share/message/${id}`;
    
    const shareData = {
      // title: '예비맘, 안심 톡 - AI 답변',
      // text: textContent,
      url: shareUrl,
    };

    try {
      if (navigator.share) {
        // 모바일 기기의 웹 공유 API 사용
        await navigator.share(shareData);
      } else {
        // 웹 공유 API가 지원되지 않는 경우 클립보드에 URL 복사
        await navigator.clipboard.writeText(shareUrl);
        // 간단한 알림 표시 (추후 toast 라이브러리 사용 가능)
        alert('답변 링크가 클립보드에 복사되었습니다.');
      }
    } catch (error) {
      console.error('공유 실패:', error);
    }
  };

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
            !isUser && !isGreetingMessage && !disableActions && "pr-10" // Add padding for the bookmark button only when needed
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
          {!isUser && !isGreetingMessage && !disableActions && (
            <div className="absolute right-2 top-2 flex flex-col gap-1">
              {/* 북마크 버튼 */}
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
              
              {/* 공유하기 버튼 */}
              <Button
                onClick={handleShare}
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full transition-all duration-200 bg-white/80 hover:bg-white text-gray-400 hover:text-gray-600 shadow-sm"
                title="답변 공유하기"
              >
                <Share className="h-3.5 w-3.5 transition-colors" />
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
} 