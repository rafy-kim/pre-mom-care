### 6.2 KG이니시스 연동 가이드

KG이니시스는 포트원 V2에서 지원하는 주요 결제대행사 중 하나로, 다양한 결제수단과 안정적인 결제 서비스를 제공합니다.

#### 📋 KG이니시스 채널 설정

포트원 콘솔에서 KG이니시스 채널을 설정하고 생성된 채널 키를 환경변수에 추가합니다.

```typescript
// 환경변수에 KG이니시스 채널 키 설정
PORTONE_INICIS_CHANNEL_KEY=channel-key-9987cb87-6458-4888-b94e-68d9a2da896d
```

#### 🚨 KG이니시스 사전 계약 필요 기능

**중요**: 다음 기능들은 KG이니시스와 **사전 계약**이 반드시 필요합니다. 계약 없이 사용시 결제 승인 실패 또는 의도하지 않은 응답을 받을 수 있습니다.

- ❌ **API를 통한 수기 결제** (가상계좌, 카드)
- ❌ **API를 통한 빌링키 발급**
- ❌ **에스크로 결제**
- ❌ **상점분담무이자 설정**
- ❌ **부가세 및 비과세 금액 직접 설정**
- ❌ **카드사 포인트 사용 여부 설정**
- ❌ **OK캐시백 적립 옵션 설정**
- ❌ **부분무이자 설정**
- ❌ **몰포인트 설정**
- ❌ **카드사/간편결제 다이렉트 호출**
- ❌ **휴대폰 결제 익월 환불**

#### 💳 KG이니시스 지원 결제수단

| 결제 방식 | payMethod/billingKeyMethod | 비고 |
|-----------|---------------------------|------|
| **결제창 일반 결제** |  |  |
| 신용카드 | `CARD` | PC/모바일 환경별 차이 |
| 실시간 계좌이체 | `TRANSFER` | 은행별 지원 차이 |
| 가상계좌 | `VIRTUAL_ACCOUNT` | 회전식/고정식 지원 |
| 상품권 | `GIFT_CERTIFICATE` | 지원 상품권 제한 |
| 휴대폰 소액결제 | `MOBILE` | productType 필수 |
| 간편결제 | `EASY_PAY` | 제한적 지원 |
| **결제창 빌링키 발급** |  |  |
| 카드 빌링키 | `CARD` | requestIssueBillingKey |
| 휴대폰 빌링키 | `MOBILE` | requestIssueBillingKeyAndPay |
| **API 수기 결제** |  |  |
| 카드 수기결제 | `card` | 사전 계약 필수 |
| 가상계좌 수기결제 | `virtualAccount` | 사전 계약 필수 |
| **API 빌링키 발급** |  |  |
| 카드 API 빌링키 | `card` | 사전 계약 필수 |

#### 🔧 KG이니시스 특화 구현

