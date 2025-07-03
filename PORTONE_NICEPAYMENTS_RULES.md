### 6.1 나이스페이먼츠 연동 가이드

나이스페이먼츠는 포트원 V2에서 지원하는 주요 결제대행사 중 하나로, 다양한 결제수단과 특화 기능을 제공합니다.

#### 📋 나이스페이먼츠 채널 설정

**MUST DO**: V2 결제 모듈을 사용하려면 반드시 **나이스페이먼츠(신모듈)**로 연동해야 합니다.

```typescript
// 환경변수에 나이스페이먼츠 채널 키 설정
PORTONE_NICEPAY_CHANNEL_KEY=channel-key-9987cb87-6458-4888-b94e-68d9a2da896d
```

#### 💳 나이스페이먼츠 지원 결제수단

| 결제 방식 | payMethod/billingKeyMethod | 비고 |
|-----------|---------------------------|------|
| **일반 결제** |  |  |
| 신용카드 | `CARD` | 할부, 무이자 할부 지원 |
| 실시간 계좌이체 | `TRANSFER` | 다이렉트 호출 시 뱅크페이 |
| 가상계좌 | `VIRTUAL_ACCOUNT` | 입금 기한 필수 |
| 휴대폰 소액결제 | `MOBILE` | productType 필수 |
| 상품권결제 | `GIFT_CERTIFICATE` | 컬쳐랜드만 지원 |
| 간편 결제 | `EASY_PAY` | 카카오페이, 네이버페이 등 |
| **빌링키 발급** |  |  |
| 결제창 빌링키 | `EASY_PAY` | 간편결제만 지원 |
| API 빌링키 | `card` | 카드 정보 직접 입력 |

#### 🔧 나이스페이먼츠 특화 구현

