# 🔐 Remix + 포트원 V2 완전 연동 CursorRule

## 📋 개요
이 규칙은 Remix 프레임워크에서 포트원(PortOne) V2 결제 시스템을 안전하고 효율적으로 연동하기 위한 **완전한 종합 가이드**입니다. 

**포함 범위**: 일반 인증결제, 빌링키 결제, 예약/반복결제, 웹훅 처리, 리다이렉트 방식 등 모든 결제 시나리오

**모든 단계를 정확히 따르고, 보안 검증을 필수로 수행해야 합니다.**

---

## 🎯 핵심 원칙

### ✅ MUST DO (필수 사항)
1. **서버 측 결제 검증 필수**: 모든 결제는 서버에서 재검증
2. **타입 안정성 확보**: TypeScript 인터페이스 정의 필수
3. **에러 처리 완비**: 모든 결제 단계에서 에러 핸들링
4. **보안 정보 보호**: API 키, Secret은 환경변수로 관리
5. **웹훅 검증**: 수신한 웹훅의 무결성 검증 필수

### ❌ NEVER DO (금지 사항)
1. 클라이언트 측 결제 정보만으로 결제 완료 처리
2. 하드코딩된 API 키나 Secret 사용
3. 검증되지 않은 웹훅 데이터 신뢰
4. paymentId 중복 사용
5. 결제 금액 검증 생략

---

## 📦 1단계: 패키지 설치 및 환경 설정

### 1.1 패키지 설치
```bash
# 브라우저 SDK (클라이언트용)
npm install @portone/browser-sdk

# 서버 SDK (서버용)
npm install @portone/server-sdk

# 추가 유틸리티 (필요 시)
npm install crypto uuid
```

### 1.2 환경변수 설정 (.env)
```env
# 포트원 V2 API 정보
PORTONE_STORE_ID=store-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
PORTONE_CHANNEL_KEY=channel-key-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
PORTONE_API_SECRET=your-portone-v2-api-secret

# 웹훅 검증용 시크릿
PORTONE_WEBHOOK_SECRET=your-webhook-secret
```

---

## 🏗️ 2단계: TypeScript 인터페이스 정의

### 2.1 결제 관련 인터페이스 (types/index.ts)
```typescript
// types/index.ts에 추가
export interface IPaymentRequest {
  storeId: string;
  channelKey: string;
  paymentId: string;
  orderName: string;
  totalAmount: number;
  currency: string;
  payMethod: 'CARD' | 'VIRTUAL_ACCOUNT' | 'TRANSFER' | 'MOBILE';
  customer?: ICustomer;
  customData?: Record<string, any>;
  redirectUrl?: string;
  noticeUrls?: string[];
}

export interface ICustomer {
  customerId?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  email?: string;
  address?: IAddress;
}

export interface IAddress {
  country?: string;
  addressLine1: string;
  addressLine2: string;
  city?: string;
  province?: string;
}

export interface IPaymentResult {
  code?: string;
  message?: string;
  paymentId?: string;
  txId?: string;
}

export interface IPaymentVerification {
  status: 'PAID' | 'FAILED' | 'CANCELLED' | 'PARTIAL_CANCELLED';
  paymentId: string;
  orderName: string;
  amount: number;
  currency: string;
  customer?: ICustomer;
  customData?: Record<string, any>;
}

export interface IProductInfo {
  id: string;
  name: string;
  price: number;
  currency: string;
  description?: string;
}

// 빌링키 관련 인터페이스
export interface IBillingKeyRequest {
  storeId: string;
  channelKey: string;
  billingKeyMethod: 'CARD' | 'MOBILE' | 'EASY_PAY';
  issueId?: string; // 나이스페이먼츠 필수
  issueName?: string; // 나이스페이먼츠 필수
  customer?: ICustomer;
  customData?: Record<string, any>;
  redirectUrl?: string;
  noticeUrls?: string[];
  easyPay?: IEasyPayOptions;
}

export interface IBillingKeyResult {
  code?: string;
  message?: string;
  billingKey?: string;
  pgCode?: string;
  pgMessage?: string;
}

export interface IBillingKeyPaymentRequest {
  billingKey: string;
  paymentId: string;
  orderName: string;
  amount: {
    total: number;
  };
  currency: string;
  customer?: ICustomer;
  customData?: Record<string, any>;
}

export interface ICardCredential {
  number: string;
  expiryYear: string;
  expiryMonth: string;
  birthOrBusinessRegistrationNumber: string;
  passwordTwoDigits: string;
}

export interface ISchedulePaymentRequest {
  payment: IBillingKeyPaymentRequest;
  timeToPay: string; // ISO 8601 format
}

// Redirect 방식 관련 인터페이스
export interface IRedirectParams {
  paymentId?: string;
  code?: string;
  message?: string;
  pgCode?: string;
  pgMessage?: string;
}

// 나이스페이먼츠 특화 인터페이스
export interface IEasyPayOptions {
  easyPayProvider?: 'KAKAOPAY' | 'NAVERPAY' | 'SSGPAY' | 'PAYCO' | 'TOSS';
  availablePayMethods?: ('CARD' | 'TRANSFER' | 'CHARGE')[];
  cashReceiptType?: 'PERSONAL' | 'CORPORATE' | 'NO_RECEIPT';
  customerIdentifier?: string;
}

export interface INicePaymentsPaymentRequest extends IPaymentRequest {
  taxFreeAmount?: number; // 나이스페이먼츠 면세금액
  productType?: 'PHYSICAL' | 'DIGITAL'; // 휴대폰 결제시 필수
  giftCertificate?: {
    certificateType: 'CULTURELAND'; // 나이스페이먼츠는 컬쳐랜드만 지원
  };
  bypass?: {
    nice_v2?: {
      MallUserID?: string; // 상품권 결제시 필수
      DirectShowOpt?: string; // 계좌이체 다이렉트 호출용
    };
  };
}

export interface INicePaymentsCardOptions {
  installment?: {
    monthOption?: {
      fixedMonth?: number; // 나이스페이먼츠 다이렉트 호출시 필수
    };
  };
  useFreeInterestFromMerchant?: boolean;
  useCardPoint?: boolean;
}

// KG이니시스 특화 인터페이스
export interface IInicisPaymentRequest extends IPaymentRequest {
  bypass?: {
    inicis_v2?: {
      // PC용 파라미터
      logo_url?: string; // 메인 로고 URL (89x18 권장)
      logo_2nd?: string; // 서브 로고 URL (64x13 권장)
      parentemail?: string; // 14세 미만 보호자 이메일
      Ini_SSGPAY_MDN?: string; // SSGPAY PUSH 전송 휴대폰번호
      acceptmethod?: string[]; // 추가 옵션 배열
      
      // 모바일용 파라미터  
      P_CARD_OPTION?: string; // 신용카드 우선선택 (ex: "selcode=14")
      P_MNAME?: string; // 가맹점 이름
      P_RESERVED?: string[]; // 모바일 추가 옵션
    };
  };
}

export interface IInicisBillingKeyRequest extends IBillingKeyRequest {
  issueId: string; // KG이니시스 필수
  issueName: string; // KG이니시스 필수
  offerPeriod?: {
    validHours?: number;
    dueDate?: string;
  }; // 모바일 빌링키 발급시 필수
  bypass?: {
    inicis_v2?: {
      carduse?: 'percard' | 'cocard'; // 개인/법인카드 선택 (모바일만)
    };
  };
}

export interface IInicisVirtualAccountOptions {
  bank: 'KOOKMIN' | 'SHINHAN' | 'WOORI' | 'HANA' | 'NONGHYUP' | 'IBK';
  accountExpiry: {
    dueDate: string; // YYYY-MM-DD HH:mm:ss 형식
  };
  accountType: 'FIXED'; // KG이니시스는 고정식만 지원
  fixedAccountNumber?: string; // 미리 전달받은 계좌번호
  cashReceipt?: {
    type: 'PERSONAL' | 'CORPORATE';
    customerIdentityNumber: string;
  };
}
```