##### KG이니시스 결제 컴포넌트 (app/components/payment/InicisForm.tsx)
```typescript
import { useState } from 'react';
import PortOne from '@portone/browser-sdk/v2';
import type { IPaymentRequest, ICustomer } from '~/types';

interface IInicisFormProps {
  storeId: string;
  channelKey: string;
  amount: number;
  orderName: string;
  payMethod: 'CARD' | 'TRANSFER' | 'VIRTUAL_ACCOUNT' | 'MOBILE' | 'GIFT_CERTIFICATE' | 'EASY_PAY';
}

// KG이니시스 특화 인터페이스
interface IInicisPaymentRequest extends IPaymentRequest {
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

export function InicisForm({ 
  storeId, 
  channelKey, 
  amount, 
  orderName, 
  payMethod 
}: IInicisFormProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<ICustomer>({
    fullName: '',
    phoneNumber: '',
    email: '',
  });
  const [selectedCardCode, setSelectedCardCode] = useState<string>('');
  const [skinColor, setSkinColor] = useState<string>('#C1272C');

  const generatePaymentId = (): string => {
    // KG이니시스는 ASCII 문자만 허용
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    return `inicis-${timestamp}-${randomStr}`;
  };

  const validateCustomerInfo = (): boolean => {
    // KG이니시스 PC 결제시 fullName과 phoneNumber, email 필수
    if (!customerInfo.fullName || !customerInfo.phoneNumber || !customerInfo.email) {
      alert('KG이니시스 PC 결제시 고객 정보(이름, 전화번호, 이메일)가 필수입니다.');
      return false;
    }
    return true;
  };

  const handleInicisPayment = async () => {
    if (!validateCustomerInfo()) return;
    
    setIsProcessing(true);

    try {
      const paymentId = generatePaymentId();
      
      // KG이니시스 특화 요청 객체 구성
      const paymentRequest: IInicisPaymentRequest = {
        storeId,
        channelKey,
        paymentId,
        orderName,
        totalAmount: amount,
        currency: 'KRW', // KG이니시스는 KRW만 지원
        payMethod,
        customer: {
          fullName: customerInfo.fullName,
          phoneNumber: customerInfo.phoneNumber,
          email: customerInfo.email,
        },
        
        // KG이니시스 특화 bypass 파라미터
        bypass: {
          inicis_v2: {
            // PC용 설정
            acceptmethod: [
              `SKIN(${skinColor})`, // 결제창 색상
              'below1000', // 1000원 미만 결제 허용
              'ocb', // OCB 적립 옵션
            ],
            
            // 모바일용 설정
            P_MNAME: '테스트 가맹점',
            ...(selectedCardCode && {
              P_CARD_OPTION: `selcode=${selectedCardCode}`, // 카드 우선선택
            }),
            P_RESERVED: [
              'below1000=Y', // 1000원 미만 결제 허용
              'noeasypay=Y', // 간편결제 미노출
            ],
          },
        },
      };

      // 결제 요청
      const paymentResult = await PortOne.requestPayment(paymentRequest);

      if (paymentResult.code) {
        throw new Error(`KG이니시스 결제 실패: ${paymentResult.message}`);
      }

      // 서버 검증
      const verificationResponse = await fetch('/api/payment/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: paymentResult.paymentId,
          expectedAmount: amount,
          pgProvider: 'INICIS',
        }),
      });

      const result = await verificationResponse.json();
      
      if (result.success) {
        alert('KG이니시스 결제가 완료되었습니다!');
      } else {
        throw new Error(result.message);
      }

    } catch (error) {
      console.error('Inicis payment error:', error);
      alert(error instanceof Error ? error.message : '결제 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="inicis-form">
      <h3>KG이니시스 결제</h3>
      
      {/* 고객 정보 입력 (PC 결제시 필수) */}
      <div className="customer-info">
        <h4>고객 정보 (필수)</h4>
        <div className="form-group">
          <label htmlFor="fullName">이름 *</label>
          <input
            id="fullName"
            type="text"
            value={customerInfo.fullName}
            onChange={(e) => setCustomerInfo(prev => ({ ...prev, fullName: e.target.value }))}
            placeholder="고객 이름 (PC 결제시 필수)"
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="phoneNumber">전화번호 *</label>
          <input
            id="phoneNumber"
            type="tel"
            value={customerInfo.phoneNumber}
            onChange={(e) => setCustomerInfo(prev => ({ ...prev, phoneNumber: e.target.value }))}
            placeholder="010-1234-5678 (PC 결제시 필수)"
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="email">이메일 *</label>
          <input
            id="email"
            type="email"
            value={customerInfo.email}
            onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
            placeholder="customer@example.com (PC 결제시 필수)"
            required
          />
        </div>
      </div>

      {/* 카드 결제시 카드사 선택 */}
      {payMethod === 'CARD' && (
        <div className="form-group">
          <label htmlFor="cardCode">우선 선택 카드사 (선택사항)</label>
          <select
            id="cardCode"
            value={selectedCardCode}
            onChange={(e) => setSelectedCardCode(e.target.value)}
          >
            <option value="">카드사 선택</option>
            <option value="11">KB국민카드</option>
            <option value="14">신한카드</option>
            <option value="21">하나카드</option>
            <option value="31">삼성카드</option>
            <option value="34">롯데카드</option>
            <option value="36">카카오뱅크카드</option>
          </select>
          <small>선택한 카드사가 기본으로 선택된 상태로 결제창이 열립니다.</small>
        </div>
      )}

      {/* 결제창 색상 설정 */}
      <div className="form-group">
        <label htmlFor="skinColor">결제창 색상</label>
        <input
          id="skinColor"
          type="color"
          value={skinColor}
          onChange={(e) => setSkinColor(e.target.value)}
        />
        <small>결제창의 메인 색상을 설정할 수 있습니다.</small>
      </div>

      <button
        onClick={handleInicisPayment}
        disabled={isProcessing}
        className="payment-button"
      >
        {isProcessing ? 'KG이니시스 결제 처리중...' : 'KG이니시스로 결제하기'}
      </button>
      
      <div className="inicis-notice">
        <h5>⚠️ KG이니시스 주의사항</h5>
        <ul>
          <li>PC와 모바일에서 필수 파라미터가 다릅니다</li>
          <li>paymentId는 ASCII 문자만 허용됩니다</li>
          <li>API 수기결제, 빌링키 발급은 사전 계약이 필요합니다</li>
          <li>부가세/면세금액 직접 지정은 별도 계약이 필요합니다</li>
        </ul>
      </div>
    </div>
  );
}
```

