# 🎯 나이스페이먼츠 V2 카드 직접 입력 빌링 결제 설정 가이드

## 개요

이 프로젝트에서는 포트원(PortOne) V2를 통해 **카드 정보를 직접 입력받아** 나이스페이먼츠 빌링키 발급 및 정기결제를 구현했습니다.

### 주요 특징

- **카드 직접 입력**: 카드번호, 유효기간, CVV, 생년월일 등을 직접 입력받아 빌링키 발급
- **안전한 카드 처리**: 포트원 보안 서버를 통한 카드 정보 처리 (당사 서버에 저장되지 않음)
- **자동 정기결제**: 발급된 빌링키로 안전한 정기결제 처리
- **사용자 친화적 UI**: 신용카드 모양의 시각화와 단계별 안내
- **실시간 검증**: 카드 정보 실시간 포맷팅 및 검증

### ⚠️ **중요: 간편결제 빌링키 제한사항**

**포트원 문서 확인 결과, 나이스페이먼츠에서 간편결제(카카오페이/네이버페이) 빌링키 기능이 제한적**이므로 **카드 정보를 직접 입력받는 방식**으로 구현했습니다.

## 환경 변수 설정

### 필수 환경 변수

```bash
# 포트원 기본 설정
PORTONE_STORE_ID=your_store_id
PORTONE_API_SECRET=your_api_secret

# 나이스페이먼츠 채널 키 (V2 신모듈)
PORTONE_CHANNEL_KEY=channel-key-9987cb87-6458-4888-b94e-68d9a2da896d

# 데이터베이스 (기존 설정 유지)
DATABASE_URL=your_database_url

# Clerk 인증 (기존 설정 유지)
CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
```

### 포트원 설정 방법

1. **포트원 콘솔 접속**: https://admin.portone.io
2. **상점 생성** 또는 기존 상점 선택
3. **연동 정보**에서 나이스페이먼츠(신모듈) 추가
4. **API 키 관리**에서 Store ID와 API Secret 확인

### ⚠️ **중요: 나이스페이먼츠 채널 설정**

**카드 빌링키 발급을 위한 필수 설정:**

1. **포트원 콘솔 → 연동 정보** 이동
2. **나이스페이먼츠 V2 (신모듈)** 선택
3. **카드 결제 활성화** ✅
4. **빌링키 발급 허용** ✅
5. **테스트 환경 설정** ✅
   - 개발 중이라면 "테스트 모드" 활성화
   - 상용 환경이라면 "실 결제 모드" 설정

### 🔧 **채널 설정 예시**

```json
{
  "채널명": "나이스페이먼츠 V2",
  "채널타입": "NICEPAY",
  "버전": "V2",
  "지원결제수단": [
    "CARD"
  ],
  "빌링키발급": true,
  "테스트모드": true
}
```

## 데이터베이스 마이그레이션

### 새로운 테이블 추가

```sql
-- 카드 빌링키 관리 테이블
CREATE TABLE card_billing_keys (
  id VARCHAR(256) PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  issue_id TEXT NOT NULL,
  billing_key TEXT NOT NULL,
  card_company TEXT NOT NULL,
  masked_card_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired')),
  issued_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 인덱스 추가
CREATE INDEX idx_card_billing_keys_user_id ON card_billing_keys(user_id);
CREATE INDEX idx_card_billing_keys_billing_key ON card_billing_keys(billing_key);
CREATE INDEX idx_card_billing_keys_status ON card_billing_keys(status);
```

### Drizzle 마이그레이션 실행

```bash
# 스키마 변경 후 마이그레이션 생성
npm run db:generate

# 마이그레이션 적용
npm run db:migrate
```

## 구현된 컴포넌트

### 1. CardBillingPayment 컴포넌트

**위치**: `app/components/freemium/CardBillingPayment.tsx`

**기능**:
- 카드 정보 직접 입력 (카드번호, 유효기간, 소유자명, 생년월일, 비밀번호 앞 2자리)
- 실시간 카드 번호 포맷팅 (4자리씩 공백 구분)
- 카드사 자동 감지 및 표시
- 신용카드 모양의 시각화 UI
- 포트원 V2 API를 통한 빌링키 발급
- 발급된 빌링키로 즉시 첫 결제 처리
- 단계별 진행 상황 표시
- **높은 z-index (`z-[100]`)로 다른 모달 위에 표시**

**사용법**:
```tsx
<CardBillingPayment
  isOpen={showModal}
  onClose={handleClose}
  onPaymentSuccess={handleSuccess}
/>
```

### 🔧 **주요 기능 상세**

