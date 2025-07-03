### 6.3 카카오페이 연동 가이드

카카오페이는 포트원 V2에서 지원하는 대표적인 간편결제 서비스로, 국내 최대 규모의 사용자를 보유하고 있습니다.

#### 📋 카카오페이 채널 설정

포트원 콘솔에서 카카오페이 채널을 설정하고 생성된 채널 키를 환경변수에 추가합니다.

```typescript
// 환경변수에 카카오페이 채널 키 설정
PORTONE_KAKAOPAY_CHANNEL_KEY=channel-key-9987cb87-6458-4888-b94e-68d9a2da896d
```

#### 💳 카카오페이 지원 결제수단

| 결제 방식 | payMethod/billingKeyMethod | 비고 |
|-----------|---------------------------|------|
| **간편 결제** | `EASY_PAY` | 유일한 결제 방식 |
| **빌링키 발급** | `EASY_PAY` | 간편결제 방식으로만 발급 |

**⚠️ 중요**: 카카오페이는 간편결제(`EASY_PAY`)만 지원하며, 다른 결제 방식은 사용할 수 없습니다.

#### 🔧 카카오페이 특화 구현

##### 카카오페이 결제 컴포넌트 (app/components/payment/KakaoPayForm.tsx)
```typescript
import { useState } from 'react';
import PortOne from '@portone/browser-sdk/v2';
import type { IPaymentRequest } from '~/types';

interface IKakaoPayFormProps {
  storeId: string;
  channelKey: string;
  amount: number;
  orderName: string;
}

// 카카오페이 특화 인터페이스
interface IKakaoPayRequest extends IPaymentRequest {
  payMethod: 'EASY_PAY'; // 카카오페이는 간편결제만 지원
  windowType?: {
    pc: 'IFRAME';
    mobile: 'REDIRECTION';
  };
  locale?: 'KO_KR'; // 한국어만 지원
  currency: 'KRW'; // 원화만 지원
  bypass?: {
    kakaopay?: {
      custom_message?: string; // 사전 협의 필요
    };
  };
  easyPay?: {
    availableCards?: string[]; // 카드사 제한
    installment?: {
      monthOption?: {
        fixedMonth?: number; // 고정 할부만 지원
      };
    };
  };
}

export function KakaoPayForm({ storeId, channelKey, amount, orderName }: IKakaoPayFormProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [installmentMonth, setInstallmentMonth] = useState<number>(0);
  const [customMessage, setCustomMessage] = useState<string>('');

  const generatePaymentId = (): string => {
    return `kakaopay-${Date.now()}-${crypto.randomUUID()}`;
  };

  const handleKakaoPayPayment = async () => {
    // 카카오페이 특화 검증
    if (amount < 100) {
      alert('카카오페이는 100원 이상 결제만 가능합니다.');
      return;
    }

    setIsProcessing(true);

    try {
      const paymentId = generatePaymentId();
      
      const paymentRequest: IKakaoPayRequest = {
        storeId,
        channelKey,
        paymentId,
        orderName,
        totalAmount: amount,
        currency: 'KRW', // 카카오페이는 원화만 지원
        payMethod: 'EASY_PAY', // 카카오페이는 간편결제만 지원
        
        // 카카오페이 창 타입 (자동 설정됨)
        windowType: {
          pc: 'IFRAME',
          mobile: 'REDIRECTION',
        },
        
        // 한국어만 지원
        locale: 'KO_KR',
        
        // 카카오페이 특화 옵션
        ...(customMessage && {
          bypass: {
            kakaopay: {
              custom_message: customMessage, // 사전 협의 필요
            },
          },
        }),
        
        easyPay: {
          // 카드사 제한 (선택사항)
          ...(selectedCards.length > 0 && {
            availableCards: selectedCards,
          }),
          
          // 할부 설정 (고정 할부만 지원)
          ...(installmentMonth > 0 && {
            installment: {
              monthOption: {
                fixedMonth: installmentMonth,
              },
            },
          }),
        },
      };

      const paymentResult = await PortOne.requestPayment(paymentRequest);

      if (paymentResult.code) {
        throw new Error(`카카오페이 결제 실패: ${paymentResult.message}`);
      }

      // 서버 검증
      const verificationResponse = await fetch('/api/payment/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: paymentResult.paymentId,
          expectedAmount: amount,
          pgProvider: 'KAKAOPAY',
        }),
      });

      const result = await verificationResponse.json();
      
      if (result.success) {
        alert('카카오페이 결제가 완료되었습니다!');
      } else {
        throw new Error(result.message);
      }

    } catch (error) {
      console.error('KakaoPay payment error:', error);
      alert(error instanceof Error ? error.message : '결제 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="kakaopay-form">
      <h3>카카오페이 결제</h3>
      
      {/* 카드사 제한 설정 */}
      <div className="form-group">
        <label>사용 가능한 카드사 제한 (선택사항)</label>
        <div className="card-selection">
          {[
            { code: 'CARD_COMPANY_SHINHAN_CARD', name: '신한카드' },
            { code: 'CARD_COMPANY_KOOKMIN_CARD', name: 'KB국민카드' },
            { code: 'CARD_COMPANY_HYUNDAI_CARD', name: '현대카드' },
            { code: 'CARD_COMPANY_LOTTE_CARD', name: '롯데카드' },
            { code: 'CARD_COMPANY_SAMSUNG_CARD', name: '삼성카드' },
            { code: 'CARD_COMPANY_NH_CARD', name: 'NH농협카드' },
            { code: 'CARD_COMPANY_BC_CARD', name: 'BC카드' },
            { code: 'CARD_COMPANY_HANA_CARD', name: '하나카드' },
            { code: 'CARD_COMPANY_CITI_CARD', name: '시티카드' },
            { code: 'CARD_COMPANY_KAKAO_BANK', name: '카카오뱅크카드' },
          ].map((card) => (
            <label key={card.code}>
              <input
                type="checkbox"
                checked={selectedCards.includes(card.code)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedCards(prev => [...prev, card.code]);
                  } else {
                    setSelectedCards(prev => prev.filter(c => c !== card.code));
                  }
                }}
              />
              {card.name}
            </label>
          ))}
        </div>
      </div>

      {/* 할부 설정 */}
      <div className="form-group">
        <label htmlFor="installment">할부 설정</label>
        <select
          id="installment"
          value={installmentMonth}
          onChange={(e) => setInstallmentMonth(Number(e.target.value))}
        >
          <option value={0}>일시불</option>
          <option value={2}>2개월</option>
          <option value={3}>3개월</option>
          <option value={6}>6개월</option>
          <option value={12}>12개월</option>
        </select>
        <small>카카오페이는 고정 할부만 지원합니다. 5만원 미만일 경우 체크카드 결제 불가능</small>
      </div>

      {/* 커스텀 메시지 (사전 협의 필요) */}
      <div className="form-group">
        <label htmlFor="customMessage">안내 문구 (카카오페이와 사전 협의 필요)</label>
        <input
          id="customMessage"
          type="text"
          value={customMessage}
          onChange={(e) => setCustomMessage(e.target.value)}
          placeholder="결제창에 표시될 사용자 정의 문구"
        />
      </div>

      <button
        onClick={handleKakaoPayPayment}
        disabled={isProcessing}
        className="payment-button kakaopay"
      >
        {isProcessing ? '카카오페이 결제 진행 중...' : '카카오페이로 결제하기'}
      </button>
      
      <div className="kakaopay-notice">
        <h5>⚠️ 카카오페이 주의사항</h5>
        <ul>
          <li>간편결제(EASY_PAY)만 지원됩니다</li>
          <li>PC는 IFRAME, 모바일은 REDIRECTION만 지원됩니다</li>
          <li>한국어(KO_KR)와 원화(KRW)만 지원됩니다</li>
          <li>에스크로, 문화비, 상품유형 등은 지원하지 않습니다</li>
          <li>할부는 고정 개월수만 지원합니다</li>
          <li>5만원 미만 할부 설정시 체크카드 결제 불가능</li>
        </ul>
      </div>
    </div>
  );
}
```

#### 🚨 카카오페이 특화 주의사항

##### MUST DO (카카오페이 필수사항)
1. **간편결제만 사용**: `payMethod`를 `EASY_PAY`로만 설정
2. **원화 결제만**: `currency`를 `KRW`로만 설정
3. **빌링키 발급**: `issueName` 필수 입력
4. **창 타입 준수**: PC(`IFRAME`), Mobile(`REDIRECTION`)만 지원

##### NEVER DO (카카오페이 금지사항)
1. **다른 결제 방식**: 카드, 계좌이체, 가상계좌 등 사용 불가
2. **다른 통화**: USD, EUR 등 원화 외 통화 사용 불가
3. **에스크로 설정**: 지원하지 않음
4. **문화비 설정**: 지원하지 않음
5. **무이자 할부**: `freeInstallmentPlans` 사용 불가

---