##### KG이니시스 빌링키 발급 컴포넌트 (app/components/payment/InicisBillingKeyForm.tsx)
```typescript
import { useState } from 'react';
import PortOne from '@portone/browser-sdk/v2';
import type { IBillingKeyRequest, IBillingKeyResult, ICustomer } from '~/types';

interface IInicisBillingKeyFormProps {
  storeId: string;
  channelKey: string;
  billingKeyMethod: 'CARD' | 'MOBILE';
}

// KG이니시스 빌링키 특화 인터페이스
interface IInicisBillingKeyRequest extends IBillingKeyRequest {
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

export function InicisBillingKeyForm({ 
  storeId, 
  channelKey, 
  billingKeyMethod 
}: IInicisBillingKeyFormProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<ICustomer>({
    fullName: '',
    phoneNumber: '',
    email: '',
  });
  const [issueInfo, setIssueInfo] = useState({
    issueId: '',
    issueName: '',
  });
  const [cardUse, setCardUse] = useState<'percard' | 'cocard'>('percard');

  const generateIssueId = (): string => {
    // KG이니시스는 ASCII 문자만 허용
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    return `inicis-billing-${timestamp}-${randomStr}`;
  };

  const validateBillingKeyInfo = (): boolean => {
    // KG이니시스 필수 정보 검증
    if (!issueInfo.issueId || !issueInfo.issueName) {
      alert('KG이니시스 빌링키 발급시 issueId와 issueName이 필수입니다.');
      return false;
    }

    // PC 빌링키 발급시 고객 정보 필수
    if (!customerInfo.fullName || !customerInfo.phoneNumber || !customerInfo.email) {
      alert('KG이니시스 PC 빌링키 발급시 고객 정보가 필수입니다.');
      return false;
    }

    return true;
  };

  const handleCardBillingKeyIssue = async () => {
    if (!validateBillingKeyInfo()) return;
    
    setIsProcessing(true);

    try {
      const billingKeyRequest: IInicisBillingKeyRequest = {
        storeId,
        channelKey,
        billingKeyMethod: 'CARD',
        issueId: issueInfo.issueId,
        issueName: issueInfo.issueName,
        customer: {
          fullName: customerInfo.fullName,
          phoneNumber: customerInfo.phoneNumber,
          email: customerInfo.email,
        },
        bypass: {
          inicis_v2: {
            carduse: cardUse, // 모바일에서만 동작
          },
        },
      };

      const billingKeyResult = await PortOne.requestIssueBillingKey(billingKeyRequest);

      if (billingKeyResult.code) {
        throw new Error(`KG이니시스 빌링키 발급 실패: ${billingKeyResult.message}`);
      }

      alert('KG이니시스 빌링키 발급이 완료되었습니다!');
      console.log('Billing Key:', billingKeyResult.billingKey);

    } catch (error) {
      console.error('Inicis billing key error:', error);
      alert(error instanceof Error ? error.message : '빌링키 발급 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMobileBillingKeyAndPay = async () => {
    if (!validateBillingKeyInfo()) return;
    
    setIsProcessing(true);

    try {
      const billingKeyAndPayRequest = {
        storeId,
        channelKey,
        billingKeyAndPayMethod: 'PHONE',
        totalAmount: 1000, // 테스트 금액
        currency: 'KRW',
        paymentId: generateIssueId(),
        orderName: issueInfo.issueName,
        customer: {
          fullName: customerInfo.fullName,
          phoneNumber: customerInfo.phoneNumber,
          email: customerInfo.email,
        },
        // 모바일 빌링키 발급시 제공 기간 필수
        offerPeriod: {
          validHours: 24, // 24시간
        },
        productType: 'DIGITAL', // 휴대폰 결제시 필수
      };

      const result = await PortOne.requestIssueBillingKeyAndPay(billingKeyAndPayRequest);

      if (result.code) {
        throw new Error(`KG이니시스 휴대폰 빌링키 발급 실패: ${result.message}`);
      }

      alert('KG이니시스 휴대폰 빌링키 발급 및 결제가 완료되었습니다!');

    } catch (error) {
      console.error('Inicis mobile billing key error:', error);
      alert(error instanceof Error ? error.message : '휴대폰 빌링키 발급 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="inicis-billing-form">
      <h3>KG이니시스 빌링키 발급</h3>
      
      {/* 빌링키 발급 정보 (KG이니시스 필수) */}
      <div className="issue-info">
        <h4>발급 정보 (필수)</h4>
        <div className="form-group">
          <label htmlFor="issueId">발급 ID *</label>
          <input
            id="issueId"
            type="text"
            value={issueInfo.issueId}
            onChange={(e) => setIssueInfo(prev => ({ ...prev, issueId: e.target.value }))}
            placeholder="빌링키 발급 고유 ID (ASCII만 허용)"
            required
          />
          <button 
            type="button" 
            onClick={() => setIssueInfo(prev => ({ ...prev, issueId: generateIssueId() }))}
          >
            자동 생성
          </button>
        </div>
        
        <div className="form-group">
          <label htmlFor="issueName">발급명 *</label>
          <input
            id="issueName"
            type="text"
            value={issueInfo.issueName}
            onChange={(e) => setIssueInfo(prev => ({ ...prev, issueName: e.target.value }))}
            placeholder="결제창에 표시될 제목"
            required
          />
        </div>
      </div>

      {/* 고객 정보 입력 (필수) */}
      <div className="customer-info">
        <h4>고객 정보 (필수)</h4>
        <div className="form-group">
          <label htmlFor="fullName">이름 *</label>
          <input
            id="fullName"
            type="text"
            value={customerInfo.fullName}
            onChange={(e) => setCustomerInfo(prev => ({ ...prev, fullName: e.target.value }))}
            placeholder="고객 이름"
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="phoneNumber">전화번호 *</label>
          <input
            id="phoneNumber"
            type="tel"
            value={customerInfo.phoneNumber}
            onChange={(e) => setCustomerInfo(prev => ({ ...prev, phoneNumber: e.target.value }))}
            placeholder="010-1234-5678"
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="email">이메일 *</label>
          <input
            id="email"
            type="email"
            value={customerInfo.email}
            onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
            placeholder="customer@example.com"
            required
          />
        </div>
      </div>

      {/* 카드 유형 선택 (모바일만) */}
      {billingKeyMethod === 'CARD' && (
        <div className="form-group">
          <label>카드 유형 (모바일에서만 적용)</label>
          <div className="radio-group">
            <label>
              <input
                type="radio"
                value="percard"
                checked={cardUse === 'percard'}
                onChange={(e) => setCardUse(e.target.value as 'percard')}
              />
              개인카드
            </label>
            <label>
              <input
                type="radio"
                value="cocard"
                checked={cardUse === 'cocard'}
                onChange={(e) => setCardUse(e.target.value as 'cocard')}
              />
              법인카드
            </label>
          </div>
        </div>
      )}

      <div className="button-group">
        {billingKeyMethod === 'CARD' && (
          <button
            onClick={handleCardBillingKeyIssue}
            disabled={isProcessing}
            className="billing-button"
          >
            {isProcessing ? '카드 빌링키 발급중...' : 'KG이니시스 카드 빌링키 발급'}
          </button>
        )}

        {billingKeyMethod === 'MOBILE' && (
          <button
            onClick={handleMobileBillingKeyAndPay}
            disabled={isProcessing}
            className="billing-button"
          >
            {isProcessing ? '휴대폰 빌링키 발급중...' : 'KG이니시스 휴대폰 빌링키 발급'}
          </button>
        )}
      </div>
      
      <div className="inicis-billing-notice">
        <h5>⚠️ KG이니시스 빌링키 주의사항</h5>
        <ul>
          <li>issueId와 issueName은 필수 입력사항입니다</li>
          <li>PC와 모바일에서 필수 파라미터가 다릅니다</li>
          <li>issueId는 ASCII 문자만 허용됩니다</li>
          <li>카드사 다이렉트 호출은 지원하지 않습니다</li>
          <li>휴대폰 빌링키는 발급과 동시에 결제가 진행됩니다</li>
          <li>모바일 빌링키 발급시 제공 기간(offerPeriod) 필수입니다</li>
        </ul>
      </div>
    </div>
  );
}
```

