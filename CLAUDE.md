# T-020: Freemium 모델 설계 및 도입 - 코드베이스 분석 및 구현 계획

## 📊 코드베이스 분석 결과

### ✅ 기존 구조 (이미 완료된 것들)

#### 1. 인증 시스템 (완벽하게 구축됨)
- **Clerk 기반 인증 시스템**
- **게스트 모드 지원**: 로그인하지 않고도 `/chat`에서 대화 가능
- **소셜 로그인**: SignInButton 구현 완료
- **듀얼 모드 UI**: 인증 상태에 따라 다른 UI/로직 제공

#### 2. 데이터베이스 스키마 (Freemium 준비 완료)
```typescript
// app/db/schema.ts - 이미 구현되어 있음
export const userProfiles = pgTable("user_profiles", {
  id: text("id").primaryKey(),
  membershipTier: text("membership_tier", { 
    enum: ["basic", "premium", "expert"] 
  }).default("basic").notNull(),
  // ... 기타 필드들
});

// types/index.ts - 이미 정의되어 있음
export type MembershipTier = 'basic' | 'premium' | 'expert';
export const TIER_PERMISSIONS: Record<MembershipTier, ITierPermissions> = {
  basic: { allowedRefTypes: ['youtube'] },
  premium: { allowedRefTypes: ['youtube', 'paper'] },
  expert: { allowedRefTypes: ['book', 'youtube', 'paper'] }
};
```

#### 3. AI API 구조 (등급별 처리 이미 구현됨)
```typescript
// app/routes/api.gemini.ts - 이미 구현되어 있음
async function getUserMembershipTier(userId: string): Promise<MembershipTier>
// 사용자 등급을 확인하고 권한별로 RAG 검색 필터링하는 로직 완료
// 비용 계산 로직도 이미 구현 완료
```

#### 4. 게스트 모드 (이미 구현됨)
```typescript
// app/routes/chat.tsx - 이미 구현되어 있음
// 게스트는 handleGuestSendMessage로 대화
// 로그인한 사용자는 서버 액션으로 대화 기록 저장
// LoginBanner 컴포넌트도 이미 존재
```

---

## 🎯 Freemium 정책 요구사항

### 로그인 사용자 제한
- **하루**: 무료 질문 3회 제한
- **주간**: 무료 질문 10회 제한  
- **월간**: 무료 질문 30회 제한
- **구독**: 월 4,900원으로 무제한

### 게스트 사용자 제한
- **세션당**: 질문 1회 제한

---

## 🛠️ 구현 계획

### Phase 1: 질문 횟수 추적 시스템
1. **DB 스키마 확장**
   ```sql
   -- userProfiles 테이블에 추가할 필드들
   dailyQuestionCount: integer default 0
   weeklyQuestionCount: integer default 0  
   monthlyQuestionCount: integer default 0
   lastQuestionDate: timestamp
   lastWeekReset: timestamp
   lastMonthReset: timestamp
   subscriptionStatus: text default 'free' -- 'free', 'premium'
   subscriptionExpiresAt: timestamp
   ```

2. **질문 횟수 관리 API**
   - `checkQuestionLimit(userId): boolean` - 질문 가능 여부 확인
   - `incrementQuestionCount(userId)` - 질문 횟수 증가
   - `resetCounters()` - 일/주/월 카운터 리셋 로직

### ✅ Phase 2: Mock API 시스템 (완료)
1. **환경 변수 설정**
   ```env
   FREEMIUM_MOCK_MODE=true|false
   ```

2. **Mock 응답 시스템**
   ```typescript
   // Mock 모드일 때 실제 AI API 호출 대신 사전 정의된 응답 반환
   const MOCK_RESPONSES = [
     {
       answer: "임신 초기에는 엽산 섭취가 중요해요...",
       sources: [{ reference: "임신 중 영양 관리 가이드", refType: "youtube", ... }]
     },
     // ... 5개의 카테고리별 Mock 응답
   ];
   ```

