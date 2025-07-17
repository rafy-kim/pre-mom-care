import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { BusinessFooter } from "~/components/layout/BusinessFooter";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { ArrowLeft, Check, Star, MessageSquare, Clock, Shield, Sparkles, Loader2, CreditCard } from "lucide-react";
import { useState } from "react";
import { PremiumUpgradeModal } from "~/components/freemium/PremiumUpgradeModal";
import CardBillingPayment from "~/components/freemium/CardBillingPayment";
import { useUser } from "@clerk/remix";

interface IPlan {
  id: string;
  name: string;
  price: number;
  billingPeriod: string;
  features: string[];
}

export const loader = async (args: LoaderFunctionArgs) => {
  // 구독 플랜 정보를 가져옵니다 (API에서 실제 데이터 fetch)
  try {
    const baseUrl = new URL(args.request.url).origin;
    const response = await fetch(`${baseUrl}/api/subscription/plans`);
    const result = await response.json();
    
    // API 응답 구조에 맞춰 처리 (data 속성에서 플랜 정보 추출)
    const plans = result.success && result.data ? result.data : [];
    
    return json({ 
      plans: plans as IPlan[],
      error: null 
    });
  } catch (error) {
    console.error("Failed to fetch subscription plans:", error);
    return json({ 
      plans: [] as IPlan[], 
      error: "요금제 정보를 불러오는 중 오류가 발생했습니다." 
    });
  }
};

