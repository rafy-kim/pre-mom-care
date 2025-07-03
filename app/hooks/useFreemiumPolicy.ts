import { useState, useEffect } from "react";
import { useAuth } from "@clerk/remix";
import type { userProfiles } from "~/db/schema";

// Freemium 정책 상수
export const FREEMIUM_LIMITS = {
  GUEST_SESSION_LIMIT: 1,           // 게스트 세션당 질문 제한
  DAILY_FREE_LIMIT: 3,              // 하루 무료 질문 제한
  WEEKLY_FREE_LIMIT: 10,            // 주간 무료 질문 제한  
  MONTHLY_FREE_LIMIT: 30,           // 월간 무료 질문 제한
  SUBSCRIPTION_PRICE: 4900,         // 구독 가격 (원)
} as const;

// 질문 제한 상태 타입
export interface IFreemiumState {
  // 게스트 모드
  isGuest: boolean;
  guestQuestionsUsed: number;
  
  // 로그인 사용자
  dailyQuestionsUsed: number;
  weeklyQuestionsUsed: number;
  monthlyQuestionsUsed: number;
  
  // 구독 상태
  isSubscribed: boolean;
  subscriptionExpiresAt: Date | null;
  
  // 제한 상태
  isLimitReached: boolean;
  limitType: 'guest' | 'daily' | 'weekly' | 'monthly' | 'none';
  
  // 남은 질문 수
  remainingQuestions: number;
}

// 질문 제한 체크 결과
export interface IQuestionLimitCheck {
  canAsk: boolean;
  limitType: 'guest' | 'daily' | 'weekly' | 'monthly' | 'none';
  remainingQuestions: number;
  resetTime?: Date;
}

type UserProfile = Omit<typeof userProfiles.$inferSelect, 'dueDate' | 'lastQuestionAt' | 'createdAt' | 'updatedAt'> & {
  dueDate: string | Date;
  lastQuestionAt: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
} | null;

/**
 * Freemium 정책을 관리하는 커스텀 훅
 * 질문 제한, 구독 상태, 결제 유도 로직을 처리합니다.
 */