#### 🛠️ KG이니시스 서버 API 구현

##### API 수기(키인) 결제 (app/routes/api.inicis.instant-payment.ts)
```typescript
import { json, type ActionFunctionArgs } from '@remix-run/node';
import { PortOneApi } from '@portone/server-sdk';

export async function action({ request }: ActionFunctionArgs) {
  try {
    const { paymentId, amount, method, customer } = await request.json();

    const portone = PortOneApi(process.env.PORTONE_API_SECRET!);

    // KG이니시스 수기결제 요청 (사전 계약 필수)
    const paymentResponse = await portone.payment.payInstantly({
      channelKey: process.env.PORTONE_INICIS_CHANNEL_KEY!,
      orderName: '수기 결제',
      amount: {
        total: amount,
      },
      currency: 'KRW',
      customer: {
        name: {
          full: customer.name, // KG이니시스 필수
        },
        phoneNumber: customer.phoneNumber, // KG이니시스 필수
        email: customer.email, // KG이니시스 필수
      },
      method: method.type === 'card' 
        ? {
            card: {
              credential: {
                number: method.cardNumber,
                expiryYear: method.expiryYear,
                expiryMonth: method.expiryMonth,
                birthOrBusinessRegistrationNumber: method.birthNumber,
                passwordTwoDigits: method.passwordTwoDigits,
              },
            },
          }
        : {
            virtualAccount: {
              bank: method.bank,
              expiry: {
                dueDate: method.dueDate, // 입금 기한 필수
              },
              option: {
                type: 'FIXED', // KG이니시스는 고정식만 지원
                fixed: {
                  accountNumber: method.accountNumber, // 미리 전달받은 계좌번호
                },
              },
              cashReceipt: {
                type: 'PERSONAL',
                customerIdentityNumber: customer.phoneNumber,
              },
              remitteeName: customer.name,
            },
          },
      productCount: 1,
    }, paymentId);

    if (paymentResponse.status === 'PAID') {
      return json({ 
        success: true, 
        paymentId: paymentResponse.id,
        message: 'KG이니시스 수기 결제가 완료되었습니다.' 
      });
    } else {
      throw new Error('결제가 완료되지 않았습니다.');
    }

  } catch (error) {
    console.error('Inicis instant payment error:', error);
    return json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'KG이니시스 수기 결제 중 오류가 발생했습니다.',
        errorCode: 'INICIS_INSTANT_PAYMENT_ERROR'
      },
      { status: 500 }
    );
  }
}
```

##### API 빌링키 발급 (app/routes/api.inicis.billing-key.ts)
```typescript
import { json, type ActionFunctionArgs } from '@remix-run/node';
import { PortOneApi } from '@portone/server-sdk';

export async function action({ request }: ActionFunctionArgs) {
  try {
    const { customerId, cardCredential } = await request.json();

    const portone = PortOneApi(process.env.PORTONE_API_SECRET!);

    // KG이니시스 API 빌링키 발급 (사전 계약 필수)
    const billingKeyResponse = await portone.billingKey.issue({
      channelKey: process.env.PORTONE_INICIS_CHANNEL_KEY!,
      customer: {
        id: customerId,
        name: {
          full: cardCredential.customerName, // KG이니시스 필수
        },
        phoneNumber: cardCredential.phoneNumber, // KG이니시스 필수
        email: cardCredential.email, // KG이니시스 필수
      },
      method: {
        card: {
          credential: {
            number: cardCredential.number,
            expiryYear: cardCredential.expiryYear,
            expiryMonth: cardCredential.expiryMonth,
            birthOrBusinessRegistrationNumber: cardCredential.birthOrBusinessRegistrationNumber,
            passwordTwoDigits: cardCredential.passwordTwoDigits,
          },
        },
      },
    });

    if (billingKeyResponse.billingKey) {
      return json({ 
        success: true, 
        billingKey: billingKeyResponse.billingKey,
        message: 'KG이니시스 빌링키 발급이 완료되었습니다.' 
      });
    } else {
      throw new Error('빌링키 발급에 실패했습니다.');
    }

  } catch (error) {
    console.error('Inicis billing key issue error:', error);
    return json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'KG이니시스 빌링키 발급 중 오류가 발생했습니다.',
        errorCode: 'INICIS_BILLING_KEY_ERROR'
      },
      { status: 500 }
    );
  }
}
```

##### 빌링키 단건 결제 (app/routes/api.inicis.billing-payment.ts)
```typescript
import { json, type ActionFunctionArgs } from '@remix-run/node';
import { PortOneApi } from '@portone/server-sdk';

export async function action({ request }: ActionFunctionArgs) {
  try {
    const { paymentId, billingKey, amount, orderName, customerId } = await request.json();

    const portone = PortOneApi(process.env.PORTONE_API_SECRET!);

    // KG이니시스 빌링키 단건 결제
    const paymentResponse = await portone.payment.payWithBillingKey({
      billingKey,
      orderName,
      customer: {
        id: customerId,
        phoneNumber: '010-1234-5678', // KG이니시스 필수
        email: 'customer@example.com', // KG이니시스 필수
      },
      amount: {
        total: amount,
      },
      currency: 'KRW',
      productCount: 1,
    }, paymentId);

    if (paymentResponse.status === 'PAID') {
      return json({ 
        success: true, 
        paymentId: paymentResponse.id,
        message: 'KG이니시스 빌링키 결제가 완료되었습니다.' 
      });
    } else {
      throw new Error('빌링키 결제가 완료되지 않았습니다.');
    }

  } catch (error) {
    console.error('Inicis billing payment error:', error);
    return json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'KG이니시스 빌링키 결제 중 오류가 발생했습니다.',
        errorCode: 'INICIS_BILLING_PAYMENT_ERROR'
      },
      { status: 500 }
    );
  }
}
```

