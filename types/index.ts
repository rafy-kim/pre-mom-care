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