export default function PricingPage() {
  const { plans, error } = useLoaderData<typeof loader>();
  const { user } = useUser();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<IPlan | null>(null);
  const [showCardBillingModal, setShowCardBillingModal] = useState(false);
  const [isOneTimePaymentLoading, setIsOneTimePaymentLoading] = useState(false);

  // plans가 undefined이거나 배열이 아닌 경우 방어적 처리
  const safePlans = Array.isArray(plans) ? plans : [];
  
  // 플랜별로 분류
  const monthlyPlan = safePlans.find((plan: IPlan) => plan.billingPeriod === 'monthly');
  const onetimePlan = safePlans.find((plan: IPlan) => plan.billingPeriod === 'one_time');

  const handlePremiumClick = (plan: IPlan) => {
    setSelectedPlan(plan);
    setShowUpgradeModal(true);
  };

  const handleCloseModal = () => {
    setShowUpgradeModal(false);
    setSelectedPlan(null);
  };

  // 직접 단건결제 처리
  const handleDirectOneTimePayment = async () => {
    if (!user) {
      // 로그인 필요
      window.location.href = '/sign-in';
      return;
    }

    try {
      setIsOneTimePaymentLoading(true);
      
      console.log('🚀 단건결제 시작...');
      
      const response = await fetch('/api/payment/one-time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: "premium-onetime",
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
                  // 채팅 페이지로 리다이렉트
                  window.location.href = '/chat';
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
      setIsOneTimePaymentLoading(false);
    }
  };

  // 직접 구독결제 처리 (CardBillingPayment 모달 열기)
  const handleDirectSubscriptionPayment = () => {
    if (!user) {
      // 로그인 필요
      window.location.href = '/sign-in';
      return;
    }
    
    setShowCardBillingModal(true);
  };

  // CardBillingPayment 모달 닫기
  const handleCloseCardBillingModal = () => {
    setShowCardBillingModal(false);
  };

  // CardBillingPayment 성공 콜백
  const handleCardBillingPaymentSuccess = () => {
    setShowCardBillingModal(false);
    // 채팅 페이지로 리다이렉트
    window.location.href = '/chat';
  };

  return (
    <div className="min-h-screen flex flex-col bg-light-gray">
      {/* 헤더 */}
      <header className="border-b bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-4 p-4">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-6 w-6" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <img
              src="/ansimi.png"
              alt="안심이 로고"
              className="h-8 w-8"
            />
            <span className="text-xl font-bold text-dark-gray">
              예비맘, 안심 톡
            </span>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* 헤더 섹션 */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              서비스 요금제
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              임신과 출산 여정에서 든든한 동반자가 되어드립니다. 
              전문가의 지식을 바탕으로 한 신뢰할 수 있는 AI 상담 서비스를 만나보세요.
            </p>
          </div>

          {/* 에러 메시지 표시 */}
          {error && (
            <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* 서비스 특징 */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
              왜 예비맘, 안심 톡을 선택해야 할까요?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-4">
                  <Shield className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">전문가 검증 정보</h3>
                <p className="text-sm text-gray-600">산부인과 전문의와 육아 전문가의 검증된 콘텐츠</p>
              </div>
              
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mb-4">
                  <MessageSquare className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">24시간 AI 상담</h3>
                <p className="text-sm text-gray-600">언제든지 궁금한 점을 물어보고 즉시 답변 받기</p>
              </div>
              
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mb-4">
                  <Sparkles className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">개인화된 답변</h3>
                <p className="text-sm text-gray-600">임신 주차와 개인 상황에 맞춤화된 조언</p>
              </div>
              
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-lg mb-4">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">대화 기록 보존</h3>
                <p className="text-sm text-gray-600">소중한 임신 여정의 모든 질문과 답변 저장</p>
              </div>
            </div>
          </div>

          {/* 요금제 카드 - 3개 플랜 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {/* 무료 플랜 */}
            <Card className="relative">
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl font-bold text-gray-900">
                  무료 플랜
                </CardTitle>
                <CardDescription className="text-gray-600">
                  서비스를 체험해보세요
                </CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-gray-900">무료</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm">일 3회 AI 질문</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm">기본 임신/출산 정보 제공</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm">대화 기록 7일 보관</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm">모든 기기에서 접근 가능</span>
                  </div>
                </div>
                
                <div className="pt-4">
                  <Link to="/chat">
                    <Button variant="outline" className="w-full">
                      무료로 시작하기
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* 1개월 이용권 플랜 */}
            <Card className="relative border-2 border-green-200 shadow-lg">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-green-600 text-white px-3 py-1">
                  <Star className="h-3 w-3 mr-1" />
                  인기
                </Badge>
              </div>
              
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl font-bold text-gray-900">
                  1개월 이용권
                </CardTitle>
                <CardDescription className="text-gray-600">
                  자동결제 걱정 없이 안심하고!
                </CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-green-600">
                    {onetimePlan?.price?.toLocaleString() || '2,500'}원
                  </span>
                  <span className="text-gray-600 ml-2">/1개월</span>
                </div>
                <p className="text-sm text-green-600 font-medium mt-2">
                  ✨ 자동결제 없음 - 완전 안심!
                </p>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">무제한 AI 질문</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">개인화된 맞춤 답변</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">1개월간 모든 기능 이용</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">출산 예정일 기반 주차별 정보</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">북마크 기능 무제한</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">대화 기록 영구 보관</span>
                  </div>
                </div>
                
                <div className="pt-4">
                  <Button 
                    onClick={handleDirectOneTimePayment}
                    disabled={isOneTimePaymentLoading}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {isOneTimePaymentLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        결제 진행 중...
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4 mr-2" />
                        1개월 이용권 구매
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 프리미엄 월간 구독 플랜 */}
            <Card className="relative border-2 border-blue-200 shadow-lg">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-blue-600 text-white px-3 py-1">
                  <Star className="h-3 w-3 mr-1" />
                  절약
                </Badge>
              </div>
              
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl font-bold text-gray-900">
                  프리미엄 구독
                </CardTitle>
                <CardDescription className="text-gray-600">
                  계속 이용하실 분께 추천
                </CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-blue-600">
                    {monthlyPlan?.price?.toLocaleString() || '2,000'}원
                  </span>
                  <span className="text-gray-600 ml-2">/월</span>
                </div>
                <p className="text-sm text-blue-600 font-medium mt-2">
                  💰 월 500원 절약!
                </p>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">무제한 AI 질문</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">개인화된 맞춤 답변</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">모든 대화 기록 영구 보관</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">출산 예정일 기반 주차별 정보</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">북마크 기능 무제한</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">우선 고객 지원</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">월 중 언제든 해지 가능</span>
                  </div>
                </div>
                
                <div className="pt-4">
                  <Button 
                    onClick={handleDirectSubscriptionPayment}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    프리미엄 구독 시작
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* FAQ 섹션 */}
          <div className="mt-16">
            <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
              자주 묻는 질문
            </h2>
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Q. 1개월 이용권과 월간 구독의 차이점이 무엇인가요?
                </h3>
                <p className="text-gray-600">
                  1개월 이용권은 한 번만 결제하고 자동결제가 되지 않아 안심입니다. 
                  월간 구독은 500원 저렴하지만 매월 자동으로 결제됩니다. 언제든 해지 가능합니다.
                </p>
              </div>
              
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Q. 무료 플랜에서 유료 플랜으로 언제든지 업그레이드할 수 있나요?
                </h3>
                <p className="text-gray-600">
                  네, 언제든지 유료 플랜으로 업그레이드가 가능합니다. 
                  업그레이드 즉시 무제한 질문과 모든 프리미엄 기능을 이용하실 수 있습니다.
                </p>
              </div>
              
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Q. 프리미엄 구독을 중도에 해지할 수 있나요?
                </h3>
                <p className="text-gray-600">
                  네, 언제든지 구독을 해지하실 수 있습니다. 
                  해지 후에도 결제한 기간이 만료될 때까지는 프리미엄 서비스를 계속 이용하실 수 있습니다.
                </p>
              </div>
              
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Q. AI 답변의 정확성은 어떻게 보장되나요?
                </h3>
                <p className="text-gray-600">
                  모든 정보는 산부인과 전문의와 육아 전문가가 검증한 콘텐츠를 기반으로 합니다. 
                  다만, AI 답변은 참고용이며 응급상황이나 심각한 증상은 반드시 의료진과 상담하시기 바랍니다.
                </p>
              </div>
              
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Q. 결제는 어떻게 이루어지나요?
                </h3>
                <p className="text-gray-600">
                  안전한 PG사 포트원을 통해 결제가 처리됩니다. 
                  신용카드, 체크카드, 계좌이체, 휴대폰 결제 등 다양한 결제 수단을 지원합니다.
                </p>
              </div>
            </div>
          </div>

          {/* CTA 섹션 */}
          <div className="mt-16 text-center bg-gradient-to-r from-blue-50 to-green-50 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              지금 바로 시작해보세요
            </h2>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              수많은 예비 부모들이 선택한 믿을 수 있는 AI 상담 서비스. 
              임신과 출산의 모든 순간, 안심 톡이 함께합니다.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/chat">
                <Button size="lg" variant="outline">
                  무료로 체험하기
                </Button>
              </Link>
              <Button 
                size="lg" 
                className="bg-green-600 hover:bg-green-700"
                onClick={handleDirectOneTimePayment}
                disabled={isOneTimePaymentLoading}
              >
                {isOneTimePaymentLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    결제 진행 중...
                  </>
                ) : (
                  `1개월 이용권 (${onetimePlan?.price?.toLocaleString() || '2,500'}원)`
                )}
              </Button>
              <Button 
                size="lg"
                className="bg-blue-600 hover:bg-blue-700"
                onClick={handleDirectSubscriptionPayment}
              >
                프리미엄 구독 ({monthlyPlan?.price?.toLocaleString() || '2,000'}원/월)
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* 사업자 정보 푸터 */}
      <BusinessFooter />

      {/* 프리미엄 업그레이드 모달 (채팅 한도 달성시에만 사용) */}
      <PremiumUpgradeModal
        isOpen={showUpgradeModal}
        onClose={handleCloseModal}
        onLogin={() => {
          // 필요시 로그인 로직 추가
          window.location.href = '/sign-in';
        }}
      />

      {/* 카드 빌링 결제 모달 (구독용) */}
      <CardBillingPayment
        isOpen={showCardBillingModal}
        onClose={handleCloseCardBillingModal}
        onLogin={() => {
          window.location.href = '/sign-in';
        }}
        onPaymentSuccess={handleCardBillingPaymentSuccess}
      />
    </div>
  );
} 