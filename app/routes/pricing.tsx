import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { BusinessFooter } from "~/components/layout/BusinessFooter";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { ArrowLeft, Check, Star, MessageSquare, Clock, Shield, Sparkles } from "lucide-react";
import { useState } from "react";
import { PremiumUpgradeModal } from "~/components/freemium/PremiumUpgradeModal";

interface IPlan {
  id: string;
  name: string;
  price: number;
  tier?: string;
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
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // plans가 undefined이거나 배열이 아닌 경우 방어적 처리
  const safePlans = Array.isArray(plans) ? plans : [];
  
  // 프리미엄 플랜 찾기 (API 응답에서 id가 'premium'을 포함하는 것을 찾기)
  const premiumPlan = safePlans.find((plan: IPlan) => 
    plan.id?.includes('premium') || plan.name?.includes('프리미엄')
  );

  const handlePremiumClick = () => {
    setShowUpgradeModal(true);
  };

  const handleCloseModal = () => {
    setShowUpgradeModal(false);
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

          {/* 요금제 카드 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
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

            {/* 프리미엄 플랜 */}
            <Card className="relative border-2 border-blue-200 shadow-lg">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-blue-600 text-white px-3 py-1">
                  <Star className="h-3 w-3 mr-1" />
                  추천
                </Badge>
              </div>
              
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl font-bold text-gray-900">
                  프리미엄 플랜
                </CardTitle>
                <CardDescription className="text-gray-600">
                  무제한으로 안심하고 질문하세요
                </CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-blue-600">
                    {premiumPlan?.price?.toLocaleString() || '2,000'}원
                  </span>
                  <span className="text-gray-600 ml-2">/월</span>
                </div>
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
                    onClick={handlePremiumClick}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    프리미엄 시작하기
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
                  Q. 무료 플랜에서 프리미엄으로 언제든지 업그레이드할 수 있나요?
                </h3>
                <p className="text-gray-600">
                  네, 언제든지 프리미엄 플랜으로 업그레이드가 가능합니다. 
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
          <div className="mt-16 text-center bg-blue-50 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              지금 바로 시작해보세요
            </h2>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              수많은 예비 부모들이 선택한 믿을 수 있는 AI 상담 서비스. 
              임신과 출산의 모든 순간, 안심 톡이 함께합니다.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/chat">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                  무료로 체험하기
                </Button>
              </Link>
              <Button 
                size="lg" 
                variant="outline"
                onClick={handlePremiumClick}
              >
                프리미엄 시작하기
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* 사업자 정보 푸터 */}
      <BusinessFooter />

      {/* 프리미엄 업그레이드 모달 */}
      <PremiumUpgradeModal
        isOpen={showUpgradeModal}
        onClose={handleCloseModal}
      />
    </div>
  );
} 