##### 예약/반복 결제 (app/routes/api.inicis.schedule-payment.ts)
```typescript
import { json, type ActionFunctionArgs } from '@remix-run/node';
import { PortOneApi } from '@portone/server-sdk';

export async function action({ request }: ActionFunctionArgs) {
  try {
    const { paymentId, billingKey, amount, orderName, timeToPay, customerId } = await request.json();

    const portone = PortOneApi(process.env.PORTONE_API_SECRET!);

    // KG이니시스 예약 결제
    const scheduleResponse = await portone.payment.schedule({
      payment: {
        billingKey,
        orderName,
        customer: {
          id: customerId,
          phoneNumber: '010-1234-5678', // KG이니시스 필수
          email: 'customer@example.com', // KG이니시스 필수
        },
        amount: {
          total: amount,
        },
        currency: 'KRW',
      },
      timeToPay, // ISO 8601 형식
    }, paymentId);

    return json({ 
      success: true, 
      scheduleId: scheduleResponse.scheduleId,
      message: 'KG이니시스 예약 결제가 등록되었습니다.' 
    });

  } catch (error) {
    console.error('Inicis schedule payment error:', error);
    return json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'KG이니시스 예약 결제 등록 중 오류가 발생했습니다.',
        errorCode: 'INICIS_SCHEDULE_PAYMENT_ERROR'
      },
      { status: 500 }
    );
  }
}
```

#### 📝 KG이니시스 에러 처리

```typescript
// KG이니시스 특화 에러 처리 함수
export const handleInicisError = (error: any): string => {
  const errorCode = error?.code || error?.pgCode;
  const errorMessage = error?.message || error?.pgMessage;

  // KG이니시스 특화 에러 코드 처리
  switch (errorCode) {
    case 'PG_PROVIDER_ERROR':
      return 'KG이니시스 서버에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.';
    
    case 'VALIDATION_ERROR':
      if (errorMessage?.includes('ASCII')) {
        return 'paymentId는 영문, 숫자, 특수문자만 사용 가능합니다.';
      }
      if (errorMessage?.includes('customer')) {
        return 'KG이니시스는 고객 정보(이름, 전화번호, 이메일)가 필수입니다.';
      }
      break;
    
    case 'CONTRACT_ERROR':
      return 'KG이니시스와 사전 계약이 필요한 기능입니다. 계약 후 이용해주세요.';
    
    case 'AMOUNT_ERROR':
      return '결제 금액이 유효하지 않습니다. 1원 이상 입력해주세요.';
    
    case 'CARD_ERROR':
      return '카드 정보가 올바르지 않습니다. 다시 확인해주세요.';
    
    case 'MOBILE_ERROR':
      if (errorMessage?.includes('productType')) {
        return '휴대폰 소액결제시 상품 유형(PHYSICAL/DIGITAL)은 필수입니다.';
      }
      break;
    
    default:
      break;
  }

  // 일반적인 에러 처리
  return errorMessage || 'KG이니시스 결제 중 오류가 발생했습니다.';
};
```

#### 💡 KG이니시스 주요 유의사항

1. **PC vs 모바일 차이점**
   - PC: customer 정보(fullName, phoneNumber, email) 필수
   - 모바일: customer 정보는 선택사항
   - bypass 파라미터가 PC용/모바일용으로 분리

2. **ASCII 문자 제한**
   - paymentId, issueId는 ASCII 문자만 허용
   - 한글, 특수문자 사용 불가

3. **사전 계약 필수 기능**
   - API 수기 결제 (카드/가상계좌)
   - API 빌링키 발급
   - 에스크로, 상점분담무이자, 부가세 설정 등

4. **빌링키 특화 사항**
   - 카드 빌링키: `requestIssueBillingKey` 사용
   - 휴대폰 빌링키: `requestIssueBillingKeyAndPay` 사용 (발급+결제 동시)
   - 모바일 빌링키 발급시 `offerPeriod` 필수

5. **가상계좌 제한**
   - 고정식 가상계좌만 지원
   - 미리 전달받은 계좌번호 사용 필수

---

## ⚠️ 보안 주의사항

### 1. API 키 관리
```typescript
// ❌ 절대 금지
const API_SECRET = 'your-api-secret'; // 하드코딩 금지

// ✅ 올바른 방법
const API_SECRET = process.env.PORTONE_API_SECRET;
if (!API_SECRET) {
  throw new Error('PORTONE_API_SECRET is required');
}
```

### 2. 클라이언트 측 검증의 한계
```typescript
// ❌ 위험한 코드 - 클라이언트 결과만 신뢰
if (paymentResult.paymentId) {
  // 결제 완료 처리 (위험!)
}

// ✅ 안전한 코드 - 서버 검증 필수
const verification = await fetch('/api/payment/verify', {
  method: 'POST',
  body: JSON.stringify({ paymentId: paymentResult.paymentId })
});
```

### 3. 중복 결제 방지
```typescript
// 결제 ID 생성 시 충분한 엔트로피 확보
const generateSecurePaymentId = (): string => {
  const timestamp = Date.now();
  const random = crypto.randomBytes(16).toString('hex');
  return `payment-${timestamp}-${random}`;
};
```

---

## 🐛 에러 처리 패턴