##### 나이스페이먼츠 결제 컴포넌트 (app/components/payment/NicePaymentsForm.tsx)
```typescript
import { useState } from 'react';
import PortOne from '@portone/browser-sdk/v2';
import type { INicePaymentsPaymentRequest, INicePaymentsCardOptions } from '~/types';

interface INicePaymentsFormProps {
  storeId: string;
  channelKey: string;
  amount: number;
  orderName: string;
  payMethod: 'CARD' | 'TRANSFER' | 'VIRTUAL_ACCOUNT' | 'MOBILE' | 'GIFT_CERTIFICATE' | 'EASY_PAY';
}

export function NicePaymentsForm({ 
  storeId, 
  channelKey, 
  amount, 
  orderName, 
  payMethod 
}: INicePaymentsFormProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [taxFreeAmount, setTaxFreeAmount] = useState<number>(0);
  const [productType, setProductType] = useState<'PHYSICAL' | 'DIGITAL'>('PHYSICAL');
  const [installmentMonth, setInstallmentMonth] = useState<number>(0);

  const generatePaymentId = (): string => {
    return `nicepay-${Date.now()}-${crypto.randomUUID()}`;
  };

  const handleNicePaymentsPayment = async () => {
    setIsProcessing(true);

    try {
      const paymentId = generatePaymentId();
      
      // 나이스페이먼츠 특화 요청 객체 구성
      const paymentRequest: INicePaymentsPaymentRequest = {
        storeId,
        channelKey,
        paymentId,
        orderName: orderName.substring(0, 40), // 40Byte 제한
        totalAmount: amount,
        currency: 'KRW', // 나이스페이먼츠는 KRW, USD 지원
        payMethod,
        
        // 나이스페이먼츠 특화 옵션
        taxFreeAmount: taxFreeAmount > 0 ? taxFreeAmount : undefined,
        
        // 휴대폰 소액결제시 필수
        ...(payMethod === 'MOBILE' && {
          productType,
        }),
        
        // 상품권 결제시 설정
        ...(payMethod === 'GIFT_CERTIFICATE' && {
          giftCertificate: {
            certificateType: 'CULTURELAND' as const,
          },
          bypass: {
            nice_v2: {
              MallUserID: 'customer-unique-id', // 필수
            },
          },
        }),

        // 가상계좌 설정
        ...(payMethod === 'VIRTUAL_ACCOUNT' && {
          virtualAccount: {
            accountExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24시간 후
          },
        }),

        // 카드 결제 옵션
        ...(payMethod === 'CARD' && installmentMonth > 0 && {
          card: {
            installment: {
              monthOption: {
                fixedMonth: installmentMonth, // 나이스페이먼츠 다이렉트 호출시 필수
              },
            },
          },
        }),

        customer: {
          fullName: '고객명',
          phoneNumber: '010-1234-5678',
          email: 'customer@example.com',
        },
      };

      // 결제 요청
      const paymentResult = await PortOne.requestPayment(paymentRequest);

      if (paymentResult.code) {
        throw new Error(`나이스페이먼츠 결제 실패: ${paymentResult.message}`);
      }

      // 서버 검증
      const verificationResponse = await fetch('/api/payment/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: paymentResult.paymentId,
          expectedAmount: amount,
          pgProvider: 'NICEPAY',
        }),
      });

      const result = await verificationResponse.json();
      
      if (result.success) {
        alert('나이스페이먼츠 결제가 완료되었습니다!');
      } else {
        throw new Error(result.message);
      }

    } catch (error) {
      console.error('NicePay payment error:', error);
      alert(error instanceof Error ? error.message : '결제 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="nicepay-form">
      <h3>나이스페이먼츠 결제</h3>
      
      {/* 면세금액 설정 (복합과세 계약시) */}
      <div className="form-group">
        <label htmlFor="taxFreeAmount">면세금액</label>
        <input
          id="taxFreeAmount"
          type="number"
          value={taxFreeAmount}
          onChange={(e) => setTaxFreeAmount(Number(e.target.value))}
          placeholder="면세금액 (복합과세 계약시 필수)"
          min="0"
          max={amount}
        />
        <small>나이스페이먼츠와 복합과세 계약시 면세금액을 반드시 입력하세요.</small>
      </div>

      {/* 휴대폰 소액결제시 상품 유형 */}
      {payMethod === 'MOBILE' && (
        <div className="form-group">
          <label>상품 유형 (필수)</label>
          <select
            value={productType}
            onChange={(e) => setProductType(e.target.value as 'PHYSICAL' | 'DIGITAL')}
          >
            <option value="PHYSICAL">실물 상품</option>
            <option value="DIGITAL">디지털 상품</option>
          </select>
          <small>휴대폰 소액결제시 반드시 선택해야 합니다.</small>
        </div>
      )}

      {/* 카드 할부 개월수 (다이렉트 호출시) */}
      {payMethod === 'CARD' && (
        <div className="form-group">
          <label htmlFor="installmentMonth">할부 개월수</label>
          <select
            id="installmentMonth"
            value={installmentMonth}
            onChange={(e) => setInstallmentMonth(Number(e.target.value))}
          >
            <option value={0}>일시불</option>
            <option value={2}>2개월</option>
            <option value={3}>3개월</option>
            <option value={6}>6개월</option>
            <option value={12}>12개월</option>
          </select>
          <small>다이렉트 호출시 할부 개월수를 지정할 수 있습니다.</small>
        </div>
      )}

      {/* 결제 정보 표시 */}
      <div className="payment-summary">
        <p><strong>결제 금액:</strong> {amount.toLocaleString()}원</p>
        <p><strong>결제 수단:</strong> {payMethod}</p>
        {taxFreeAmount > 0 && (
          <p><strong>면세 금액:</strong> {taxFreeAmount.toLocaleString()}원</p>
        )}
      </div>

      <button
        onClick={handleNicePaymentsPayment}
        disabled={isProcessing}
        className={`payment-button nicepay ${isProcessing ? 'processing' : ''}`}
      >
        {isProcessing ? '나이스페이먼츠 결제 진행 중...' : '나이스페이먼츠로 결제하기'}
      </button>
    </div>
  );
}
```

