export interface ISource {
  reference: string;
  page?: number | string; // page can be number for books, or string for other things
  refType?: 'book' | 'youtube' | 'paper';
  videoTitle?: string;
  videoUrl?: string;
  timestamp?: number; // in seconds
  timestamps?: {
    seconds: number;
    url: string;
  }[];
}

export interface IMessage {
  id: string;
  chatId?: string;
  role: "user" | "assistant";
  content: string | { 
    answer: string;
    sources: ISource[];
  };
} 

// 사용자 등급 타입 정의
export type MembershipTier = 'basic' | 'premium' | 'expert';

// 사용자 프로필 인터페이스
export interface IUserProfile {
  id: string;
  baby_nickname: string;
  dueDate: Date;
  gender: 'boy' | 'girl' | 'unknown';
  relation: 'mother' | 'father';
  membershipTier: MembershipTier;
  createdAt: Date;
  updatedAt: Date;
}

// 등급별 허용되는 참고 자료 타입
export interface ITierPermissions {
  allowedRefTypes: ('book' | 'youtube' | 'paper')[];
}

// 등급별 권한 매핑
export const TIER_PERMISSIONS: Record<MembershipTier, ITierPermissions> = {
  basic: {
    allowedRefTypes: ['youtube'] // 일반 사용자는 YouTube만
  },
  premium: {
    allowedRefTypes: ['youtube', 'paper'] // 프리미엄 사용자는 YouTube + 논문
  },
  expert: {
    allowedRefTypes: ['book', 'youtube', 'paper'] // 전문가 등급은 모든 자료
  }
}; 

// 🎯 토스페이먼츠 결제 시스템 타입 정의

// 결제 수단 타입
export type PaymentMethod = 'card' | 'virtual_account' | 'bank_transfer' | 'mobile_money';

// 결제 상태 타입  
export type PaymentStatus = 'pending' | 'confirmed' | 'failed' | 'cancelled' | 'refunded';

// 구독 상태 타입
export type SubscriptionStatus = 'active' | 'cancelled' | 'paused' | 'expired';

// 결제 주기 타입
export type BillingPeriod = 'monthly' | 'yearly';

// 구독 계획 인터페이스
export interface ISubscriptionPlan {
  id: string;
  name: string;
  membershipTier: 'premium' | 'expert';
  price: number;
  billingPeriod: BillingPeriod;
  dailyQuestionLimit: number;
  weeklyQuestionLimit: number;
  monthlyQuestionLimit: number;
  features: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// 사용자 구독 정보 인터페이스  
export interface ISubscription {
  id: string;
  userId: string;
  planId: string;
  status: SubscriptionStatus;
  startDate: Date;
  endDate: Date;
  autoRenew: boolean;
  tossCustomerKey?: string;
  tossBillingKey?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// 결제 기록 인터페이스
export interface IPayment {
  id: string;
  userId: string;
  subscriptionId?: string;
  planId: string;
  tossPaymentKey: string;
  tossOrderId: string;
  amount: number;
  method: string;
  status: PaymentStatus;
  paidAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// 토스페이먼츠 결제 요청 인터페이스
export interface ITossPaymentRequest {
  orderId: string;
  orderName: string;
  amount: number;
  customerEmail?: string;
  customerName?: string;
  customerMobilePhone?: string;
  successUrl: string;
  failUrl: string;
}

// 토스페이먼츠 결제 승인 요청 인터페이스
export interface ITossPaymentConfirm {
  paymentKey: string;
  orderId: string;
  amount: number;
}

// 토스페이먼츠 결제 승인 응답 인터페이스
export interface ITossPaymentResponse {
  paymentKey: string;
  orderId: string;
  orderName: string;
  method: string;
  totalAmount: number;
  status: string;
  requestedAt: string;
  approvedAt?: string;
  card?: {
    company: string;
    number: string;
    installmentPlanMonths: number;
    isInterestFree: boolean;
    acquireStatus: string;
  };
  virtualAccount?: {
    bank: string;
    accountNumber: string;
    dueDate: string;
  };
  transfer?: {
    bank: string;
    settlementStatus: string;
  };
  mobilePhone?: {
    settlementStatus: string;
    receiptUrl: string;
  };
  receipt?: {
    url: string;
  };
  checkout?: {
    url: string;
  };
  currency: string;
  failure?: {
    code: string;
    message: string;
  };
}

// 결제 UI 상태 인터페이스
export interface IPaymentUIState {
  isLoading: boolean;
  selectedPlan?: ISubscriptionPlan;
  paymentMethod?: PaymentMethod;
  error?: string;
}

// API 응답 공통 인터페이스
export interface IPaymentApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 🎯 Freemium UI 컴포넌트 인터페이스

// 프리미엄 업그레이드 모달 Props 인터페이스
export interface IPremiumUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin?: () => void; // 게스트 모드에서 로그인을 유도할 때 사용
} 