### 1. 클라이언트 측 에러 처리
```typescript
try {
  const paymentResult = await PortOne.requestPayment(paymentRequest);
  
  if (paymentResult.code) {
    // 포트원 결제창에서 발생한 에러
    switch (paymentResult.code) {
      case 'FAILURE_TYPE_PG':
        throw new Error(`결제사 오류: ${paymentResult.message}`);
      case 'FAILURE_TYPE_CANCEL':
        throw new Error('사용자가 결제를 취소했습니다.');
      default:
        throw new Error(paymentResult.message || '결제 중 오류가 발생했습니다.');
    }
  }
  
} catch (error) {
  if (error instanceof Error) {
    setErrorMessage(error.message);
  } else {
    setErrorMessage('알 수 없는 오류가 발생했습니다.');
  }
  setPaymentStatus('FAILED');
}
```

### 2. 서버 측 에러 처리
```typescript
export async function action({ request }: ActionFunctionArgs) {
  try {
    // 결제 검증 로직
  } catch (error) {
    console.error('Payment verification error:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      request: {
        url: request.url,
        headers: Object.fromEntries(request.headers),
      },
    });
    
    return json(
      { 
        success: false, 
        message: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        errorCode: 'INTERNAL_SERVER_ERROR'
      },
      { status: 500 }
    );
  }
}
```

---

## 📊 모니터링 및 로깅

### 1. 결제 로그 기록
```typescript
interface IPaymentLog {
  paymentId: string;
  action: 'REQUEST' | 'VERIFY' | 'COMPLETE' | 'FAIL';
  timestamp: Date;
  amount: number;
  userId?: string;
  errorCode?: string;
  errorMessage?: string;
}

const logPaymentEvent = async (log: IPaymentLog) => {
  console.log('Payment Event:', {
    ...log,
    timestamp: log.timestamp.toISOString(),
  });
  
  // 데이터베이스에 로그 저장
  // await db.paymentLog.create({ data: log });
};
```

### 2. 알림 설정
```typescript
const sendPaymentAlert = async (type: 'SUCCESS' | 'FAILURE', paymentId: string) => {
  // Slack, 이메일 등으로 알림 발송
  if (type === 'FAILURE') {
    // 실패 시 즉시 알림
    console.error(`Payment failed: ${paymentId}`);
  }
};
```

---

## 🔄 테스트 가이드

### 1. 테스트 환경 설정
```typescript
// 테스트용 환경변수
process.env.PORTONE_STORE_ID = 'store-test-xxxx';
process.env.PORTONE_CHANNEL_KEY = 'channel-key-test-xxxx';
process.env.PORTONE_API_SECRET = 'test-api-secret';
```

### 2. 단위 테스트 예시
```typescript
describe('Payment Verification', () => {
  it('should verify payment successfully', async () => {
    const mockPaymentData = {
      paymentId: 'test-payment-id',
      expectedAmount: 1000,
      expectedProductId: 'product-1',
    };
    
    const response = await fetch('/api/payment/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mockPaymentData),
    });
    
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.success).toBe(true);
  });
});
```

---

## 🤖 AI 개발자를 위한 프롬프트 엔지니어링 가이드

### 📚 Chain of Thought (단계별 사고) 적용
AI 개발자는 다음 순서로 결제 시스템을 구현해야 합니다:

```
1. 문제 분석 → 2. 아키텍처 설계 → 3. 타입 정의 → 4. 클라이언트 구현 → 5. 서버 구현 → 6. 검증 → 7. 테스트
```

**각 단계별 자가 질문:**
- "어떤 결제 방식이 필요한가? (일반/빌링키/예약)"
- "보안 요구사항은 무엇인가?"
- "어떤 에러 시나리오가 있을까?"
- "데이터 무결성을 어떻게 보장할까?"

### 🎯 Few-shot Learning (예제 기반 학습)
**올바른 구현 패턴:**
```typescript
// ✅ 올바른 패턴 - 서버 검증 필수
const handlePayment = async () => {
  const clientResult = await PortOne.requestPayment(request);
  const serverVerification = await fetch('/api/payment/verify', {
    body: JSON.stringify({ paymentId: clientResult.paymentId })
  });
  // 서버 검증 결과로 최종 판단
};
```

**잘못된 구현 패턴:**
```typescript
// ❌ 잘못된 패턴 - 클라이언트 결과만 신뢰
const handlePayment = async () => {
  const result = await PortOne.requestPayment(request);
  if (result.paymentId) {
    // 바로 결제 완료 처리 (위험!)
  }
};
```

### 🚨 Constraint-based Prompting (제약 기반)
**필수 제약사항을 명령형으로 지시:**
- "MUST: 모든 결제는 서버에서 재검증할 것"
- "NEVER: 클라이언트 결과만으로 결제 완료 처리 금지"
- "ALWAYS: 환경변수로 API 키 관리할 것"
- "REQUIRED: paymentId 고유성 보장할 것"

### 🔄 Error Prevention (에러 방지)
**일반적인 실수와 해결책:**

1. **실수:** 중복 결제 처리 누락
   **해결:** paymentId 중복 체크 로직 필수 구현

2. **실수:** 웹훅 서명 검증 생략
   **해결:** crypto 모듈로 HMAC 서명 검증 필수

3. **실수:** 결제 금액 조작 가능
   **해결:** 서버에서 예상 금액과 실제 금액 비교 필수

### 💡 Implementation Strategy (구현 전략)
**1단계: 기본 결제부터 시작**
```
일반 결제 → 리다이렉트 처리 → 빌링키 발급 → 빌링키 결제 → 예약/반복 결제
```

**2단계: 점진적 복잡성 증가**
- 먼저 테스트 환경에서 기본 플로우 구현
- 에러 처리와 검증 로직 추가
- 빌링키와 구독 기능 확장
- 모니터링과 알림 시스템 추가

**3단계: 보안 강화**
- 모든 입력값 검증 추가
- 로깅과 감사 추적 구현
- 접근 권한 및 인증 강화

