import React from "react";
import { Badge } from "~/components/ui/badge";
import { Progress } from "~/components/ui/progress";
import { Clock, Zap, Calendar, CalendarDays } from "lucide-react";
import { FREEMIUM_LIMITS } from "~/hooks/useFreemiumPolicy";

export interface IQuestionLimitIndicatorProps {
  compact?: boolean;
  isLoading: boolean;
  isGuest: boolean;
  isSubscribed: boolean;
  remainingQuestions: number;
  limitType: 'guest' | 'daily' | 'weekly' | 'monthly' | 'none';
  guestQuestionsUsed: number;
  dailyQuestionsUsed: number;
  weeklyQuestionsUsed: number;
  monthlyQuestionsUsed: number;
}

/**
 * 질문 제한 현황을 표시하는 컴포넌트
 * 게스트/로그인 사용자별로 다른 UI를 제공합니다.
 */
export function QuestionLimitIndicator({ 
  compact = false,
  isLoading,
  isGuest,
  isSubscribed,
  remainingQuestions,
  limitType,
  guestQuestionsUsed,
  dailyQuestionsUsed,
  weeklyQuestionsUsed,
  monthlyQuestionsUsed,
}: IQuestionLimitIndicatorProps) {

  // 디버깅 로그
  console.log('🎨 [QuestionLimitIndicator] 렌더링됨 (Props):', {
    compact,
    isLoading,
    isGuest,
    isSubscribed,
    remainingQuestions,
    limitType,
    guestQuestionsUsed,
    dailyQuestionsUsed,
    weeklyQuestionsUsed,
    monthlyQuestionsUsed
  });

  if (isLoading) {
    console.log('🎨 [QuestionLimitIndicator] 로딩 상태 - 스켈레톤 표시');
    return (
      <div className="flex items-center gap-2">
        <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  // 구독 사용자는 무제한 표시
  if (isSubscribed) {
    return (
      <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
        <Zap className="h-3 w-3 mr-1" />
        무제한
      </Badge>
    );
  }

  // 게스트 사용자 UI
  if (isGuest) {
    const isLimitReached = guestQuestionsUsed >= FREEMIUM_LIMITS.GUEST_SESSION_LIMIT;
    
    if (compact) {
      return (
        <Badge 
          variant={isLimitReached ? "destructive" : "secondary"}
          className="text-xs"
        >
          {remainingQuestions}/1 남음
        </Badge>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 text-sm text-gray-600">
          <Clock className="h-4 w-4" />
          <span>둘러보기</span>
        </div>
        <Badge 
          variant={isLimitReached ? "destructive" : "outline"}
          className="text-xs"
        >
          {isLimitReached ? "체험 완료" : `${remainingQuestions}회 남음`}
        </Badge>
      </div>
    );
  }

  // 로그인 사용자 UI
  const getLimitIcon = () => {
    switch (limitType) {
      case 'daily': return <Clock className="h-3 w-3" />;
      case 'weekly': return <Calendar className="h-3 w-3" />;
      case 'monthly': return <CalendarDays className="h-3 w-3" />;
      default: return <Zap className="h-3 w-3" />;
    }
  };

  const getLimitText = () => {
    if (remainingQuestions === 0) {
      switch (limitType) {
        case 'daily': return "오늘 질문 완료";
        case 'weekly': return "이번 주 질문 완료";
        case 'monthly': return "이번 달 질문 완료";
        default: return "질문 가능";
      }
    }
    
    return `${remainingQuestions}회 남음`;
  };

  const getProgress = () => {
    switch (limitType) {
      case 'daily':
        return (dailyQuestionsUsed / FREEMIUM_LIMITS.DAILY_FREE_LIMIT) * 100;
      case 'weekly':
        return (weeklyQuestionsUsed / FREEMIUM_LIMITS.WEEKLY_FREE_LIMIT) * 100;
      case 'monthly':
        return (monthlyQuestionsUsed / FREEMIUM_LIMITS.MONTHLY_FREE_LIMIT) * 100;
      default:
        // 가장 제한적인 것을 기준으로 표시
        const dailyProgress = (dailyQuestionsUsed / FREEMIUM_LIMITS.DAILY_FREE_LIMIT) * 100;
        const weeklyProgress = (weeklyQuestionsUsed / FREEMIUM_LIMITS.WEEKLY_FREE_LIMIT) * 100;
        const monthlyProgress = (monthlyQuestionsUsed / FREEMIUM_LIMITS.MONTHLY_FREE_LIMIT) * 100;
        return Math.max(dailyProgress, weeklyProgress, monthlyProgress);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Badge 
          variant={remainingQuestions === 0 ? "destructive" : "outline"}
          className="text-xs"
        >
          {getLimitIcon()}
          <span className="ml-1">{getLimitText()}</span>
        </Badge>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-sm text-gray-600">
            {getLimitIcon()}
            <span>무료 질문</span>
          </div>
          <Badge 
            variant={remainingQuestions === 0 ? "destructive" : "outline"}
            className="text-xs"
          >
            {getLimitText()}
          </Badge>
        </div>
      </div>

      {/* 프로그레스 바 */}
      <div className="space-y-1">
        <Progress 
          value={getProgress()} 
          className="h-2"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>
            {limitType === 'daily' && `오늘 ${dailyQuestionsUsed}/${FREEMIUM_LIMITS.DAILY_FREE_LIMIT}`}
            {limitType === 'weekly' && `이번 주 ${weeklyQuestionsUsed}/${FREEMIUM_LIMITS.WEEKLY_FREE_LIMIT}`}
            {limitType === 'monthly' && `이번 달 ${monthlyQuestionsUsed}/${FREEMIUM_LIMITS.MONTHLY_FREE_LIMIT}`}
            {limitType === 'none' && `오늘 ${dailyQuestionsUsed}/${FREEMIUM_LIMITS.DAILY_FREE_LIMIT}`}
          </span>
          <span className="text-blue-600">
            월 {FREEMIUM_LIMITS.SUBSCRIPTION_PRICE.toLocaleString()}원으로 무제한
          </span>
        </div>
      </div>
    </div>
  );
} 