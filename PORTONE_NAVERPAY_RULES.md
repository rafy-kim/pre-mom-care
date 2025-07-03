### 6.4 네이버페이(결제형) 연동 가이드

네이버페이(결제형)는 포트원 V2에서 지원하는 간편결제 서비스로, 다양한 결제 수단을 통합 제공합니다.

#### 📋 네이버페이 채널 설정

포트원 콘솔에서 네이버페이(결제형) 채널을 설정하고 생성된 채널 키를 환경변수에 추가합니다.

```typescript
// 환경변수에 네이버페이 채널 키 설정
PORTONE_NAVERPAY_CHANNEL_KEY=channel-key-9987cb87-6458-4888-b94e-68d9a2da896d
```

#### 💳 네이버페이 지원 결제수단

| 결제 방식 | payMethod/billingKeyMethod | 비고 |
|-----------|---------------------------|------|
| **간편 결제** | `EASY_PAY` | 유일한 결제 방식 |
| **빌링키 발급** | `EASY_PAY` | 간편결제 방식으로만 발급 |

**결제창 내 선택 가능 수단**: 카드, 계좌이체, 네이버페이 머니 충전식 결제

#### 🔧 네이버페이 특화 구현

##### 네이버페이 결제 컴포넌트 (app/components/payment/NaverPayForm.tsx)
```typescript
import { useState } from 'react';
import PortOne from '@portone/browser-sdk/v2';
import type { IPaymentRequest, ICustomer } from '~/types';

interface INaverPayFormProps {
  storeId: string;
  channelKey: string;
  amount: number;
  orderName: string;
  isHighRiskBusiness?: boolean; // 고위험 업종 여부
}

// 네이버페이 특화 인터페이스
interface INaverPayRequest extends IPaymentRequest {
  payMethod: 'EASY_PAY'; // 네이버페이는 간편결제만 지원
  windowType?: {
    pc: 'POPUP';
    mobile: 'REDIRECTION';
  };
  locale?: 'KO_KR'; // 한국어만 지원
  currency: 'KRW'; // 원화만 지원
  bypass?: {
    naverpay?: {
      useCfmYmdt?: string; // 이용완료일 (YYYYMMDD)
      productItems?: Array<{
        categoryType: string;
        categoryId: string;
        uid: string;
        name: string;
        payReferrer: string;
        startDate: string;
        endDate: string;
        sellerId: string;
        count: number;
      }>;
      deliveryFee?: number; // 배송비
    };
  };
}

export function NaverPayForm({ 
  storeId, 
  channelKey, 
  amount, 
  orderName,
  isHighRiskBusiness = false 
}: INaverPayFormProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<ICustomer>({
    fullName: '',
    birthYear: '',
    birthMonth: '',
    birthDay: '',
  });
  const [useCfmYmdt, setUseCfmYmdt] = useState<string>('');
  const [deliveryFee, setDeliveryFee] = useState<number>(0);

  const generatePaymentId = (): string => {
    return `naverpay-${Date.now()}-${crypto.randomUUID()}`;
  };

  const validateNaverPayRequest = (): boolean => {
    // 100원 미만 결제 체크
    if (amount < 100) {
      alert('네이버페이는 100원 이상 결제만 가능합니다.');
      return false;
    }

    // 고위험 업종일 경우 고객 정보 필수
    if (isHighRiskBusiness) {
      if (!customerInfo.fullName || !customerInfo.birthYear || !customerInfo.birthMonth || !customerInfo.birthDay) {
        alert('고위험 업종의 경우 고객 정보(이름, 생년월일)가 필수입니다.');
        return false;
      }
    }

    return true;
  };

  const handleNaverPayPayment = async () => {
    if (!validateNaverPayRequest()) return;

    setIsProcessing(true);

    try {
      const paymentId = generatePaymentId();
      
      const paymentRequest: INaverPayRequest = {
        storeId,
        channelKey,
        paymentId,
        orderName, // 네이버페이는 자동으로 "외 2개" 표현 생성
        totalAmount: amount,
        currency: 'KRW', // 네이버페이는 원화만 지원
        payMethod: 'EASY_PAY', // 네이버페이는 간편결제만 지원
        
        // 네이버페이 창 타입 (자동 설정됨)
        windowType: {
          pc: 'POPUP',
          mobile: 'REDIRECTION',
        },
        
        // 한국어만 지원
        locale: 'KO_KR',
        
        // 고위험 업종일 경우 고객 정보 필수
        ...(isHighRiskBusiness && {
          customer: {
            fullName: customerInfo.fullName,
            birthYear: customerInfo.birthYear,
            birthMonth: customerInfo.birthMonth,
            birthDay: customerInfo.birthDay,
          },
        }),
        
        // 네이버페이 특화 파라미터
        bypass: {
          naverpay: {
            // 이용완료일 (필요시)
            ...(useCfmYmdt && {
              useCfmYmdt,
            }),
            
            // 상품 정보 (네이버페이 특화)
            productItems: [
              {
                categoryType: 'GENERAL',
                categoryId: 'GENERAL_PRODUCT',
                uid: `product-${Date.now()}`,
                name: orderName.split(' ')[0], // 첫 번째 상품명 권장
                payReferrer: 'NAVER_BOOK',
                startDate: new Date().toISOString().slice(0, 10).replace(/-/g, ''),
                endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10).replace(/-/g, ''),
                sellerId: 'default-seller',
                count: 1,
              },
            ],
            
            // 배송비 (필요시)
            ...(deliveryFee > 0 && {
              deliveryFee,
            }),
          },
        },
      };

      const paymentResult = await PortOne.requestPayment(paymentRequest);

      if (paymentResult.code) {
        // 네이버페이 에러 메시지는 가공 없이 그대로 표시
        throw new Error(paymentResult.message || '네이버페이 결제 실패');
      }

      // 서버 검증
      const verificationResponse = await fetch('/api/payment/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: paymentResult.paymentId,
          expectedAmount: amount,
          pgProvider: 'NAVERPAY',
        }),
      });

      const result = await verificationResponse.json();
      
      if (result.success) {
        alert('네이버페이 결제가 완료되었습니다!');
      } else {
        throw new Error(result.message);
      }

    } catch (error) {
      console.error('NaverPay payment error:', error);
      // 네이버페이 에러는 가공 없이 그대로 표시
      alert(error instanceof Error ? error.message : '결제 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="naverpay-form">
      <h3>네이버페이 결제</h3>
      
      {/* 고위험 업종일 경우 고객 정보 입력 */}
      {isHighRiskBusiness && (
        <div className="customer-info">
          <h4>고객 정보 (고위험 업종 필수)</h4>
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
          
          <div className="birth-group">
            <div className="form-group">
              <label htmlFor="birthYear">출생년도 *</label>
              <input
                id="birthYear"
                type="text"
                value={customerInfo.birthYear}
                onChange={(e) => setCustomerInfo(prev => ({ ...prev, birthYear: e.target.value }))}
                placeholder="YYYY"
                maxLength={4}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="birthMonth">출생월 *</label>
              <input
                id="birthMonth"
                type="text"
                value={customerInfo.birthMonth}
                onChange={(e) => setCustomerInfo(prev => ({ ...prev, birthMonth: e.target.value }))}
                placeholder="MM"
                maxLength={2}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="birthDay">출생일 *</label>
              <input
                id="birthDay"
                type="text"
                value={customerInfo.birthDay}
                onChange={(e) => setCustomerInfo(prev => ({ ...prev, birthDay: e.target.value }))}
                placeholder="DD"
                maxLength={2}
                required
              />
            </div>
          </div>
        </div>
      )}

      {/* 이용완료일 설정 */}
      <div className="form-group">
        <label htmlFor="useCfmYmdt">이용완료일 (선택사항)</label>
        <input
          id="useCfmYmdt"
          type="date"
          value={useCfmYmdt}
          onChange={(e) => setUseCfmYmdt(e.target.value.replace(/-/g, ''))}
          placeholder="YYYYMMDD"
        />
        <small>상품 유형에 따라 네이버페이-고객사 간 필수값으로 계약되는 경우 입력</small>
      </div>

      {/* 배송비 설정 */}
      <div className="form-group">
        <label htmlFor="deliveryFee">배송비</label>
        <input
          id="deliveryFee"
          type="number"
          value={deliveryFee}
          onChange={(e) => setDeliveryFee(Number(e.target.value))}
          placeholder="배송비 (선택사항)"
          min="0"
        />
      </div>

      <button
        onClick={handleNaverPayPayment}
        disabled={isProcessing}
        className="payment-button naverpay"
      >
        {isProcessing ? '네이버페이 결제 진행 중...' : '네이버페이로 결제하기'}
      </button>
      
      <div className="naverpay-notice">
        <h5>⚠️ 네이버페이 주의사항</h5>
        <ul>
          <li>간편결제(EASY_PAY)만 지원됩니다</li>
          <li>PC는 POPUP, 모바일은 REDIRECTION만 지원됩니다</li>
          <li>한국어(KO_KR)와 원화(KRW)만 지원됩니다</li>
          <li>100원 미만 결제는 불가능합니다</li>
          <li>에러 메시지는 가공 없이 그대로 표시해야 합니다</li>
          <li>고위험 업종일 경우 고객 정보(이름, 생년월일) 필수</li>
          <li>할부, 카드사 제한 기능은 지원하지 않습니다</li>
        </ul>
      </div>
    </div>
  );
}
```

#### 🚨 네이버페이 특화 주의사항

##### MUST DO (네이버페이 필수사항)
1. **간편결제만 사용**: `payMethod`를 `EASY_PAY`로만 설정
2. **원화 결제만**: `currency`를 `KRW`로만 설정
3. **100원 이상**: 최소 결제 금액 100원 이상
4. **에러 메시지 비가공**: 에러 메시지를 가공 없이 그대로 표시
5. **고위험 업종**: 고객 정보(이름, 생년월일) 필수 입력
6. **빌링키 발급**: `issueId`, `issueName` 필수 입력

##### NEVER DO (네이버페이 금지사항)
1. **100원 미만 결제**: 최소 결제 금액 미충족
2. **에러 메시지 가공**: "결제에 실패하였습니다. 실패 사유: " + 원본 메시지 형태 금지
3. **할부 설정**: `installment` 파라미터 사용 불가
4. **카드사 제한**: `availableCards` 파라미터 사용 불가

---
