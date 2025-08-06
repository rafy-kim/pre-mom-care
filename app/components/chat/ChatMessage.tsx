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
  isStreaming?: boolean; // 스트리밍 중인지 여부
}

export function ChatMessage({
  id,
  role,
  content,
  isBookmarked,
  disableActions = false,
  isStreaming = false,
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
      return (
        <div className="whitespace-pre-wrap break-words overflow-wrap-anywhere">
          {textContent}
        </div>
      );
    }
    
    // For AI messages, apply markdown rendering
    return (
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ node, ...props }) => (
              <p className="mb-2 last:mb-0 break-words overflow-wrap-anywhere" {...props} />
            ),
            // 긴 단어나 URL이 포함된 요소들에 대한 추가 처리
            a: ({ node, ...props }) => (
              <a className="break-all" {...props} />
            ),
            code: ({ node, ...props }) => (
              <code className="break-all" {...props} />
            ),
            pre: ({ node, ...props }) => (
              <pre className="overflow-x-auto text-sm" {...props} />
            ),
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
          <span className="text-xs text-gray-900 flex items-center min-w-0">
            <span className="flex-shrink-0">{source.reference}:</span>
            <span className="ml-1 truncate min-w-0">
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
        <span className="text-xs text-gray-900 break-words overflow-wrap-anywhere">
          {source.reference}{source.page ? ` - p.${source.page}` : ''}
        </span>
      );
    }
  };

  const sources = typeof content === 'object' && content.sources;

  return (
    <div
      className={cn(
        "group flex items-start gap-2 sm:gap-3 w-full",
        isUser ? "justify-end" : "justify-start"
      )}
      id={id}
    >
      {!isUser && (
        <Avatar className="flex-shrink-0">
          <AvatarImage src="/ansimi.png" alt="안심이 마스코트" />
          <AvatarFallback>
            <Bot className="h-6 w-6" />
          </AvatarFallback>
        </Avatar>
      )}
      <div className={cn(
        "min-w-0", // 중요: flex 자식 요소가 축소될 수 있도록 함
        !isUser && 'flex-1',
        isUser && 'max-w-[85%] sm:max-w-2xl' // 사용자 메시지의 최대 폭 제한
      )}>
        <Card
          className={cn(
            "relative w-full", // max-w-2xl 제거하고 w-full 사용
            "break-words overflow-hidden", // 긴 단어 자동 줄바꿈과 오버플로우 숨김
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted",
            isStreaming && "animate-pulse border-blue-300"
            // pr-10 패딩 제거 - 더 이상 우측 상단 버튼 공간이 필요하지 않음
          )}
        >
          <CardContent className="p-3 sm:p-4">
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
                      className="flex items-center gap-2 p-2 bg-white rounded border border-gray-100 hover:border-gray-200 transition-colors min-w-0"
                    >
                      {/* 아이콘 */}
                      <div className="flex-shrink-0">
                        {renderSourceIcon(source.refType)}
                      </div>
                      
                      {/* 콘텐츠 */}
                      <div className="flex-1 min-w-0 overflow-hidden">
                        {renderSourceContent(source)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardFooter>
          )}
          {!isUser && !isGreetingMessage && !disableActions && !isStreaming && (
            <div className="border-t p-3 pt-2 bg-gray-50/20">
              <div className="flex items-center justify-end gap-2">
                {/* 북마크 버튼 */}
                <fetcher.Form method="post" action="/api/bookmark" className="inline-block">
                  <input type="hidden" name="messageId" value={id} />
                  <Button
                    type="submit"
                    name="intent"
                    value={isCurrentlyBookmarked ? 'unbookmark' : 'bookmark'}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-8 px-3 rounded-full transition-all duration-200 text-xs font-medium",
                      isCurrentlyBookmarked 
                        ? "bg-yellow-100 hover:bg-yellow-200 text-yellow-700 border border-yellow-200" 
                        : "bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-700 border border-gray-200 shadow-sm"
                    )}
                  >
                    <Bookmark
                      className={cn(
                        'h-3 w-3 mr-1.5 transition-colors',
                        isCurrentlyBookmarked ? 'fill-current' : '',
                      )}
                    />
                    {isCurrentlyBookmarked ? '저장됨' : '저장'}
                  </Button>
                </fetcher.Form>
                
                {/* 공유하기 버튼 */}
                <Button
                  onClick={handleShare}
                  variant="ghost"
                  size="sm"
                  className="h-8 px-3 rounded-full transition-all duration-200 bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-700 border border-gray-200 shadow-sm text-xs font-medium"
                  title="답변 공유하기"
                >
                  <Share className="h-3 w-3 mr-1.5 transition-colors" />
                  공유
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
} 