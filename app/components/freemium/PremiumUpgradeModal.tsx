import React, { useState } from "react";
import { useUser } from "@clerk/remix";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { 
  Check, Crown, LogIn, Loader2, AlertCircle, CreditCard 
} from "lucide-react";
import { IPremiumUpgradeModalProps } from "types";
import CardBillingPayment from "./CardBillingPayment";

// 🎯 플랜 정보
const PLANS = {
  ONETIME: {
    id: "premium-onetime",
    name: "1개월 이용권",
    price: 2500,
    billingPeriod: "one_time",
    features: [
      "무제한 AI 질문",
      "개인화된 맞춤 답변", 
      "1개월간 모든 기능 이용",
      "자동결제 없음 - 안심!"
    ]
  },
  MONTHLY: {
    id: "premium-monthly", 
    name: "프리미엄 월간 구독",
    price: 2000,
    billingPeriod: "monthly",
    features: [
      "무제한 AI 질문",
      "개인화된 맞춤 답변",
      "모든 대화 기록 영구 보관",
      "월 200원 절약!"
    ]
  }
};

export function PremiumUpgradeModal({ 
  isOpen, 
  onClose, 
  onLogin
}: IPremiumUpgradeModalProps): JSX.Element {
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBillingModal, setShowBillingModal] = useState(false);

  // 로그인되지 않은 경우
  if (!user) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-11/12 max-w-lg">
          <DialogHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <LogIn className="h-12 w-12 text-blue-600" />
            </div>
            <DialogTitle className="text-xl font-bold">
              로그인이 필요합니다
            </DialogTitle>
            <DialogDescription>
              프리미엄 서비스를 이용하려면 먼저 로그인해주세요.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="flex flex-col gap-2">
            <Button 
              onClick={onLogin}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <LogIn className="h-4 w-4 mr-2" />
              로그인하기
            </Button>
            <Button 
              onClick={onClose}
              variant="outline"
              className="w-full"
            >
              취소
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // 단건결제 처리
  const handleOneTimePayment = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🚀 단건결제 시작...');
      
      const response = await fetch('/api/payment/one-time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: PLANS.ONETIME.id,
          customerEmail: user.emailAddresses[0]?.emailAddress || '',
          customerName: user.fullName || '사용자'
        })
      });

      const result = await response.json();
      console.log('📋 API 응답:', result);

      if (result.success && result.data) {
        // 포트원 SDK 상태 확인
        const checkPortOneSDK = () => {
          const hasPortOneSDK = typeof (window as any).PortOneSDK !== 'undefined';
          const hasRequestPayment = hasPortOneSDK && typeof (window as any).PortOneSDK.requestPayment === 'function';
          
          console.log('🔍 PortOne SDK 상태:', {
            hasPortOneSDK,
            hasRequestPayment,
            PortOneSDK: (window as any).PortOneSDK,
            type: typeof (window as any).PortOneSDK
          });
          
          return hasRequestPayment;
        };

        // SDK 로드 확인 및 결제창 열기
        const openPaymentWindow = async () => {
          console.log('💳 결제창 열기 시도...');
          
          // SDK 로드 대기 (최대 10초)
          let attempts = 0;
          const maxAttempts = 100; // 10초 (100ms * 100)
          
          while (attempts < maxAttempts) {
            if (checkPortOneSDK()) {
              console.log('✅ PortOne SDK 로드 완료');
              break;
            }
            
            console.log(`⏳ SDK 로딩 대기 중... (${attempts + 1}/${maxAttempts})`);
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
          }

          if (!checkPortOneSDK()) {
            throw new Error('PortOne SDK 로딩 실패: 타임아웃');
          }

          // 결제창이 열리기 전에 현재 모달 닫기 (z-index 충돌 방지)
          onClose();

          // 결제 데이터 준비 (PortOne V2 형식에 맞춤)
          const paymentData = {
            storeId: result.data.storeId,
            channelKey: result.data.channelKey,
            paymentId: result.data.paymentId,
            orderName: result.data.orderName,
            totalAmount: result.data.totalAmount,
            currency: "CURRENCY_KRW", // PortOne V2에서는 CURRENCY_ 접두사 필요
            payMethod: "CARD",
            customer: {
              fullName: result.data.customer.fullName,
              email: result.data.customer.email,
            }
          };

          console.log('💰 결제 데이터 (V2 형식):', paymentData);

          // 모달이 닫히는 시간을 기다린 후 결제창 열기
          await new Promise(resolve => setTimeout(resolve, 200));

          try {
            const paymentResponse = await (window as any).PortOneSDK.requestPayment(paymentData);
            console.log('🎯 결제 응답:', paymentResponse);

            if (paymentResponse.code != null) {
              // 에러 발생
              console.error('❌ 결제 실패:', paymentResponse);
              alert(`결제 실패: ${paymentResponse.message || '알 수 없는 오류'}`);
            } else {
              // 결제 성공 - confirm API 호출
              console.log('🎉 결제 성공! 승인 처리 시작...');
              
              try {
                const confirmResponse = await fetch('/api/payment/confirm', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    paymentId: paymentResponse.paymentId,
                    orderId: result.data.customData.orderId,
                    amount: result.data.totalAmount
                  })
                });

                const confirmResult = await confirmResponse.json();
                console.log('📋 결제 승인 응답:', confirmResult);

                if (confirmResult.success) {
                  console.log('✅ 결제 승인 완료! 프리미엄 권한 활성화됨');
                  alert('결제가 완료되었습니다! 프리미엄 기능을 이용해보세요.');
                  // 페이지 새로고침하여 권한 반영
                  window.location.reload();
                } else {
                  console.error('❌ 결제 승인 실패:', confirmResult.error);
                  alert(`결제는 완료되었으나 승인 처리에 실패했습니다: ${confirmResult.error}`);
                }
              } catch (confirmError) {
                console.error('💥 결제 승인 API 호출 오류:', confirmError);
                alert('결제는 완료되었으나 승인 처리 중 오류가 발생했습니다. 고객센터에 문의해주세요.');
              }
            }
          } catch (paymentError) {
            console.error('💥 결제 실행 중 오류:', paymentError);
            alert(`결제 처리 중 오류가 발생했습니다: ${paymentError instanceof Error ? paymentError.message : '알 수 없는 오류'}`);
          }
        };

        await openPaymentWindow();
      } else {
        console.error('❌ API 오류:', result);
        alert(result.error || '결제 요청 중 오류가 발생했습니다.');
      }
    } catch (err) {
      console.error('💥 결제 처리 오류:', err);
      alert(`결제 처리 중 오류가 발생했습니다: ${err instanceof Error ? err.message : '알 수 없는 오류'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 구독 결제 처리 (카드 빌링키 방식)
  const handleSubscriptionPayment = () => {
    // 기존 프리미엄 모달을 닫고, 빌링 모달 열기 (z-index 충돌 방지)
    onClose();
    setTimeout(() => {
      setShowBillingModal(true);
    }, 200); // 모달 닫힘 애니메이션 완료 후 새 모달 열기
  };

  // 빌링 결제 성공 콜백
  const handleBillingPaymentSuccess = () => {
    setShowBillingModal(false);
    window.location.reload(); // 권한 반영을 위해 새로고침
  };

  // 빌링 모달 닫기
  const handleCloseBillingModal = () => {
    setShowBillingModal(false);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-11/12 max-w-lg">
          <DialogHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <Crown className="h-12 w-12 text-purple-600" />
            </div>
            <DialogTitle className="text-xl font-bold">
              프리미엄 플랜 선택
            </DialogTitle>
            <DialogDescription>
              무제한 질문과 개인화된 AI 상담을 이용해보세요
            </DialogDescription>
          </DialogHeader>

          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
                          {/* 1개월 이용권 플랜 */}
            <div className="border-2 border-green-200 rounded-lg p-4 bg-green-50">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-bold text-green-900">{PLANS.ONETIME.name}</h3>
                  <p className="text-sm text-green-700">자동결제 없음 - 안심!</p>
                </div>
                <Badge className="bg-green-600 text-white">추천</Badge>
              </div>
              
              <div className="text-2xl font-bold text-green-600 mb-3">
                {PLANS.ONETIME.price.toLocaleString()}원
              </div>
              
              <div className="space-y-2 mb-4">
                {PLANS.ONETIME.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>
              
              <Button 
                onClick={handleOneTimePayment}
                disabled={isLoading}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    결제 진행 중...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    {PLANS.ONETIME.price.toLocaleString()}원 이용권 구매
                  </>
                )}
              </Button>
            </div>

            {/* 구독 플랜 */}
            <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-bold text-blue-900">{PLANS.MONTHLY.name}</h3>
                  <p className="text-sm text-blue-700">계속 이용시 더 저렴!</p>
                </div>
                <Badge className="bg-blue-600 text-white">절약</Badge>
              </div>
              
              <div className="text-2xl font-bold text-blue-600 mb-3">
                {PLANS.MONTHLY.price.toLocaleString()}원 <span className="text-lg text-gray-600">/월</span>
              </div>
              
              <div className="space-y-2 mb-4">
                {PLANS.MONTHLY.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>
              
              <Button 
                onClick={handleSubscriptionPayment}
                disabled={isLoading}
                variant="outline"
                className="w-full border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                {PLANS.MONTHLY.price.toLocaleString()}원/월 구독
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button 
              onClick={onClose}
              variant="ghost"
              className="w-full"
            >
              취소
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 카드 빌링 결제 모달 (구독용) */}
      <CardBillingPayment
        isOpen={showBillingModal}
        onClose={handleCloseBillingModal}
        onPaymentSuccess={handleBillingPaymentSuccess}
      />
    </>
  );
} 