---

## 🎨 3단계: 클라이언트 측 구현

### 3.1 일반 결제 컴포넌트 (app/components/payment/PaymentForm.tsx)
```typescript
import { Form, useActionData, useNavigation } from '@remix-run/react';
import PortOne from '@portone/browser-sdk/v2';
import { useState, useEffect } from 'react';
import type { IPaymentRequest, IPaymentResult, IProductInfo } from '~/types';

interface IPaymentFormProps {
  product: IProductInfo;
  storeId: string;
  channelKey: string;
}

export function PaymentForm({ product, storeId, channelKey }: IPaymentFormProps) {
  const [paymentStatus, setPaymentStatus] = useState<'IDLE' | 'PENDING' | 'SUCCESS' | 'FAILED'>('IDLE');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const navigation = useNavigation();
  const actionData = useActionData<{ success: boolean; message?: string }>();

  const generatePaymentId = (): string => {
    return `payment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (paymentStatus === 'PENDING') return;
    
    setPaymentStatus('PENDING');
    setErrorMessage('');

    try {
      const paymentId = generatePaymentId();
      
      const paymentRequest: IPaymentRequest = {
        storeId,
        channelKey,
        paymentId,
        orderName: product.name,
        totalAmount: product.price,
        currency: product.currency,
        payMethod: 'CARD',
        customData: {
          productId: product.id,
          productName: product.name,
          productPrice: product.price,
        },
        customer: {
          // 필요시 고객 정보 추가
        },
      };

      // 포트원 결제창 호출
      const paymentResult: IPaymentResult = await PortOne.requestPayment(paymentRequest);

      // 결제창에서 오류 발생 시
      if (paymentResult.code) {
        throw new Error(paymentResult.message || '결제 중 오류가 발생했습니다.');
      }

      // 서버로 결제 검증 요청
      const verificationResponse = await fetch('/api/payment/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentId: paymentResult.paymentId,
          expectedAmount: product.price,
          expectedProductId: product.id,
        }),
      });

      const verificationResult = await verificationResponse.json();

      if (verificationResult.success) {
        setPaymentStatus('SUCCESS');
        // 성공 페이지로 리다이렉트 또는 성공 처리
      } else {
        throw new Error(verificationResult.message || '결제 검증에 실패했습니다.');
      }

    } catch (error) {
      console.error('Payment Error:', error);
      setPaymentStatus('FAILED');
      setErrorMessage(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
    }
  };

  const resetPayment = () => {
    setPaymentStatus('IDLE');
    setErrorMessage('');
  };

  return (
    <div className="payment-form">
      {/* 상품 정보 표시 */}
      <div className="product-info">
        <h3>{product.name}</h3>
        <p className="price">{product.price.toLocaleString()}원</p>
      </div>

      {/* 결제 버튼 */}
      <button
        onClick={handlePayment}
        disabled={paymentStatus === 'PENDING'}
        className={`payment-button ${paymentStatus === 'PENDING' ? 'loading' : ''}`}
      >
        {paymentStatus === 'PENDING' ? '결제 진행 중...' : '결제하기'}
      </button>

      {/* 에러 메시지 */}
      {paymentStatus === 'FAILED' && (
        <div className="error-message">
          <p>{errorMessage}</p>
          <button onClick={resetPayment}>다시 시도</button>
        </div>
      )}

      {/* 성공 메시지 */}
      {paymentStatus === 'SUCCESS' && (
        <div className="success-message">
          <p>결제가 성공적으로 완료되었습니다!</p>
        </div>
      )}
    </div>
  );
}
```

### 3.2 리다이렉트 방식 결제 처리 (app/components/payment/PaymentRedirectHandler.tsx)
```typescript
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from '@remix-run/react';
import type { IRedirectParams } from '~/types';

interface IPaymentRedirectHandlerProps {
  onPaymentResult: (result: { success: boolean; paymentId?: string; error?: string }) => void;
}

export function PaymentRedirectHandler({ onPaymentResult }: IPaymentRedirectHandlerProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const processRedirectResult = async () => {
      // URL 쿼리 파라미터에서 결제 결과 추출
      const redirectParams: IRedirectParams = {
        paymentId: searchParams.get('paymentId') || undefined,
        code: searchParams.get('code') || undefined,
        message: searchParams.get('message') || undefined,
        pgCode: searchParams.get('pgCode') || undefined,
        pgMessage: searchParams.get('pgMessage') || undefined,
      };

      // 에러가 있는 경우
      if (redirectParams.code) {
        setIsProcessing(false);
        onPaymentResult({
          success: false,
          error: redirectParams.message || '결제 중 오류가 발생했습니다.',
        });
        return;
      }

      // 결제 ID가 없는 경우
      if (!redirectParams.paymentId) {
        setIsProcessing(false);
        onPaymentResult({
          success: false,
          error: '결제 정보를 찾을 수 없습니다.',
        });
        return;
      }

      try {
        // 서버로 결제 검증 요청
        const verificationResponse = await fetch('/api/payment/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            paymentId: redirectParams.paymentId,
          }),
        });

        const verificationResult = await verificationResponse.json();

        setIsProcessing(false);
        
        if (verificationResult.success) {
          onPaymentResult({
            success: true,
            paymentId: redirectParams.paymentId,
          });
        } else {
          onPaymentResult({
            success: false,
            error: verificationResult.message || '결제 검증에 실패했습니다.',
          });
        }

      } catch (error) {
        console.error('Payment verification error:', error);
        setIsProcessing(false);
        onPaymentResult({
          success: false,
          error: '결제 검증 중 오류가 발생했습니다.',
        });
      }
    };

    processRedirectResult();
  }, [searchParams, onPaymentResult]);

  if (isProcessing) {
    return (
      <div className="payment-redirect-processing">
        <div className="loading-spinner" />
        <p>결제 결과를 확인하고 있습니다...</p>
      </div>
    );
  }

  return null;
}
```

### 3.3 빌링키 발급 컴포넌트 (app/components/payment/BillingKeyForm.tsx)
```typescript
import { useState } from 'react';
import { Form } from '@remix-run/react';
import PortOne from '@portone/browser-sdk/v2';
import type { IBillingKeyRequest, IBillingKeyResult, ICardCredential } from '~/types';

