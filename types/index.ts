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

// 🎯 포트원(PortOne) V2 결제 시스템 타입 정의

// 결제 수단 타입 (포트원 V2 표준)
export type PaymentMethod = 'CARD' | 'VIRTUAL_ACCOUNT' | 'TRANSFER' | 'MOBILE' | 'GIFT_CERTIFICATE' | 'EASY_PAY';

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
  portoneCustomerKey?: string;
  portoneBillingKey?: string;
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
  portonePaymentKey: string;
  portoneOrderId: string;
  amount: number;
  method: string;
  status: PaymentStatus;
  paidAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// 포트원 V2 고객 정보 인터페이스
export interface ICustomer {
  customerId?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  email?: string;
  address?: IAddress;
}

// 주소 정보 인터페이스
export interface IAddress {
  country?: string;
  addressLine1: string;
  addressLine2: string;
  city?: string;
  province?: string;
}

// 포트원 V2 결제 요청 인터페이스
export interface IPortOnePaymentRequest {
  storeId: string;
  channelKey: string;
  paymentId: string;
  orderName: string;
  totalAmount: number;
  currency: string;
  payMethod: PaymentMethod;
  customer?: ICustomer;
  customData?: Record<string, any>;
  redirectUrl?: string;
  noticeUrls?: string[];
}

// 포트원 V2 결제 결과 인터페이스
export interface IPortOnePaymentResult {
  code?: string;
  message?: string;
  paymentId?: string;
  txId?: string;
}

// 포트원 V2 결제 검증 인터페이스
export interface IPortOnePaymentVerification {
  status: 'PAID' | 'FAILED' | 'CANCELLED' | 'PARTIAL_CANCELLED';
  paymentId: string;
  orderName: string;
  amount: number;
  currency: string;
  customer?: ICustomer;
  customData?: Record<string, any>;
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