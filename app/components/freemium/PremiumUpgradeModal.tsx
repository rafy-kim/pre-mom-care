import React, { useState, useEffect } from "react";
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
  Check, Crown, Zap, Clock, Calendar, CalendarDays, Heart, LogIn, 
  Gift, Loader2, AlertCircle, CreditCard 
} from "lucide-react";
import { useFreemiumPolicy } from "~/hooks/useFreemiumPolicy";
import { IPaymentApiResponse, IPremiumUpgradeModalProps } from "types";

// 🎯 고정된 프리미엄 플랜 정보 (크기 변화 방지)
const PREMIUM_FEATURES = [
  "개인화된 조언",
  "신뢰할 수 있는 출처 기반 답변", 
  "대화 기록 무제한 저장",
  "모든 기기 동기화",
  "무제한 질문"
];

const PLAN_ID = "premium-monthly";
const PLAN_NAME = "프리미엄 월간";

/**
 * 토스페이먼츠 통합 결제 모달 컴포넌트
 * 질문 제한 도달 시 프리미엄 구독을 유도하고 실제 결제를 처리합니다.
 */
export function PremiumUpgradeModal({ 
  isOpen, 
  onClose, 
  onLogin
}: IPremiumUpgradeModalProps) {
  const { user } = useUser();
  const {
    isGuest,
    limitType,
    remainingQuestions,
    LIMITS,
  } = useFreemiumPolicy();

  // 상태 관리 (가격만 동적 로드)
  const [price, setPrice] = useState<number>(2900); // 기본값
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 가격 정보만 로드
  useEffect(() => {
    if (isOpen && !isGuest) {
      loadPrice();
    }
  }, [isOpen, isGuest]);

  const loadPrice = async () => {
    setIsLoadingPrice(true);
    setError(null);
    
    try {
      const response = await fetch('/api/subscription/plans');
      const result: IPaymentApiResponse<any[]> = await response.json();
      
      if (result.success && result.data && result.data.length > 0) {
        // 첫 번째 플랜의 가격만 사용
        setPrice(result.data[0].price);
      } else {
        // 가격 로드 실패 시 기본값 유지
      }
    } catch (error) {
      // 개발 환경에서만 에러 로그 출력
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ [Price Load Error]', error);
      }
    } finally {
      setIsLoadingPrice(false);
    }
  };

  // 결제 처리
  const handlePayment = async () => {
    if (!user?.primaryEmailAddress?.emailAddress) {
      setError("필수 정보가 누락되었습니다.");
      return;
    }

    setIsProcessingPayment(true);
    setError(null);

    try {
              // 개발 환경에서만 상세 로그 출력
        if (process.env.NODE_ENV === 'development') {
          console.log('🎯 [Payment Start] 결제 시작:', { planName: PLAN_NAME, amount: price });
        }

      // 1. 결제 요청 생성
      const createResponse = await fetch('/api/payment/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: PLAN_ID,
          customerEmail: user.primaryEmailAddress.emailAddress,
          customerName: user.fullName || user.firstName || 'Unknown'
        })
      });

      const createResult: IPaymentApiResponse = await createResponse.json();

      if (!createResult.success || !createResult.data) {
        throw new Error(createResult.error || "결제 요청 생성에 실패했습니다.");
      }

      // 🎯 프리미엄 모달을 먼저 닫기 (포트원 모달과의 충돌 방지)
      onClose();

      // 모달 닫힘 애니메이션을 위한 약간의 지연
      await new Promise(resolve => setTimeout(resolve, 300));

      // 2. 포트원 브라우저 SDK를 사용한 결제 요청
      const PortOne = await import('@portone/browser-sdk/v2');
      
      // 포트원 SDK 파라미터
      const paymentParams = {
        storeId: createResult.data.storeId,
        channelKey: createResult.data.channelKey,
        paymentId: createResult.data.paymentId,
        orderName: createResult.data.orderName,
        totalAmount: createResult.data.totalAmount,
        currency: createResult.data.currency,
        payMethod: createResult.data.payMethod,
        customer: createResult.data.customer,
        redirectUrl: createResult.data.redirectUrl,
        noticeUrls: createResult.data.noticeUrls,
        customData: createResult.data.customData,
      };

      const response = await PortOne.requestPayment(paymentParams);

      if (!response) {
        throw new Error('포트원 결제 응답을 받지 못했습니다.');
      }

      if (response.code != null) {
        // 결제 실패 또는 취소
        if (response.code === 'USER_CANCEL') {
          // 사용자 취소의 경우 조용히 처리
          return;
        } else {
          alert(`결제 실패: ${response.message || '알 수 없는 오류'}`);
        }
        return;
      }

      if (!response.paymentId) {
        throw new Error('결제 ID를 받지 못했습니다.');
      }

      // 결제 성공 - 성공 페이지로 바로 리디렉션 (결제 승인은 success 페이지에서 처리)
      window.location.href = `/payment/success?paymentId=${response.paymentId}&orderId=${createResult.data.customData.orderId}&amount=${createResult.data.totalAmount}`;

    } catch (error: any) {
      console.error('❌ [Payment Error]', error);
      
      // 에러 발생 시에도 모달이 닫혀있을 수 있으므로 에러 알림 표시
      if (error.message && !error.message.includes('사용자가 결제를 취소')) {
        alert(`결제 오류: ${error.message}`);
      }
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // 게스트 모드에서는 로그인 우선 유도
  if (isGuest) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-11/12 max-w-lg">
          <DialogHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <Heart className="h-8 w-8 text-pink-500" />
            </div>
            
            <DialogTitle className="text-xl font-bold">
              체험하기가 끝났어요! 💝
            </DialogTitle>
            
            <DialogDescription className="text-base text-gray-600">
              로그인하시면 더 많은 질문을 하실 수 있어요.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-3">
                <Gift className="h-5 w-5 text-green-600" />
                <h3 className="font-bold text-green-800">로그인 혜택</h3>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700">하루 3회 무료 질문</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700">대화 기록 저장</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700">모든 기기에서 동기화</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700">개인화된 답변</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button 
              onClick={onClose} 
              variant="outline" 
              className="flex-1"
            >
              나중에 하기
            </Button>
            
            <Button 
              onClick={onLogin} 
              className="flex-1 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
            >
              <LogIn className="h-4 w-4 mr-2" />
              로그인하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // 제한 도달 메시지 생성
  const getLimitMessage = () => {
    switch (limitType) {
      case 'daily':
        return {
          title: '일일 질문 한도 도달',
          message: `하루 ${LIMITS.DAILY_FREE_LIMIT}개 질문 한도를 모두 사용했어요`,
          resetInfo: '내일 자정에 초기화됩니다'
        };
      case 'weekly':
        return {
          title: '주간 질문 한도 도달',
          message: `일주일 ${LIMITS.WEEKLY_FREE_LIMIT}개 질문 한도를 모두 사용했어요`,
          resetInfo: '매주 월요일에 초기화됩니다'
        };
      case 'monthly':
        return {
          title: '월간 질문 한도 도달',
          message: `한 달 ${LIMITS.MONTHLY_FREE_LIMIT}개 질문 한도를 모두 사용했어요`,
          resetInfo: '매월 1일에 초기화됩니다'
        };
      default:
        return {
          title: '질문 한도 도달',
          message: '무료 사용 한도를 모두 사용했어요',
          resetInfo: '프리미엄으로 업그레이드하세요'
        };
    }
  };

  const limitMessage = getLimitMessage();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-11/12 max-w-md fixed-height">
        <DialogHeader className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="relative">
              <Crown className="h-10 w-10 text-yellow-500" />
              <Zap className="h-4 w-4 text-orange-500 absolute -top-1 -right-1 animate-pulse" />
            </div>
          </div>
          
          <DialogTitle className="text-xl font-bold text-gray-900">
            {limitMessage.title}
          </DialogTitle>
          
          <DialogDescription className="text-gray-600">
            {limitMessage.message}
          </DialogDescription>
        </DialogHeader>

        {/* 🎯 고정된 프리미엄 플랜 UI */}
        <div className="space-y-4">
          {/* 프리미엄 혜택 */}
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-4 rounded-xl border border-purple-100">
            <div className="flex items-center gap-2 mb-3">
              <Crown className="h-5 w-5 text-purple-600" />
              <h3 className="font-bold text-purple-900">{PLAN_NAME}</h3>
              <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                추천
              </Badge>
          </div>

          <div className="space-y-2">
              {PREMIUM_FEATURES.map((feature, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{feature}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-purple-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-purple-600" />
                  <span className="text-sm text-purple-700">월 구독</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-purple-900">
                    {isLoadingPrice ? (
                      <div className="animate-pulse bg-gray-200 h-6 w-16 rounded"></div>
                    ) : (
                      `${price.toLocaleString()}원`
                    )}
                  </div>
                  <div className="text-xs text-purple-600">월 결제</div>
                </div>
              </div>
            </div>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">{error}</AlertDescription>
            </Alert>
          )}

          {/* 리셋 안내 */}
          <div className="text-center text-xs text-gray-500">
            <Clock className="h-3 w-3 inline mr-1" />
            {limitMessage.resetInfo}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button 
            onClick={onClose} 
            variant="outline" 
            className="flex-1"
            disabled={isProcessingPayment}
          >
            나중에 하기
          </Button>
          
          <Button 
            onClick={handlePayment}
            disabled={isProcessingPayment || isLoadingPrice}
            className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            {isProcessingPayment ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                결제 중...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4 mr-2" />
                {isLoadingPrice ? '로딩 중...' : `${price.toLocaleString()}원 결제하기`}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 