interface IBillingKeyFormProps {
  storeId: string;
  channelKey: string;
  customerId: string;
  issueMethod: 'SDK' | 'API'; // SDK 방식 vs API 방식
  onBillingKeyIssued: (billingKey: string) => void;
  onError: (error: string) => void;
}

export function BillingKeyForm({
  storeId,
  channelKey,
  customerId,
  issueMethod,
  onBillingKeyIssued,
  onError,
}: IBillingKeyFormProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardInfo, setCardInfo] = useState<ICardCredential>({
    number: '',
    expiryYear: '',
    expiryMonth: '',
    birthOrBusinessRegistrationNumber: '',
    passwordTwoDigits: '',
  });

  // SDK 방식으로 빌링키 발급
  const handleSDKBillingKeyIssue = async () => {
    setIsProcessing(true);

    try {
      const billingKeyRequest: IBillingKeyRequest = {
        storeId,
        channelKey,
        billingKeyMethod: 'CARD',
        customer: {
          customerId,
        },
      };

      const issueResult: IBillingKeyResult = await PortOne.requestIssueBillingKey(billingKeyRequest);

      if (issueResult.code) {
        throw new Error(issueResult.message || '빌링키 발급 중 오류가 발생했습니다.');
      }

      if (issueResult.billingKey) {
        onBillingKeyIssued(issueResult.billingKey);
      } else {
        throw new Error('빌링키가 발급되지 않았습니다.');
      }

    } catch (error) {
      console.error('Billing key issue error:', error);
      onError(error instanceof Error ? error.message : '빌링키 발급에 실패했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  // API 방식으로 빌링키 발급
  const handleAPIBillingKeyIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 카드 정보 유효성 검사
    if (!cardInfo.number || !cardInfo.expiryYear || !cardInfo.expiryMonth || 
        !cardInfo.birthOrBusinessRegistrationNumber || !cardInfo.passwordTwoDigits) {
      onError('모든 카드 정보를 입력해주세요.');
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch('/api/billing-key/issue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId,
          cardInfo,
        }),
      });

      const result = await response.json();

      if (result.success && result.billingKey) {
        onBillingKeyIssued(result.billingKey);
      } else {
        throw new Error(result.message || '빌링키 발급에 실패했습니다.');
      }

    } catch (error) {
      console.error('Billing key issue error:', error);
      onError(error instanceof Error ? error.message : '빌링키 발급에 실패했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="billing-key-form">
      <h3>빌링키 발급</h3>
      
      {issueMethod === 'SDK' ? (
        // SDK 방식: 간단한 버튼만 제공
        <div className="sdk-billing-key">
          <p>안전한 PG사 결제창을 통해 빌링키를 발급받습니다.</p>
          <button
            onClick={handleSDKBillingKeyIssue}
            disabled={isProcessing}
            className="billing-key-button"
          >
            {isProcessing ? '빌링키 발급 중...' : '빌링키 발급하기'}
          </button>
        </div>
      ) : (
        // API 방식: 카드 정보 입력 폼 제공
        <Form onSubmit={handleAPIBillingKeyIssue} className="api-billing-key">
          <div className="card-info-warning">
            ⚠️ 카드 정보는 안전하게 처리되며 저장되지 않습니다.
          </div>
          
          <div className="form-group">
            <label htmlFor="cardNumber">카드번호</label>
            <input
              id="cardNumber"
              type="text"
              value={cardInfo.number}
              onChange={(e) => setCardInfo(prev => ({ ...prev, number: e.target.value }))}
              placeholder="1234-5678-9012-3456"
              maxLength={19}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="expiryMonth">만료월</label>
              <input
                id="expiryMonth"
                type="text"
                value={cardInfo.expiryMonth}
                onChange={(e) => setCardInfo(prev => ({ ...prev, expiryMonth: e.target.value }))}
                placeholder="MM"
                maxLength={2}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="expiryYear">만료년</label>
              <input
                id="expiryYear"
                type="text"
                value={cardInfo.expiryYear}
                onChange={(e) => setCardInfo(prev => ({ ...prev, expiryYear: e.target.value }))}
                placeholder="YY"
                maxLength={2}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="birthOrBusiness">생년월일/사업자번호</label>
            <input
              id="birthOrBusiness"
              type="text"
              value={cardInfo.birthOrBusinessRegistrationNumber}
              onChange={(e) => setCardInfo(prev => ({ 
                ...prev, 
                birthOrBusinessRegistrationNumber: e.target.value 
              }))}
              placeholder="YYMMDD 또는 사업자번호"
              maxLength={10}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="passwordTwoDigits">비밀번호 앞 2자리</label>
            <input
              id="passwordTwoDigits"
              type="password"
              value={cardInfo.passwordTwoDigits}
              onChange={(e) => setCardInfo(prev => ({ ...prev, passwordTwoDigits: e.target.value }))}
              placeholder="**"
              maxLength={2}
              required
            />
          </div>

          <button
            type="submit"
            disabled={isProcessing}
            className="billing-key-button"
          >
            {isProcessing ? '빌링키 발급 중...' : '빌링키 발급하기'}
          </button>
        </Form>
      )}
    </div>
  );
}
```

### 3.4 빌링키 결제 컴포넌트 (app/components/payment/BillingKeyPayment.tsx)
```typescript
import { useState } from 'react';
import type { IBillingKeyPaymentRequest } from '~/types';

interface IBillingKeyPaymentProps {
  billingKey: string;
  customerId: string;
  onPaymentComplete: (paymentId: string) => void;
  onError: (error: string) => void;
}

export function BillingKeyPayment({
  billingKey,
  customerId,
  onPaymentComplete,
  onError,
}: IBillingKeyPaymentProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [amount, setAmount] = useState<number>(0);
  const [orderName, setOrderName] = useState<string>('');

  const handleBillingKeyPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || amount <= 0) {
      onError('올바른 결제 금액을 입력해주세요.');
      return;
    }

    if (!orderName.trim()) {
      onError('주문명을 입력해주세요.');
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch('/api/billing-key/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          billingKey,
          amount,
          orderName: orderName.trim(),
          customerId,
        }),
      });

      const result = await response.json();

      if (result.success && result.paymentId) {
        onPaymentComplete(result.paymentId);
      } else {
        throw new Error(result.message || '결제에 실패했습니다.');
      }

    } catch (error) {
      console.error('Billing key payment error:', error);
      onError(error instanceof Error ? error.message : '결제 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="billing-key-payment">
      <h3>빌링키 결제</h3>
      
      <form onSubmit={handleBillingKeyPayment}>
        <div className="form-group">
          <label htmlFor="orderName">주문명</label>
          <input
            id="orderName"
            type="text"
            value={orderName}
            onChange={(e) => setOrderName(e.target.value)}
            placeholder="주문명을 입력해주세요"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="amount">결제 금액</label>
          <input
            id="amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            placeholder="결제할 금액을 입력해주세요"
            min="1"
            required
          />
        </div>

        <div className="billing-key-info">
          <p><strong>빌링키:</strong> {billingKey}</p>
          <p><strong>고객 ID:</strong> {customerId}</p>
        </div>

        <button
          type="submit"
          disabled={isProcessing}
          className="payment-button"
        >
          {isProcessing ? '결제 진행 중...' : '결제하기'}
        </button>
      </form>
    </div>
  );
}
```

---

## 🔧 4단계: 서버 측 구현

### 4.1 결제 검증 API (app/routes/api.payment.verify.ts)
```typescript
import { json, type ActionFunctionArgs } from '@remix-run/node';
import * as PortOne from '@portone/server-sdk';
import type { IPaymentVerification } from '~/types';