### 🔍 Verification Checklist (검증 체크리스트)
AI 개발자는 구현 후 다음을 반드시 확인:

```typescript
// 자체 검증 코드 패턴
const verifyImplementation = () => {
  console.log("✅ 서버 측 결제 검증 구현됨?");
  console.log("✅ 환경변수로 API 키 관리됨?");
  console.log("✅ 에러 핸들링 모든 경로에 구현됨?");
  console.log("✅ 웹훅 서명 검증 구현됨?");
  console.log("✅ 중복 결제 방지 로직 구현됨?");
};
```

### 🧠 Meta-Prompting (메타 프롬프팅)
**구현 전 자가 점검 질문:**
1. "이 코드가 실제 운영환경에서 안전할까?"
2. "사용자가 악의적으로 조작할 수 있는 부분은 없을까?"
3. "결제 실패 시나리오를 모두 고려했을까?"
4. "로그와 모니터링으로 문제 추적이 가능할까?"
5. "이 구현이 PCI DSS 등 보안 기준에 부합할까?"

### 📖 Context Learning (컨텍스트 학습)
**결제 시스템의 핵심 개념 이해:**
- **결제 상태:** `PENDING` → `PAID` → `COMPLETE`
- **빌링키 생명주기:** `발급` → `활성` → `만료/삭제`
- **웹훅 처리:** `수신` → `검증` → `처리` → `응답`
- **구독 관리:** `생성` → `갱신` → `일시정지` → `취소`

**나이스페이먼츠 특화 개념:**
- **신모듈 vs 구모듈:** V2는 반드시 신모듈 사용
- **주문명 제한:** 40Byte + 특수문자 제한
- **다이렉트 호출:** 카드사별 지원 차이
- **간편결제 특화:** 카카오페이/네이버페이/SSG페이별 차이점
- **면세/복합과세:** 계약에 따른 필수 파라미터
- **사전 계약:** 기능별 계약 필요성

### 🎯 나이스페이먼츠 특화 프롬프트 패턴

**올바른 나이스페이먼츠 구현 패턴:**
```typescript
// ✅ 올바른 패턴 - 나이스페이먼츠 특화 검증
const validateNicePayRequest = (request: any) => {
  // 주문명 검증
  if (request.orderName.length > 40) {
    throw new Error('주문명은 40Byte 이내로 입력해주세요.');
  }
  
  // 휴대폰 소액결제시 상품 유형 필수
  if (request.payMethod === 'MOBILE' && !request.productType) {
    throw new Error('휴대폰 소액결제시 상품 유형(productType)은 필수입니다.');
  }
  
  // 가상계좌시 입금 기한 필수
  if (request.payMethod === 'VIRTUAL_ACCOUNT' && !request.virtualAccount?.accountExpiry) {
    throw new Error('가상계좌 발급시 입금 기한(accountExpiry)은 필수입니다.');
  }
};
```

**잘못된 나이스페이먼츠 구현 패턴:**
```typescript
// ❌ 잘못된 패턴 - 나이스페이먼츠 특화 검증 누락
const paymentRequest = {
  orderName: "매우 긴 주문명입니다. 이 주문명은 40바이트를 초과할 수 있습니다.", // 위험!
  payMethod: 'MOBILE', // productType 누락 - 에러 발생!
  payMethod: 'VIRTUAL_ACCOUNT', // accountExpiry 누락 - 에러 발생!
};
```

### 🔍 나이스페이먼츠 디버깅 가이드

**일반적인 나이스페이먼츠 에러와 해결책:**

1. **"CPID미설정 오류입니다"**
   ```typescript
   // 원인: 휴대폰 소액결제 상품 유형과 상점 설정 불일치
   // 해결: productType과 상점 설정을 일치시키기
   ```

2. **"나이스페이 V2 휴대폰 소액결제시 상품 유형 파라미터는 필수 입력입니다"**
   ```typescript
   // 원인: productType 파라미터 누락
   // 해결: 'PHYSICAL' 또는 'DIGITAL' 명시적 설정
   ```

3. **"결제창 호출에 실패하였습니다"**
   ```typescript
   // 원인: 다양한 파라미터 설정 오류
   // 해결: 나이스페이먼츠 특화 파라미터 재확인
   ```

### 💡 나이스페이먼츠 AI 개발 전략

**단계별 나이스페이먼츠 구현:**
```
1. 기본 카드 결제 구현 → 2. 가상계좌 추가 → 3. 간편결제 추가 → 4. 빌링키 구현 → 5. 특화 기능 확장
```