##### 나이스페이먼츠 빌링키 발급 컴포넌트
```typescript
import { useState } from 'react';
import PortOne from '@portone/browser-sdk/v2';

interface INicePaymentsBillingKeyProps {
  storeId: string;
  channelKey: string;
  customerId: string;
  onBillingKeyIssued: (billingKey: string) => void;
}

export function NicePaymentsBillingKeyForm({
  storeId,
  channelKey,
  customerId,
  onBillingKeyIssued,
}: INicePaymentsBillingKeyProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [easyPayProvider, setEasyPayProvider] = useState<'KAKAOPAY' | 'NAVERPAY'>('KAKAOPAY');

  const handleIssueBillingKey = async () => {
    setIsProcessing(true);

    try {
      const issueId = `billing-${Date.now()}-${crypto.randomUUID()}`;
      const issueName = `${easyPayProvider} 정기결제 등록`;

      const billingKeyRequest = {
        storeId,
        channelKey,
        billingKeyMethod: 'EASY_PAY' as const, // 나이스페이먼츠는 간편결제만 지원
        issueId, // 나이스페이먼츠 필수
        issueName, // 나이스페이먼츠 필수
        customer: {
          customerId,
          fullName: '고객명',
          phoneNumber: '010-1234-5678',
          email: 'customer@example.com',
        },
        easyPay: {
          easyPayProvider,
          // 네이버페이의 경우 카드/포인트 선택 필요
          ...(easyPayProvider === 'NAVERPAY' && {
            availablePayMethods: ['CARD'], // 또는 ['CHARGE'] for 포인트
          }),
        },
      };

      const result = await PortOne.requestIssueBillingKey(billingKeyRequest);

      if (result.code) {
        throw new Error(`빌링키 발급 실패: ${result.message}`);
      }

      if (result.billingKey) {
        onBillingKeyIssued(result.billingKey);
        alert('나이스페이먼츠 빌링키가 성공적으로 발급되었습니다!');
      } else {
        throw new Error('빌링키가 발급되지 않았습니다.');
      }

    } catch (error) {
      console.error('NicePay billing key error:', error);
      alert(error instanceof Error ? error.message : '빌링키 발급 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="nicepay-billing-key">
      <h3>나이스페이먼츠 빌링키 발급</h3>
      
      <div className="form-group">
        <label>간편결제 수단 선택</label>
        <select
          value={easyPayProvider}
          onChange={(e) => setEasyPayProvider(e.target.value as 'KAKAOPAY' | 'NAVERPAY')}
        >
          <option value="KAKAOPAY">카카오페이</option>
          <option value="NAVERPAY">네이버페이</option>
        </select>
        <small>나이스페이먼츠는 결제창 방식으로 간편결제 빌링키만 발급 가능합니다.</small>
      </div>

      <div className="warning-box">
        ⚠️ <strong>나이스페이먼츠 빌링키 발급 주의사항</strong>
        <ul>
          <li>issueId는 영문 대소문자와 숫자만 사용하여 40자 이내로 입력</li>
          <li>issueName은 결제창에 표시되는 제목으로 필수 입력</li>
          <li>간편결제 수단만 지원 (카드 직접 입력 불가)</li>
        </ul>
      </div>

      <button
        onClick={handleIssueBillingKey}
        disabled={isProcessing}
        className="billing-key-button nicepay"
      >
        {isProcessing ? '빌링키 발급 중...' : `${easyPayProvider} 빌링키 발급하기`}
      </button>
    </div>
  );
}
```

#### 🚨 나이스페이먼츠 특화 주의사항