// 포트원 클라이언트 초기화
const client = PortOne.PortOneApi({
  apiSecret: process.env.PORTONE_API_SECRET!,
});

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ success: false, message: 'Method not allowed' }, { status: 405 });
  }

  try {
    const { paymentId, expectedAmount, expectedProductId } = await request.json();

    // 필수 파라미터 검증
    if (!paymentId || !expectedAmount || !expectedProductId) {
      return json(
        { success: false, message: '필수 파라미터가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // 포트원에서 결제 정보 조회
    const paymentResponse = await client.getPayment({
      paymentId,
    });

    if (!paymentResponse.payment) {
      return json(
        { success: false, message: '결제 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const payment = paymentResponse.payment;

    // 결제 상태 검증
    if (payment.status !== 'PAID') {
      return json(
        { success: false, message: `결제가 완료되지 않았습니다. 상태: ${payment.status}` },
        { status: 400 }
      );
    }

    // 결제 금액 검증
    if (payment.amount.total !== expectedAmount) {
      return json(
        { 
          success: false, 
          message: `결제 금액이 일치하지 않습니다. 예상: ${expectedAmount}, 실제: ${payment.amount.total}` 
        },
        { status: 400 }
      );
    }

    // 상품 정보 검증 (customData에서)
    const customData = payment.customData as Record<string, any>;
    if (customData?.productId !== expectedProductId) {
      return json(
        { success: false, message: '상품 정보가 일치하지 않습니다.' },
        { status: 400 }
      );
    }

    // 중복 결제 방지 - DB에 이미 처리된 결제인지 확인
    // const existingPayment = await db.payment.findUnique({ where: { paymentId } });
    // if (existingPayment) {
    //   return json({ success: false, message: '이미 처리된 결제입니다.' }, { status: 409 });
    // }

    // 결제 정보를 데이터베이스에 저장
    // await db.payment.create({
    //   data: {
    //     paymentId: payment.id,
    //     orderName: payment.orderName,
    //     amount: payment.amount.total,
    //     currency: payment.currency,
    //     status: payment.status,
    //     customData: payment.customData,
    //     // 기타 필요한 필드들...
    //   },
    // });

    // 비즈니스 로직 처리 (예: 주문 생성, 재고 차감 등)
    // await processOrder({
    //   paymentId: payment.id,
    //   productId: expectedProductId,
    //   amount: payment.amount.total,
    // });

    return json({
      success: true,
      message: '결제가 성공적으로 완료되었습니다.',
      paymentData: {
        paymentId: payment.id,
        status: payment.status,
        amount: payment.amount.total,
        currency: payment.currency,
      },
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    
    return json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : '결제 검증 중 오류가 발생했습니다.' 
      },
      { status: 500 }
    );
  }
}
```

### 4.2 웹훅 처리 (app/routes/api.payment.webhook.ts)
```typescript
import { json, type ActionFunctionArgs } from '@remix-run/node';
import * as PortOne from '@portone/server-sdk';
import crypto from 'crypto';

const client = PortOne.PortOneApi({
  apiSecret: process.env.PORTONE_API_SECRET!,
});

// 웹훅 서명 검증 함수
function verifyWebhookSignature(body: string, signature: string, secret: string): boolean {
  const computedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(computedSignature, 'hex')
  );
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    // HTTP Body를 문자열로 받기
    const body = await request.text();
    const signature = request.headers.get('portone-signature');

    // 웹훅 서명 검증
    if (!signature || !verifyWebhookSignature(body, signature, process.env.PORTONE_WEBHOOK_SECRET!)) {
      console.error('Invalid webhook signature');
      return json({ error: 'Invalid signature' }, { status: 401 });
    }

    // 웹훅 데이터 파싱
    const webhookData = JSON.parse(body);
    
    // 웹훅 검증 (포트원 SDK 사용)
    const verification = await client.verifyWebhook(body, signature);
    if (!verification.isValid) {
      console.error('Webhook verification failed');
      return json({ error: 'Webhook verification failed' }, { status: 401 });
    }

    // 결제 상태에 따른 처리
    switch (webhookData.type) {
      case 'Transaction.Paid':
        await handlePaymentPaid(webhookData.data);
        break;
      
      case 'Transaction.Failed':
        await handlePaymentFailed(webhookData.data);
        break;
      
      case 'Transaction.Cancelled':
        await handlePaymentCancelled(webhookData.data);
        break;
      
      default:
        console.log('Unknown webhook type:', webhookData.type);
    }

    return json({ success: true });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

async function handlePaymentPaid(paymentData: any) {
  try {
    // 결제 완료 처리 로직
    console.log('Payment completed:', paymentData.paymentId);
    
    // 데이터베이스 업데이트
    // await db.payment.update({
    //   where: { paymentId: paymentData.paymentId },
    //   data: { status: 'PAID', updatedAt: new Date() },
    // });

    // 추가 비즈니스 로직 (이메일 발송, 알림 등)
    // await sendPaymentConfirmationEmail(paymentData);
    
  } catch (error) {
    console.error('Error handling payment paid:', error);
  }
}

async function handlePaymentFailed(paymentData: any) {
  try {
    console.log('Payment failed:', paymentData.paymentId);
    
    // 실패 처리 로직
    // await db.payment.update({
    //   where: { paymentId: paymentData.paymentId },
    //   data: { status: 'FAILED', updatedAt: new Date() },
    // });
    
  } catch (error) {
    console.error('Error handling payment failed:', error);
  }
}

async function handlePaymentCancelled(paymentData: any) {
  try {
    console.log('Payment cancelled:', paymentData.paymentId);
    
    // 취소 처리 로직
    // await db.payment.update({
    //   where: { paymentId: paymentData.paymentId },
    //   data: { status: 'CANCELLED', updatedAt: new Date() },
    // });
    
  } catch (error) {
    console.error('Error handling payment cancelled:', error);
  }
}
```

### 4.3 빌링키 발급 API (app/routes/api.billing-key.issue.ts)
```typescript
import { json, type ActionFunctionArgs } from '@remix-run/node';
import * as PortOne from '@portone/server-sdk';
import type { ICardCredential } from '~/types';

const client = PortOne.PortOneApi({
  apiSecret: process.env.PORTONE_API_SECRET!,
});

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ success: false, message: 'Method not allowed' }, { status: 405 });
  }

  try {
    const { customerId, cardInfo }: { customerId: string; cardInfo: ICardCredential } = await request.json();

    // 필수 파라미터 검증
    if (!customerId || !cardInfo) {
      return json(
        { success: false, message: '필수 파라미터가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // 카드 정보 유효성 검사
    const { number, expiryYear, expiryMonth, birthOrBusinessRegistrationNumber, passwordTwoDigits } = cardInfo;
    
    if (!number || !expiryYear || !expiryMonth || !birthOrBusinessRegistrationNumber || !passwordTwoDigits) {
      return json(
        { success: false, message: '모든 카드 정보가 필요합니다.' },
        { status: 400 }
      );
    }

    // 포트원 빌링키 발급 API 호출
    const issueResponse = await fetch('https://api.portone.io/billing-keys', {
      method: 'POST',
      headers: {
        Authorization: `PortOne ${process.env.PORTONE_API_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channelKey: process.env.PORTONE_CHANNEL_KEY,
        customer: {
          id: customerId,
        },
        method: {
          card: {
            credential: {
              number: number.replace(/\D/g, ''), // 숫자만 추출
              expiryYear,
              expiryMonth,
              birthOrBusinessRegistrationNumber,
              passwordTwoDigits,
            },
          },
        },
      }),
    });

    if (!issueResponse.ok) {
      const errorData = await issueResponse.json();
      throw new Error(`빌링키 발급 실패: ${errorData.message || 'Unknown error'}`);
    }

    const {
      billingKeyInfo: { billingKey },
    } = await issueResponse.json();

    // 빌링키를 데이터베이스에 저장
    // await db.billingKey.create({
    //   data: {
    //     billingKey,
    //     customerId,
    //     isActive: true,
    //     createdAt: new Date(),
    //   },
    // });

    return json({
      success: true,
      billingKey,
      message: '빌링키가 성공적으로 발급되었습니다.',
    });

  } catch (error) {
    console.error('Billing key issue error:', error);
    
    return json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : '빌링키 발급 중 오류가 발생했습니다.' 
      },
      { status: 500 }
    );
  }
}
```

### 4.4 빌링키 결제 API (app/routes/api.billing-key.payment.ts)
```typescript
import { json, type ActionFunctionArgs } from '@remix-run/node';
import * as PortOne from '@portone/server-sdk';
import crypto from 'crypto';

const client = PortOne.PortOneApi({
  apiSecret: process.env.PORTONE_API_SECRET!,
});

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ success: false, message: 'Method not allowed' }, { status: 405 });
  }

  try {
    const { billingKey, amount, orderName, customerId } = await request.json();

    // 필수 파라미터 검증
    if (!billingKey || !amount || !orderName || !customerId) {
      return json(
        { success: false, message: '필수 파라미터가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // 금액 유효성 검사
    if (amount <= 0) {
      return json(
        { success: false, message: '결제 금액은 0보다 커야 합니다.' },
        { status: 400 }
      );
    }

    // 빌링키 유효성 검증 (DB에서 확인)
    // const savedBillingKey = await db.billingKey.findUnique({
    //   where: { billingKey, customerId, isActive: true }
    // });
    // if (!savedBillingKey) {
    //   return json({ success: false, message: '유효하지 않은 빌링키입니다.' }, { status: 404 });
    // }

    // 고유한 결제 ID 생성
    const paymentId = `billing-payment-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;

    // 포트원 빌링키 결제 API 호출
    const paymentResponse = await fetch(
      `https://api.portone.io/payments/${encodeURIComponent(paymentId)}/billing-key`,
      {
        method: 'POST',
        headers: {
          Authorization: `PortOne ${process.env.PORTONE_API_SECRET}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          billingKey,
          orderName,
          customer: {
            id: customerId,
          },
          amount: {
            total: amount,
          },
          currency: 'KRW',
        }),
      }
    );

    if (!paymentResponse.ok) {
      const errorData = await paymentResponse.json();
      throw new Error(`빌링키 결제 실패: ${errorData.message || 'Unknown error'}`);
    }

    const paymentData = await paymentResponse.json();

    // 결제 정보를 데이터베이스에 저장
    // await db.payment.create({
    //   data: {
    //     paymentId,
    //     billingKey,
    //     customerId,
    //     orderName,
    //     amount,
    //     currency: 'KRW',
    //     status: paymentData.status,
    //     paymentMethod: 'BILLING_KEY',
    //     createdAt: new Date(),
    //   },
    // });

    return json({
      success: true,
      paymentId,
      status: paymentData.status,
      message: '빌링키 결제가 성공적으로 처리되었습니다.',
    });

  } catch (error) {
    console.error('Billing key payment error:', error);
    
    return json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : '빌링키 결제 중 오류가 발생했습니다.' 
      },
      { status: 500 }
    );
  }
}
```

### 4.5 결제 예약 API (app/routes/api.payment.schedule.ts)
```typescript
import { json, type ActionFunctionArgs } from '@remix-run/node';
import type { ISchedulePaymentRequest } from '~/types';

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ success: false, message: 'Method not allowed' }, { status: 405 });
  }

  try {
    const { billingKey, paymentId, orderName, amount, customerId, timeToPay } = await request.json();

    // 필수 파라미터 검증
    if (!billingKey || !paymentId || !orderName || !amount || !customerId || !timeToPay) {
      return json(
        { success: false, message: '필수 파라미터가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // 예약 시간 유효성 검사
    const scheduleTime = new Date(timeToPay);
    const now = new Date();
    
    if (scheduleTime <= now) {
      return json(
        { success: false, message: '예약 시간은 현재 시간보다 미래여야 합니다.' },
        { status: 400 }
      );
    }

    // 포트원 결제 예약 API 호출
    const scheduleResponse = await fetch(
      `https://api.portone.io/payments/${encodeURIComponent(paymentId)}/schedule`,
      {
        method: 'POST',
        headers: {
          Authorization: `PortOne ${process.env.PORTONE_API_SECRET}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment: {
            billingKey,
            orderName,
            customer: {
              id: customerId,
            },
            amount: {
              total: amount,
            },
            currency: 'KRW',
          },
          timeToPay,
        }),
      }
    );

    if (!scheduleResponse.ok) {
      const errorData = await scheduleResponse.json();
      throw new Error(`결제 예약 실패: ${errorData.message || 'Unknown error'}`);
    }

    const scheduleData = await scheduleResponse.json();

    // 예약 정보를 데이터베이스에 저장
    // await db.scheduledPayment.create({
    //   data: {
    //     paymentId,
    //     billingKey,
    //     customerId,
    //     orderName,
    //     amount,
    //     currency: 'KRW',
    //     scheduledAt: scheduleTime,
    //     status: 'SCHEDULED',
    //     createdAt: new Date(),
    //   },
    // });

    return json({
      success: true,
      paymentId,
      scheduledAt: timeToPay,
      message: '결제가 성공적으로 예약되었습니다.',
    });

  } catch (error) {
    console.error('Payment schedule error:', error);
    
    return json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : '결제 예약 중 오류가 발생했습니다.' 
      },
      { status: 500 }
    );
  }
}
```

### 4.6 반복 결제 관리 API (app/routes/api.subscription.manage.ts)
```typescript
import { json, type ActionFunctionArgs } from '@remix-run/node';

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ success: false, message: 'Method not allowed' }, { status: 405 });
  }

  try {
    const { action, subscriptionId, billingKey, customerId, amount, intervalDays } = await request.json();

    switch (action) {
      case 'CREATE_SUBSCRIPTION':
        return await createSubscription({ billingKey, customerId, amount, intervalDays });
      
      case 'CANCEL_SUBSCRIPTION':
        return await cancelSubscription(subscriptionId);
      
      case 'UPDATE_SUBSCRIPTION':
        return await updateSubscription({ subscriptionId, amount, intervalDays });
      
      default:
        return json({ success: false, message: '지원하지 않는 액션입니다.' }, { status: 400 });
    }

  } catch (error) {
    console.error('Subscription management error:', error);
    
    return json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : '구독 관리 중 오류가 발생했습니다.' 
      },
      { status: 500 }
    );
  }
}

async function createSubscription({ billingKey, customerId, amount, intervalDays }: {
  billingKey: string;
  customerId: string;
  amount: number;
  intervalDays: number;
}) {
  // 구독 정보를 데이터베이스에 저장
  // const subscription = await db.subscription.create({
  //   data: {
  //     customerId,
  //     billingKey,
  //     amount,
  //     intervalDays,
  //     status: 'ACTIVE',
  //     nextPaymentDate: new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000),
  //     createdAt: new Date(),
  //   },
  // });

  // 첫 번째 결제 예약
  const firstPaymentDate = new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000);
  // await scheduleNextPayment(subscription.id, firstPaymentDate);

  return json({
    success: true,
    // subscriptionId: subscription.id,
    message: '구독이 성공적으로 생성되었습니다.',
  });
}

async function cancelSubscription(subscriptionId: string) {
  // 구독 취소 처리
  // await db.subscription.update({
  //   where: { id: subscriptionId },
  //   data: { status: 'CANCELLED', updatedAt: new Date() }
  // });

  return json({
    success: true,
    message: '구독이 취소되었습니다.',
  });
}

async function updateSubscription({ subscriptionId, amount, intervalDays }: {
  subscriptionId: string;
  amount?: number;
  intervalDays?: number;
}) {
  // 구독 정보 업데이트
  // const updateData: any = { updatedAt: new Date() };
  // if (amount) updateData.amount = amount;
  // if (intervalDays) updateData.intervalDays = intervalDays;

  // await db.subscription.update({
  //   where: { id: subscriptionId },
  //   data: updateData
  // });

  return json({
    success: true,
    message: '구독 정보가 업데이트되었습니다.',
  });
}
```

---

## 🔍 5단계: 검증 체크리스트

### 🟢 구현 전 체크리스트
**기본 설정**
- [ ] 환경변수 설정 완료 (.env 파일)
- [ ] TypeScript 인터페이스 정의 완료 (types/index.ts)
- [ ] 패키지 설치 완료 (브라우저 SDK, 서버 SDK)
- [ ] 데이터베이스 스키마 설계 완료

**빌링키 관련**
- [ ] 빌링키 저장 테이블 설계
- [ ] 고객 정보 연동 설계
- [ ] 빌링키 유효성 검증 로직 설계

**구독/예약 결제 관련**
- [ ] 구독 관리 테이블 설계
- [ ] 예약 결제 스케줄링 로직 설계
- [ ] 반복 결제 실패 처리 방안 수립

**나이스페이먼츠 관련**
- [ ] 나이스페이먼츠(신모듈) 채널 설정 완료
- [ ] 주문명 40Byte 제한 및 특수문자 검증 로직 설계
- [ ] 면세/복합과세 계약 여부 확인 및 설정
- [ ] 간편결제별 특화 옵션 설계 (카카오페이, 네이버페이, SSG페이)

**KG이니시스 관련**
- [ ] KG이니시스 채널 설정 완료
- [ ] PC/모바일 환경별 필수 파라미터 차이점 설계
- [ ] paymentId/issueId ASCII 문자 제한 검증 로직 설계
- [ ] 사전 계약 필요 기능 확인 및 설정 (API 수기결제, 빌링키 발급, 에스크로 등)
- [ ] 빌링키 발급 방식별 구현 계획 (카드/휴대폰)
- [ ] 가상계좌 고정식 처리 방식 설계

**카카오페이 관련**
- [ ] 카카오페이 채널 설정 완료
- [ ] 간편결제(EASY_PAY) 전용 설계 확인
- [ ] 원화(KRW) 전용 결제 시스템 설계
- [ ] PC(IFRAME)/모바일(REDIRECTION) 창 타입 설계
- [ ] 카드사 제한 기능 구현 계획
- [ ] 고정 할부 옵션 구현 계획
- [ ] 커스텀 메시지 사전 협의 확인

**네이버페이(결제형) 관련**
- [ ] 네이버페이(결제형) 채널 설정 완료
- [ ] 간편결제(EASY_PAY) 전용 설계 확인
- [ ] 100원 이상 최소 결제금액 검증 로직 설계
- [ ] PC(POPUP)/모바일(REDIRECTION) 창 타입 설계
- [ ] 고위험 업종별 고객 정보 필수 입력 설계
- [ ] 에러 메시지 비가공 정책 설계
- [ ] 네이버페이 특화 상품 정보(productItems) 설계
- [ ] 이용완료일, 배송비 등 특화 파라미터 설계

### 🟡 개발 중 체크리스트
**일반 결제**
- [ ] paymentId 고유성 보장 로직 구현
- [ ] 결제 금액 검증 로직 구현
- [ ] 상품 정보 일치 검증 구현
- [ ] 리다이렉트 방식 쿼리 파라미터 처리 구현

**빌링키 결제**
- [ ] 빌링키 발급 API 구현 (SDK & API 방식)
- [ ] 빌링키 유효성 검증 로직 구현
- [ ] 빌링키 결제 API 구현
- [ ] 카드 정보 보안 처리 (암호화, 비저장)

**예약/반복 결제**
- [ ] 결제 예약 API 구현
- [ ] 구독 관리 API 구현 (생성/수정/취소)
- [ ] 반복 결제 스케줄링 로직 구현
- [ ] 결제 실패 시 재시도 로직 구현

**공통 사항**
- [ ] 에러 핸들링 완비
- [ ] 웹훅 서명 검증 구현
- [ ] 로깅 및 모니터링 구현

**나이스페이먼츠 특화**
- [ ] 주문명 40Byte 제한 검증 구현
- [ ] 가상계좌 `accountExpiry` 필수 입력 검증
- [ ] 휴대폰 소액결제 `productType` 필수 검증
- [ ] 상품권 결제 `MallUserID` 필수 검증
- [ ] 카드 다이렉트 호출시 할부 개월수 필수 검증
- [ ] 면세금액 입력 검증 (복합과세 계약시)
- [ ] 간편결제별 특화 파라미터 구현
- [ ] 나이스페이먼츠 특화 에러 처리 구현

**KG이니시스 특화**
- [ ] paymentId/issueId ASCII 문자만 허용 검증 구현
- [ ] PC 환경에서 고객 정보(이름, 전화번호, 이메일) 필수 검증
- [ ] 빌링키 발급시 `issueId`, `issueName` 필수 검증
- [ ] 휴대폰 빌링키 발급시 `offerPeriod` 필수 검증
- [ ] 가상계좌 고정식 처리 로직 구현
- [ ] 카드 우선선택 파라미터 구현 (`P_CARD_OPTION`)
- [ ] 결제창 색상 설정 파라미터 구현 (`SKIN`)
- [ ] KG이니시스 특화 에러 처리 구현
- [ ] requestIssueBillingKeyAndPay 동시 처리 로직 구현

**카카오페이 특화**
- [ ] 간편결제(EASY_PAY) 전용 검증 구현
- [ ] 원화(KRW) 전용 통화 검증 구현
- [ ] PC(IFRAME)/모바일(REDIRECTION) 창 타입 자동 설정 구현
- [ ] availableCards 카드사 제한 기능 구현
- [ ] 고정 할부(fixedMonth) 옵션 구현
- [ ] 5만원 미만 할부시 체크카드 제한 경고 구현
- [ ] 커스텀 메시지(custom_message) 구현
- [ ] 빌링키 발급시 issueName 필수 검증 구현
- [ ] 에스크로/문화비/상품유형 미지원 파라미터 필터링 구현
- [ ] 카카오페이 특화 에러 처리 구현

**네이버페이(결제형) 특화**
- [ ] 간편결제(EASY_PAY) 전용 검증 구현
- [ ] 원화(KRW) 전용 통화 검증 구현
- [ ] 100원 이상 최소 결제금액 검증 구현
- [ ] PC(POPUP)/모바일(REDIRECTION) 창 타입 자동 설정 구현
- [ ] 고위험 업종시 고객 정보(이름, 생년월일) 필수 검증 구현
- [ ] 에러 메시지 비가공 처리 구현 (중요!)
- [ ] 네이버페이 특화 상품정보(productItems) 구현
- [ ] 이용완료일(useCfmYmdt) 파라미터 구현
- [ ] 배송비(deliveryFee) 파라미터 구현
- [ ] 빌링키 발급시 issueId, issueName 필수 검증 구현
- [ ] 할부/카드사제한 미지원 파라미터 필터링 구현
- [ ] 네이버페이 특화 에러 처리 구현

### 🔴 배포 전 체크리스트
**보안 및 인증**
- [ ] 프로덕션 환경변수 설정
- [ ] SSL 인증서 적용
- [ ] 카드 정보 처리 보안 검토
- [ ] API 접근 권한 설정

**결제 시스템**
- [ ] 웹훅 URL 등록 (포트원 관리자 콘솔)
- [ ] 결제 실패 알림 시스템 구축
- [ ] 중복 결제 방지 테스트
- [ ] 가상 계좌 처리 테스트

**빌링키 시스템**
- [ ] 빌링키 보안 저장 검증
- [ ] 빌링키 만료 관리 시스템 구축
- [ ] 빌링키 삭제/비활성화 기능 테스트

**구독 시스템**
- [ ] 구독 결제 스케줄링 테스트
- [ ] 구독 취소/환불 프로세스 테스트
- [ ] 결제 실패 시 재시도 및 알림 테스트

**모니터링**
- [ ] 로그 모니터링 설정
- [ ] 결제 성공률 모니터링 대시보드 구축
- [ ] 알림 시스템 (Slack, 이메일) 구축
- [ ] 보안 테스트 완료

**나이스페이먼츠 특화 테스트**
- [ ] 나이스페이먼츠와 사전 계약 완료 확인
- [ ] 주문명 특수문자 제한 테스트
- [ ] 가상계좌 입금 기한 설정 테스트
- [ ] 휴대폰 소액결제 상품 유형 테스트
- [ ] 상품권 결제 (컬쳐랜드) 테스트
- [ ] 카드사별 다이렉트 호출 제한 테스트
- [ ] 간편결제별 특화 기능 테스트
- [ ] 면세/복합과세 처리 테스트
- [ ] 현금영수증 발급 테스트 (간편결제별)
- [ ] 에스크로 배송정보 등록 테스트

**KG이니시스 특화 테스트**
- [ ] KG이니시스와 사전 계약 완료 확인 (API 수기결제, 빌링키 발급, 에스크로 등)
- [ ] paymentId/issueId ASCII 문자 제한 테스트
- [ ] PC/모바일 환경별 필수 파라미터 차이 테스트
- [ ] 빌링키 발급 방식별 테스트 (카드/휴대폰)
- [ ] 휴대폰 빌링키 발급+결제 동시 처리 테스트
- [ ] 가상계좌 고정식 계좌번호 처리 테스트
- [ ] 카드사 우선선택 기능 테스트
- [ ] 결제창 색상 커스터마이징 테스트
- [ ] 개인/법인카드 선택 기능 테스트 (모바일)
- [ ] 에스크로, 상점분담무이자 등 추가 기능 테스트
- [ ] OCB 적립, 포인트 사용 등 부가 기능 테스트

**카카오페이 특화 테스트**
- [ ] 카카오페이와 채널 연동 및 설정 확인
- [ ] 간편결제(EASY_PAY) 전용 결제 테스트
- [ ] 원화(KRW) 전용 통화 테스트
- [ ] PC(IFRAME)/모바일(REDIRECTION) 창 타입 테스트
- [ ] 카드사 제한(availableCards) 기능 테스트
- [ ] 고정 할부 옵션 테스트
- [ ] 5만원 미만 할부시 체크카드 제한 테스트
- [ ] 커스텀 메시지 표시 테스트 (사전 협의 완료시)
- [ ] 빌링키 발급 및 issueName 필수 입력 테스트
- [ ] 에스크로/문화비/상품유형 파라미터 무시 확인
- [ ] 카카오페이 특화 에러 상황별 처리 테스트
- [ ] iOS appScheme 테스트 (해당시)

**네이버페이(결제형) 특화 테스트**
- [ ] 네이버페이(결제형)와 채널 연동 및 설정 확인
- [ ] 네이버페이 검수 진행 전 "API 호출 권한이 없습니다" 에러 확인
- [ ] 간편결제(EASY_PAY) 전용 결제 테스트
- [ ] 원화(KRW) 전용 통화 테스트
- [ ] 100원 이상 최소 결제금액 테스트
- [ ] 100원 미만 결제 예외 처리 테스트
- [ ] PC(POPUP)/모바일(REDIRECTION) 창 타입 테스트
- [ ] 고위험 업종시 고객 정보 필수 입력 테스트
- [ ] 에러 메시지 비가공 정책 준수 테스트 (중요!)
- [ ] 네이버페이 특화 상품정보(productItems) 전송 테스트
- [ ] 이용완료일(useCfmYmdt) 파라미터 테스트
- [ ] 배송비(deliveryFee) 파라미터 테스트
- [ ] 빌링키 발급시 issueId 중복 방지 테스트
- [ ] 빌링키 발급시 displayAmount/currency 쌍 테스트
- [ ] 할부/카드사제한 미지원 확인 테스트
- [ ] 네이버페이 특화 에러 상황별 처리 테스트

---

## 🏢 6단계: 결제대행사별 특화 연동

### 6.1 나이스페이먼츠 연동 가이드

PORTONE_NICEPAYMENTS_RULES.md 파일 참조


### 6.2 KG이니시스 연동 가이드

PORTONE_KGINICIS_RULES.md 파일 참조


### 6.3 카카오페이 연동 가이드

PORTONE_KAKAOPAY_RULES.md 파일 참조


### 6.4 네이버페이(결제형) 연동 가이드

PORTONE_NAVERPAY_RULES.md 파일 참조


### 6.5 간편결제사별 통합 비교표

| 기능/특징 | 카카오페이 | 네이버페이(결제형) | 나이스페이먼츠 | KG이니시스 |
|-----------|------------|-------------------|----------------|------------|
| **기본 설정** |  |  |  |  |
| 지원 결제방식 | EASY_PAY만 | EASY_PAY만 | 다양한 방식 | 다양한 방식 |
| 지원 통화 | KRW만 | KRW만 | KRW, USD | KRW만 |
| 지원 언어 | KO_KR만 | KO_KR만 | 다국어 | KO_KR 우선 |
| 최소 결제금액 | 100원 | 100원 | 1원 | 1원 |
| **창 타입** |  |  |  |  |
| PC 지원 방식 | IFRAME | POPUP | 다양함 | 다양함 |
| Mobile 지원 방식 | REDIRECTION | REDIRECTION | 다양함 | 다양함 |
| **특화 기능** |  |  |  |  |
| 할부 지원 | 고정할부만 | 미지원 | 다양한 할부 | 다양한 할부 |
| 카드사 제한 | 지원 | 미지원 | 지원 | 지원 |
| 에스크로 | 미지원 | 미지원 | 지원 | 지원 |
| 문화비 | 미지원 | 미지원 | 지원 | 지원 |
| **빌링키** |  |  |  |  |
| 발급 방식 | 결제창만 | 결제창만 | 결제창+API | 결제창+API |
| 필수 파라미터 | issueName | issueId, issueName | issueId, issueName | issueId, issueName |
| **주의사항** |  |  |  |  |
| 특별 제약 | 5만원 미만 할부시 체크카드 불가 | 에러메시지 비가공 | 40Byte 주문명 제한 | ASCII 문자 제한 |
| 고객정보 요구 | 선택 | 고위험업종시 필수 | PC환경시 권장 | PC환경시 필수 |

---

### 🎯 간편결제사별 특화 프롬프트 패턴

#### 카카오페이 특화 검증 패턴
```typescript
// ✅ 올바른 카카오페이 구현
const validateKakaoPayRequest = (request: any) => {
  // 간편결제만 허용
  if (request.payMethod !== 'EASY_PAY') {
    throw new Error('카카오페이는 간편결제(EASY_PAY)만 지원합니다.');
  }
  
  // 원화만 허용
  if (request.currency !== 'KRW') {
    throw new Error('카카오페이는 원화(KRW) 결제만 지원합니다.');
  }
  
  // 할부는 고정 할부만
  if (request.easyPay?.installment?.monthOption?.variableMonth) {
    throw new Error('카카오페이는 고정 할부만 지원합니다.');
  }
  
  // 5만원 미만 할부시 체크카드 제한
  if (request.totalAmount < 50000 && request.easyPay?.installment?.monthOption?.fixedMonth > 0) {
    console.warn('카카오페이: 5만원 미만 할부 설정시 체크카드 결제가 불가능합니다.');
  }
};

// ❌ 잘못된 카카오페이 구현
const wrongKakaoPayRequest = {
  payMethod: 'CARD', // 에러! 간편결제만 지원
  currency: 'USD', // 에러! 원화만 지원
  isEscrow: true, // 무시됨 - 에스크로 미지원
  isCulturalExpense: true, // 무시됨 - 문화비 미지원
};
```

#### 네이버페이 특화 검증 패턴
```typescript
// ✅ 올바른 네이버페이 구현
const validateNaverPayRequest = (request: any, isHighRisk: boolean) => {
  // 간편결제만 허용
  if (request.payMethod !== 'EASY_PAY') {
    throw new Error('네이버페이는 간편결제(EASY_PAY)만 지원합니다.');
  }
  
  // 100원 이상 필수
  if (request.totalAmount < 100) {
    throw new Error('네이버페이는 100원 이상 결제만 가능합니다.');
  }
  
  // 고위험 업종시 고객 정보 필수
  if (isHighRisk) {
    if (!request.customer?.fullName || !request.customer?.birthYear) {
      throw new Error('고위험 업종의 경우 고객 정보(이름, 생년월일)가 필수입니다.');
    }
  }
  
  // 빌링키 발급시 issueId 필수
  if (request.billingKeyMethod && !request.issueId) {
    throw new Error('네이버페이 빌링키 발급시 issueId는 필수입니다.');
  }
};

// 네이버페이 에러 처리 (비가공 원칙)
const handleNaverPayError = (error: any) => {
  // 에러 메시지를 가공 없이 그대로 표시
  return error.message; // ✅ 올바른 방법
  
  // return `결제에 실패하였습니다. 실패 사유: ${error.message}`; // ❌ 금지!
};
```

#### 간편결제사 선택 로직
```typescript
const selectEasyPayProvider = (provider: 'KAKAOPAY' | 'NAVERPAY', amount: number, isHighRisk: boolean) => {
  switch (provider) {
    case 'KAKAOPAY':
      return {
        windowType: { pc: 'IFRAME', mobile: 'REDIRECTION' },
        minAmount: 100,
        supportsInstallment: true, // 고정 할부만
        supportsCardLimit: true,
        requiresCustomerInfo: false,
      };
      
    case 'NAVERPAY':
      return {
        windowType: { pc: 'POPUP', mobile: 'REDIRECTION' },
        minAmount: 100,
        supportsInstallment: false,
        supportsCardLimit: false,
        requiresCustomerInfo: isHighRisk,
        errorMessagePolicy: 'NO_MODIFICATION', // 중요!
      };
      
    default:
      throw new Error('지원하지 않는 간편결제사입니다.');
  }
};
``` 