#### 카드 정보 검증
```typescript
// 카드번호 검증 (15-16자리)
const cardNumber = form.cardNumber.replace(/\s/g, '');
if (!cardNumber || cardNumber.length < 15 || cardNumber.length > 16) {
  errors.cardNumber = '올바른 카드번호를 입력해주세요.';
}

// 생년월일/사업자번호 검증 (6자리 또는 10자리)
if (!/^(\d{6}|\d{10})$/.test(form.birthOrBusinessNumber)) {
  errors.birthOrBusinessNumber = '생년월일 6자리 또는 사업자번호 10자리를 입력해주세요.';
}
```

#### Customer ID 길이 제한 해결
나이스페이먼츠는 `customer.customerId`가 **20자 이하**여야 합니다.
```typescript
// Clerk userId를 MD5 해시하여 16자로 단축
async function generateCustomerId(userId: string): Promise<string> {
  const crypto = await import('crypto');
  return crypto.createHash('md5').update(userId).digest('hex').substring(0, 16);
}
```

#### 카드 시각화
- 실시간 카드 정보 반영
- 카드사 자동 감지 표시
- 그라데이션 배경으로 신용카드 모양 구현

### 2. 수정된 PremiumUpgradeModal

**위치**: `app/components/freemium/PremiumUpgradeModal.tsx`

**변경사항**:
- 기존 간편결제에서 카드 직접 입력 방식으로 변경
- CardBillingPayment 컴포넌트 통합
- 카드 정기결제 안내 UI 추가

## API 엔드포인트

### 1. 카드 빌링키 발급 요청

**URL**: `POST /api/payment/card-billing-key`

**Request Body**:
```json
{
  "cardForm": {
    "cardNumber": "1234 5678 9012 3456",
    "expiryMonth": "12",
    "expiryYear": "25",
    "cardholderName": "홍길동",
    "birthOrBusinessNumber": "940815",
    "passwordTwoDigits": "12"
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "billingKey": "billing_key_xyz",
    "issueId": "billing_1234567890_abcd",
    "cardCompany": "SHINHAN",
    "maskedCardNumber": "**** **** **** 3456",
    "issuedAt": "2024-01-15T10:30:00Z"
  }
}
```

### 2. 카드 정기결제 처리

**URL**: `POST /api/payment/card-recurring`

**Request Body**:
```json
{
  "billingKey": "billing_key_xyz",
  "planId": "premium_monthly"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "paymentId": "payment_1234567890_xyz",
    "txId": "nice_tx_id_123",
    "amount": 9900,
    "status": "PAID",
    "paidAt": "2024-01-15T10:35:00Z",
    "plan": {
      "id": "premium_monthly",
      "name": "프리미엄 월간 구독",
      "amount": 9900
    }
  }
}
```

## 보안 고려사항

### 카드 정보 보안

1. **카드 정보 비저장**: 당사 서버에는 카드 정보를 저장하지 않음
2. **포트원 보안**: 모든 카드 정보는 포트원 보안 서버에서 처리
3. **마스킹 처리**: 카드번호는 마스킹되어 저장 (`**** **** **** 1234`)
4. **HTTPS 필수**: 모든 카드 정보 전송은 HTTPS로만 처리

### PCI DSS 준수

- 포트원이 PCI DSS Level 1 인증을 보유하여 카드 정보 보안 표준 준수
- 당사는 카드 정보를 직접 처리하지 않아 PCI DSS 범위 최소화

## 테스트 시나리오

### 카드 빌링키 발급 테스트

1. **테스트 카드 정보**:
   ```
   카드번호: 4000-0000-0000-0002
   유효기간: 12/25
   소유자명: 홍길동
   생년월일: 940815
   비밀번호: 12
   ```

2. **테스트 절차**:
   - PremiumUpgradeModal에서 "정기결제 등록하기" 클릭
   - 카드 정보 입력
   - 빌링키 발급 확인
   - 첫 결제 처리 확인

### 정기결제 테스트

1. 발급된 빌링키로 월간 구독 결제
2. 결제 성공 시 사용자 멤버십 업그레이드 확인
3. 질문 한도 증가 확인

## 문제 해결

### 카드 정보 검증 실패

**원인**: 잘못된 카드 정보 형식
**해결**: 
- 카드번호: 15-16자리 숫자만
- 유효기간: MM/YY 형식
- 생년월일: 6자리 숫자 (YYMMDD)
- 사업자번호: 10자리 숫자

### 빌링키 발급 실패

**원인**: 포트원 채널 설정 오류
**해결**:
1. 포트원 콘솔에서 나이스페이먼츠 V2 채널 확인
2. 카드 결제 및 빌링키 발급 권한 활성화
3. 테스트 모드 설정 확인

### 정기결제 실패

**원인**: 빌링키 만료 또는 카드 문제
**해결**:
1. 빌링키 상태 확인
2. 카드 유효성 재검증
3. 새로운 빌링키 발급

## 지원 연락처

- 포트원 고객지원: https://portone.io/support
- 나이스페이먼츠 연동문의: 1588-3355
- 기술 문의: 개발팀 담당자 