##### MUST DO (나이스페이먼츠 필수사항)
1. **주문명 제한**: 40Byte 이내, 특수문자 `% & | $ - + = [ ]` 사용 금지
2. **가상계좌**: `accountExpiry` 필수 입력
3. **휴대폰 소액결제**: `productType` 필수 입력, 상점설정과 일치해야 함
4. **상품권 결제**: `MallUserID` 필수 입력, 컬쳐랜드만 지원
5. **카드 다이렉트 호출**: 고정 할부 개월수 필수
6. **면세/복합과세**: 계약시 `taxFreeAmount` 필수 입력

##### NEVER DO (나이스페이먼츠 금지사항)
1. **토스뱅크 카드**: 다이렉트 호출 불가
2. **계좌이체 + 에스크로**: 다이렉트 호출 불가
3. **모바일 환경**: 다이렉트 호출 없이 할부 옵션 사용 불가
4. **간편결제 빌링키**: 카드 정보 직접 입력 불가
5. **네이버페이**: 고정/리스트 할부 불가, 상점 부담 무이자 불가

##### 간편결제별 특화 설정
```typescript
// 카카오페이
const kakaoPayOptions = {
  easyPayProvider: 'KAKAOPAY',
  // 지원 카드사: BC, 국민, 삼성, 신한, 현대, 롯데, 씨티, NH농협, 하나
  // 상점 부담 무이자: 불가능
  // 다이렉트 호출: 특정 카드사만 가능
};

// 네이버페이
const naverPayOptions = {
  easyPayProvider: 'NAVERPAY',
  availablePayMethods: ['CARD'], // 카드 또는 ['CHARGE'] 포인트
  // 포인트 결제시 현금영수증 정보 필수
  cashReceiptType: 'PERSONAL',
  customerIdentifier: '01012345678', // 휴대폰 번호만 가능
};

// SSG페이 (계좌 결제)
const ssgPayOptions = {
  easyPayProvider: 'SSGPAY',
  availablePayMethods: ['TRANSFER'],
  cashReceiptType: 'PERSONAL', // 필수
  customerIdentifier: '01012345678', // 필수
};
```

#### 📊 나이스페이먼츠 에러 처리 패턴

```typescript
const handleNicePayError = (error: any) => {
  // 나이스페이먼츠 특화 에러 처리
  const errorMessage = error.message || '';

  if (errorMessage.includes('CPID미설정')) {
    return '휴대폰 소액결제 상품 유형과 상점 설정이 일치하지 않습니다.';
  }
  
  if (errorMessage.includes('MallUserID')) {
    return '상품권 결제시 구매자 ID(MallUserID)는 필수입니다.';
  }
  
  if (errorMessage.includes('할부 개월수')) {
    return '카드 다이렉트 호출시 고정 할부 개월수를 입력해주세요.';
  }
  
  if (errorMessage.includes('면세금액')) {
    return '복합과세 계약시 면세금액을 반드시 입력해주세요.';
  }
  
  if (errorMessage.includes('현금영수증')) {
    return '해당 결제수단은 현금영수증 정보가 필수입니다.';
  }

  // 일반적인 에러 처리
  return errorMessage || '나이스페이먼츠 결제 중 오류가 발생했습니다.';
};
```

#### 💡 나이스페이먼츠 사전 계약 필요 기능

다음 기능들은 나이스페이먼츠와 **사전 계약**이 완료되어야 사용 가능합니다:

- ✅ **모든 결제 수단** (간편결제 포함)
- ✅ **면세/복합과세** 사용
- ✅ **부가세 지정 금액** 방식 사용
- ✅ **부분 취소** 기능
- ✅ **할부** 사용
- ✅ **상점 부담 무이자 할부** 사용
- ✅ **카드사 포인트** 사용
- ✅ **에스크로** 사용
- ✅ **해외 결제** 사용

**⚠️ 계약 없이 사용시 결제창 호출 실패 또는 의도하지 않은 결과 발생 가능**

---
