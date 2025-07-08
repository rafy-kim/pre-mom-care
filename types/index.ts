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
  pgProvider?: string;
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

// 🎯 나이스페이먼츠 Easy Pay 타입 정의
export type NicePayEasyPayProvider = 'KAKAOPAY' | 'NAVERPAY' | 'SSGPAY';

// 🎯 나이스페이먼츠 V2 카드 직접 입력 빌링 결제 타입 정의

// 카드사 목록
export type CardCompany = 
  | 'HYUNDAI' | 'SAMSUNG' | 'SHINHAN' | 'KB' | 'BC' | 'HANA' | 'LOTTE' 
  | 'WOORI' | 'NH' | 'CITI' | 'KAKAOBANK' | 'TOSSBANK' | 'UNKNOWN';

// 빌링키 발급 방법 (카드만 지원)
export type BillingKeyMethod = 'CARD';

// 빌링키 상태
export type BillingKeyStatus = 'active' | 'inactive' | 'expired';

// 카드 입력 단계
export type CardInputStep = 'card-input' | 'billing-issue' | 'payment-process' | 'complete';

// 카드 정보 입력 폼
export interface ICardForm {
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cardholderName: string;
  birthOrBusinessNumber: string; // 생년월일(6자리) 또는 사업자번호(10자리)
  passwordTwoDigits: string; // 비밀번호 앞 2자리
}

// 카드 정보 검증 에러
export interface ICardFormValidation {
  cardNumber?: string;
  expiryMonth?: string;
  expiryYear?: string;
  cardholderName?: string;
  birthOrBusinessNumber?: string;
  passwordTwoDigits?: string;
}

// 나이스페이먼츠 카드 빌링키 발급 요청 인터페이스
export interface INicePayCardBillingKeyRequest {
  storeId: string;
  channelKey: string;
  billingKeyMethod: BillingKeyMethod;
  issueId: string; // 영문 대소문자, 숫자만 40자 이내
  issueName: string; // 결제창 표시 제목
  customer: ICustomer;
  card: {
    number: string;
    expiryYear: string;
    expiryMonth: string;
    birthOrBusinessRegistrationNumber: string;
    passwordTwoDigits: string;
  };
}

// 나이스페이먼츠 카드 빌링키 발급 응답 인터페이스
export interface INicePayCardBillingKeyResult {
  code?: string;
  message?: string;
  billingKey?: string;
  issueId?: string;
  pgTxId?: string;
  cardCompany?: CardCompany;
  maskedCardNumber?: string; // 마스킹된 카드번호 (예: **** **** **** 1234)
}

// 나이스페이먼츠 카드 빌링키 정보 인터페이스
export interface INicePayCardBillingKeyInfo {
  id: string;
  userId: string;
  billingKey: string;
  issueId: string;
  cardCompany: CardCompany;
  maskedCardNumber: string;
  status: BillingKeyStatus;
  issuedAt: Date;
  expiresAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// 나이스페이먼츠 정기결제 요청 인터페이스 (카드 빌링키 사용)
export interface INicePayCardRecurringPaymentRequest {
  storeId: string;
  channelKey: string;
  paymentId: string;
  billingKey: string;
  orderName: string;
  amount: number;
  currency: string;
  customData?: Record<string, any>;
  customer?: ICustomer;
  noticeUrls?: string[];
}

// 나이스페이먼츠 정기결제 응답 인터페이스
export interface INicePayCardRecurringPaymentResult {
  code?: string;
  message?: string;
  paymentId?: string;
  txId?: string;
  amount?: number;
  status?: string;
  paidAt?: string;
}

// 카드 빌링 결제 모달 Props 인터페이스
export interface ICardBillingPaymentProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin?: () => void;
  onPaymentSuccess?: () => void;
}

// 카드 빌링 UI 상태 인터페이스
export interface ICardBillingUIState {
  currentStep: CardInputStep;
  cardForm: ICardForm;
  validationErrors: ICardFormValidation;
  isLoading: boolean;
  isProcessingPayment: boolean;
  billingKeyInfo?: INicePayCardBillingKeyInfo;
  error?: string;
}

// 나이스페이먼츠 결제 옵션 인터페이스 (카드용)
export interface INicePayCardPaymentOptions {
  taxFreeAmount?: number; // 면세금액 (복합과세 계약시)
  productType?: 'PHYSICAL' | 'DIGITAL'; // 휴대폰 소액결제용
  installmentMonth?: number; // 카드 할부 개월수
  bypass?: Record<string, any>; // 나이스페이먼츠 특화 옵션
}

// 나이스페이먼츠 결제 요청 인터페이스 (확장)
export interface INicePaymentsPaymentRequest extends IPortOnePaymentRequest {
  taxFreeAmount?: number;
  productType?: 'PHYSICAL' | 'DIGITAL';
  virtualAccount?: {
    accountExpiry: string;
  };
  card?: {
    installment?: {
      monthOption?: {
        fixedMonth: number;
      };
    };
  };
  giftCertificate?: {
    certificateType: 'CULTURELAND';
  };
  bypass?: {
    nice_v2?: {
      MallUserID?: string;
    };
  };
}

// 나이스페이먼츠 카드 옵션 인터페이스
export interface INicePaymentsCardOptions {
  installment?: {
    monthOption?: {
      fixedMonth: number;
    };
  };
} 