### Phase 3: 프론트엔드 제한 UI
1. **useFreemiumPolicy 훅**
   ```typescript
   const useFreemiumPolicy = () => {
     const [remainingQuestions, setRemainingQuestions] = useState(0);
     const [isLimitReached, setIsLimitReached] = useState(false);
     // 질문 제한 로직 관리
   };
   ```

2. **질문 제한 UI 컴포넌트**
   - 남은 질문 횟수 표시
   - 제한 도달 시 결제 유도 모달
   - 게스트 세션 1회 제한 UI

### Phase 4: 결제 시스템 연동
1. **결제 API 설계**
   - 구독 시작/해지 API
   - 결제 상태 확인 API
   - 웹훅 처리 로직

2. **결제 UI 컴포넌트**
   - 결제 정보 입력 폼
   - 구독 관리 페이지

---

## 🔄 작업 우선순위

### ✅ 1순위: Mock API 시스템 (T-020-002) - 완료
- 개발/테스트 환경에서 비용 절약
- 정책 테스트를 위한 기반

### 2순위: 질문 제한 UI (T-020-003)  
- 사용자 경험 구현
- 정책 로직 테스트

### 3순위: 백엔드 정책 구현 (T-020-004)
- DB 스키마 확장
- 질문 횟수 추적 로직
- 결제 시스템 연동

---

## ✅ T-020-002: Mock API 시스템 구현 완료

### 구현된 기능
1. **환경 변수 제어**
   - `FREEMIUM_MOCK_MODE=true` → Mock 응답 사용
   - `FREEMIUM_MOCK_MODE=false` → 실제 AI API 호출

2. **키워드 기반 Mock 응답**
   - 엽산/영양 → 영양 관리 관련 응답
   - 입덧/메스꺼움 → 입덧 완화 관련 응답  
   - 운동/활동 → 임신 중 운동 관련 응답
   - 태동/움직임 → 태동 관련 응답
   - 아빠/남편 → 예비아빠 가이드 응답
   - 기타 → 랜덤 응답

3. **실제 API 모방**
   - 1-2초 응답 지연 시뮬레이션
   - 실제 응답과 동일한 JSON 구조
   - 출처 정보 포함 (YouTube 링크, 타임스탬프 등)

### QA 테스트 결과 ✅
```bash
# 테스트 1: 엽산 관련 질문
curl -X POST localhost:5173/api/gemini \
  -H "Content-Type: application/json" \
  -d '{"message": "임신 중 엽산은 왜 중요한가요?"}'
# 결과: ✅ 영양 관리 관련 Mock 응답 정상 반환

# 테스트 2: 입덧 관련 질문  
curl -X POST localhost:5173/api/gemini \
  -H "Content-Type: application/json" \
  -d '{"message": "입덧이 너무 심해요"}'
# 결과: ✅ 입덧 완화 관련 Mock 응답 정상 반환

# 테스트 3: 예비아빠 관련 질문
curl -X POST localhost:5173/api/gemini \
  -H "Content-Type: application/json" \
  -d '{"message": "아빠로서 무엇을 도와드릴 수 있을까요?"}'
# 결과: ✅ 예비아빠 가이드 Mock 응답 정상 반환
```

### 검증 체크리스트 ✅
- [x] 정책 변수로 실/Mock API 전환 동작 확인
- [x] Mock API에서 임시 답변 정상 노출
- [x] 실 API 호출 차단 검증 (Mock 모드에서 Gemini API 호출 없음)
- [x] QA 테스트 케이스 문서화 및 통과

---

## 🎉 결론

**현재 코드베이스는 Freemium 모델을 위한 기반이 85% 이상 완성되어 있습니다!**

- 인증 시스템: ✅ 완료
- 등급별 권한 시스템: ✅ 완료  
- 게스트 모드: ✅ 완료
- AI API 구조: ✅ 완료
- **Mock API 시스템: ✅ 완료**

**다음 단계: T-020-003 프론트엔드 질문 제한 UI 구현**

<vooster-docs>
- @vooster-docs/prd.md
</vooster-docs>