export function useFreemiumPolicy(userProfile?: UserProfile) {
  const { userId, isLoaded } = useAuth();
  
  // 게스트 세션 질문 수 (localStorage에 저장)
  const [guestQuestionsUsed, setGuestQuestionsUsed] = useState(0);
  
  // 로그인 사용자 질문 수 (서버에서 가져오기)
  const [userQuestionCounts, setUserQuestionCounts] = useState({
    daily: 0,
    weekly: 0,
    monthly: 0,
  });
  
  // userQuestionCounts 변경 감지를 위한 useEffect (개발 환경에서만 로그 출력)
  // userQuestionCounts 변경 감지 (로그 제거됨)
  
  // 구독 상태
  const [subscriptionStatus, setSubscriptionStatus] = useState({
    isSubscribed: false,
    expiresAt: null as Date | null,
  });
  
  // 로딩 상태
  const [isLoading, setIsLoading] = useState(true);
  
  // 초기화 완료 플래그 (localStorage 중복 읽기 방지)
  const [isInitialized, setIsInitialized] = useState(false);

  // 게스트 모드 질문 수 localStorage에서 로드 (초기화 시 한 번만)
  useEffect(() => {
    if (isLoaded && !isInitialized) {
      if (!userId) {
        // 게스트 사용자
        const stored = localStorage.getItem('guestQuestionCount');
        const initialCount = stored ? parseInt(stored, 10) : 0;
        setGuestQuestionsUsed(initialCount);
        setIsInitialized(true);
        setIsLoading(false);
      } else if (userProfile) {
        // 로그인 사용자 (userProfile 데이터가 있을 때)
        setUserQuestionCounts({
          daily: userProfile.dailyQuestionsUsed,
          weekly: userProfile.weeklyQuestionsUsed,
          monthly: userProfile.monthlyQuestionsUsed,
        });

        setSubscriptionStatus({
          isSubscribed: userProfile.membershipTier === 'premium',
          expiresAt: null, // TODO: 구독 만료일 필드 추가 시 반영
        });
        
        setIsInitialized(true);
        setIsLoading(false);
      } else {
        // 로그인 사용자지만, userProfile 데이터가 아직 없을 때
        setUserQuestionCounts({
          daily: 0,
          weekly: 0,
          monthly: 0,
        });
        
        setSubscriptionStatus({
          isSubscribed: false,
          expiresAt: null,
        });
        
        setIsInitialized(true);
        setIsLoading(false);
      }
    }
  }, [userId, isLoaded, isInitialized, userProfile]);

  /**
   * 질문 가능 여부를 확인하는 함수
   */
  const checkQuestionLimit = (): IQuestionLimitCheck => {
    // 로딩 중이면 질문 불가
    if (isLoading || !isLoaded) {
      return {
        canAsk: false,
        limitType: 'none',
        remainingQuestions: 0,
      };
    }

    // 구독 사용자는 무제한
    if (subscriptionStatus.isSubscribed) {
      return {
        canAsk: true,
        limitType: 'none',
        remainingQuestions: Infinity,
      };
    }

    // 게스트 사용자 제한 체크
    if (!userId) {
      const remaining = FREEMIUM_LIMITS.GUEST_SESSION_LIMIT - guestQuestionsUsed;
      return {
        canAsk: remaining > 0,
        limitType: 'guest',
        remainingQuestions: Math.max(0, remaining),
      };
    }

    // 로그인 사용자 제한 체크 (일/주/월 순서대로)
    const dailyRemaining = FREEMIUM_LIMITS.DAILY_FREE_LIMIT - userQuestionCounts.daily;
    const weeklyRemaining = FREEMIUM_LIMITS.WEEKLY_FREE_LIMIT - userQuestionCounts.weekly;
    const monthlyRemaining = FREEMIUM_LIMITS.MONTHLY_FREE_LIMIT - userQuestionCounts.monthly;

    // 가장 제한적인 조건을 찾기
    if (dailyRemaining <= 0) {
      return {
        canAsk: false,
        limitType: 'daily',
        remainingQuestions: 0,
        resetTime: getTomorrowMidnight(),
      };
    }
    
    if (weeklyRemaining <= 0) {
      return {
        canAsk: false,
        limitType: 'weekly', 
        remainingQuestions: 0,
        resetTime: getNextWeekReset(),
      };
    }
    
    if (monthlyRemaining <= 0) {
      return {
        canAsk: false,
        limitType: 'monthly',
        remainingQuestions: 0,
        resetTime: getNextMonthReset(),
      };
    }

    // 가장 작은 남은 횟수 반환
    const minRemaining = Math.min(dailyRemaining, weeklyRemaining, monthlyRemaining);
    
    return {
      canAsk: true,
      limitType: 'none',
      remainingQuestions: minRemaining,
    };
  };

  /**
   * 질문 후 카운트 증가
   */
  const incrementQuestionCount = async () => {
    if (!userId) {
      // 게스트 사용자: localStorage 업데이트
      const newCount = guestQuestionsUsed + 1;
      setGuestQuestionsUsed(newCount);
      localStorage.setItem('guestQuestionCount', newCount.toString());
    } else {
      // 로그인 사용자: 서버 API 호출 + 로컬 상태 업데이트
      // TODO: 실제 서버 API 호출로 교체
      const newCounts = {
        daily: userQuestionCounts.daily + 1,
        weekly: userQuestionCounts.weekly + 1,
        monthly: userQuestionCounts.monthly + 1,
      };
      setUserQuestionCounts(newCounts);
    }
  };

  /**
   * 구독 상태 업데이트
   */
  const updateSubscriptionStatus = (isSubscribed: boolean, expiresAt?: Date) => {
    setSubscriptionStatus({
      isSubscribed,
      expiresAt: expiresAt || null,
    });
  };

  /**
   * 외부에서 사용자 질문 카운트 업데이트 (서버 응답 기반)
   */
  const updateUserCounts = (counts: { daily: number; weekly: number; monthly: number }) => {
    setUserQuestionCounts(counts);
    // 실시간 업데이트 시 로딩 상태를 false로 설정하여 UI 반영 보장
    setIsLoading(false);
  };

  /**
   * 개발용: 게스트 상태 초기화 함수
   */
  const resetGuestState = () => {
    localStorage.removeItem('guestQuestionCount');
    setGuestQuestionsUsed(0);
  };

  /**
   * 개발용: 현재 게스트 상태 확인 함수
   */
  const getGuestStatus = () => {
    const localStorageValue = localStorage.getItem('guestQuestionCount');
    return {
      localStorage: localStorageValue,
      state: guestQuestionsUsed,
      hasAskedFirstQuestion: guestQuestionsUsed > 0,
      isInitialized,
      isLoading,
    };
  };

  // 현재 상태 계산
  const currentLimit = checkQuestionLimit();
  
  const state: IFreemiumState = {
    isGuest: !userId,
    guestQuestionsUsed,
    dailyQuestionsUsed: userQuestionCounts.daily,
    weeklyQuestionsUsed: userQuestionCounts.weekly,
    monthlyQuestionsUsed: userQuestionCounts.monthly,
    isSubscribed: subscriptionStatus.isSubscribed,
    subscriptionExpiresAt: subscriptionStatus.expiresAt,
    isLimitReached: !currentLimit.canAsk,
    limitType: currentLimit.limitType,
    remainingQuestions: currentLimit.remainingQuestions,
  };

  return {
    ...state,
    isLoading,
    checkQuestionLimit,
    incrementQuestionCount,
    updateSubscriptionStatus,
    updateUserCounts,
    resetGuestState,
    getGuestStatus,
    LIMITS: FREEMIUM_LIMITS,
  };
}

// 유틸리티 함수들
function getTomorrowMidnight(): Date {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow;
}

function getNextWeekReset(): Date {
  const nextWeek = new Date();
  const daysUntilMonday = (8 - nextWeek.getDay()) % 7;
  nextWeek.setDate(nextWeek.getDate() + daysUntilMonday);
  nextWeek.setHours(0, 0, 0, 0);
  return nextWeek;
}

function getNextMonthReset(): Date {
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  nextMonth.setDate(1);
  nextMonth.setHours(0, 0, 0, 0);
  return nextMonth;
} 