**나이스페이먼츠 구현시 자가 점검:**
```typescript
const nicePaySelfCheck = () => {
  console.log("✅ 나이스페이먼츠(신모듈) 채널로 설정됨?");
  console.log("✅ 주문명 40Byte 제한 검증 구현됨?");
  console.log("✅ 결제수단별 필수 파라미터 검증됨?");
  console.log("✅ 간편결제별 특화 옵션 구현됨?");
  console.log("✅ 면세/복합과세 설정 확인됨?");
  console.log("✅ 사전 계약 필요 기능 확인됨?");
};

### 🎯 KG이니시스 특화 프롬프트 패턴

**올바른 KG이니시스 구현 패턴:**
```typescript
// ✅ 올바른 패턴 - KG이니시스 특화 검증
const validateInicisRequest = (request: any) => {
  // paymentId ASCII 문자 검증
  const asciiRegex = /^[\x00-\x7F]*$/;
  if (!asciiRegex.test(request.paymentId)) {
    throw new Error('KG이니시스는 paymentId에 ASCII 문자만 허용됩니다.');
  }
  
  // PC 환경에서 고객 정보 필수
  if (request.customer && (!request.customer.fullName || !request.customer.phoneNumber || !request.customer.email)) {
    throw new Error('KG이니시스 PC 결제시 고객 정보(이름, 전화번호, 이메일)가 필수입니다.');
  }
  
  // 빌링키 발급시 issueId, issueName 필수
  if (request.billingKeyMethod && (!request.issueId || !request.issueName)) {
    throw new Error('KG이니시스 빌링키 발급시 issueId와 issueName은 필수입니다.');
  }
  
  // 휴대폰 빌링키 발급시 offerPeriod 필수
  if (request.billingKeyMethod === 'MOBILE' && !request.offerPeriod) {
    throw new Error('KG이니시스 휴대폰 빌링키 발급시 offerPeriod는 필수입니다.');
  }
};
```

**잘못된 KG이니시스 구현 패턴:**
```typescript
// ❌ 잘못된 패턴 - KG이니시스 특화 검증 누락
const paymentRequest = {
  paymentId: "결제-한글-아이디", // 위험! ASCII 문자만 허용
  customer: {
    fullName: "", // 위험! PC 환경에서 필수
  },
  billingKeyMethod: 'CARD', // issueId, issueName 누락 - 에러 발생!
  billingKeyMethod: 'MOBILE', // offerPeriod 누락 - 에러 발생!
};
```

### 🔍 KG이니시스 디버깅 가이드

**일반적인 KG이니시스 에러와 해결책:**

1. **"결제ID는 ASCII 문자만 사용 가능합니다"**
   ```typescript
   // 원인: paymentId/issueId에 한글, 특수문자 포함
   // 해결: 영문, 숫자, 기본 특수문자만 사용
   const generateValidPaymentId = () => {
     return `inicis-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
   };
   ```

2. **"고객 정보가 필요합니다"**
   ```typescript
   // 원인: PC 환경에서 fullName, phoneNumber, email 누락
   // 해결: customer 객체에 모든 필수 정보 포함
   customer: {
     fullName: "홍길동", // 필수
     phoneNumber: "010-1234-5678", // 필수
     email: "customer@example.com", // 필수
   }
   ```

3. **"빌링키 발급 정보가 부족합니다"**
   ```typescript
   // 원인: issueId, issueName 누락
   // 해결: 빌링키 발급시 반드시 포함
   billingKeyRequest: {
     issueId: generateValidIssueId(), // 필수
     issueName: "정기결제 빌링키", // 필수
   }
   ```

4. **"사전 계약이 필요한 기능입니다"**
   ```typescript
   // 원인: API 수기결제, 빌링키 발급 등 미계약 기능 사용
   // 해결: KG이니시스와 사전 계약 완료 후 사용
   ```

### 💡 KG이니시스 AI 개발 전략

**단계별 KG이니시스 구현:**
```
1. 결제창 일반 결제 → 2. PC/모바일 최적화 → 3. 빌링키 발급 → 4. API 수기결제 → 5. 고급 기능 확장
```

**KG이니시스 구현시 자가 점검:**
```typescript
const inicisPaySelfCheck = () => {
  console.log("✅ KG이니시스 채널로 설정됨?");
  console.log("✅ paymentId/issueId ASCII 문자 제한 준수됨?");
  console.log("✅ PC 환경 고객 정보 필수 입력 구현됨?");
  console.log("✅ 빌링키 발급 필수 파라미터 검증됨?");
  console.log("✅ 가상계좌 고정식 처리 구현됨?");
  console.log("✅ 사전 계약 필요 기능 확인됨?");
  console.log("✅ PC/모바일 환경별 차이점 고려됨?");
};
```

---

## 🏁 최종 정리

이 CursorRule을 따라 구현하면 **프로덕션 수준의 안전하고 신뢰할 수 있는 포트원 V2 결제 시스템**을 Remix에서 구축할 수 있습니다. 

**핵심 성공 요인:**
1. **보안 우선**: 모든 결제는 서버에서 재검증
2. **단계별 접근**: 기본 기능부터 고급 기능까지 점진적 구현
3. **철저한 테스트**: 모든 시나리오에 대한 테스트 수행
4. **지속적 모니터링**: 운영 중 이슈 감지 및 대응 체계 구축
5. **PG사별 특화**: 나이스페이먼츠, KG이니시스, 카카오페이, 네이버페이 등 각 결제대행사별 특화 구현

**나이스페이먼츠 연동시 추가 주의사항:**
- ⚠️ **신모듈 필수**: V2 사용시 반드시 나이스페이먼츠(신모듈) 선택
- 📝 **주문명 제한**: 40Byte 이내, 특수문자 사용 제한
- 🔒 **사전 계약**: 면세/복합과세, 할부, 에스크로 등 사전 계약 필수
- 📱 **간편결제 특화**: 카카오페이/네이버페이/SSG페이별 차이점 숙지
- 💳 **결제수단별 필수값**: 가상계좌(입금기한), 휴대폰(상품유형) 등

**KG이니시스 연동시 추가 주의사항:**
- 🔤 **ASCII 문자 제한**: paymentId/issueId는 반드시 ASCII 문자만 사용
- 💻 **PC/모바일 차이**: PC 환경에서는 고객 정보(이름, 전화번호, 이메일) 필수
- 🔑 **빌링키 필수값**: issueId, issueName은 빌링키 발급시 반드시 필요
- 📞 **휴대폰 빌링키**: requestIssueBillingKeyAndPay 사용시 발급+결제 동시 진행
- 🏦 **가상계좌 제한**: 고정식만 지원, 미리 전달받은 계좌번호 필요
- 📋 **사전 계약**: API 수기결제, 빌링키 발급, 에스크로 등 사전 계약 필수

각 단계를 정확히 따르고, 보안 검증과 PG사별 특화 사항을 빠뜨리지 않도록 주의하세요. **결제 시스템은 신뢰성이 생명입니다.**

---
