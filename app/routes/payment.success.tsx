import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "@remix-run/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { BusinessFooter } from "~/components/layout/BusinessFooter";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";

interface IPaymentDetails {
  paymentId: string;
  orderId: string;
  paymentStatus: string;
  subscriptionId: string;
  membershipTier: string;
  planName: string;
  startDate: string;
  endDate: string;
  receipt?: any;
  alreadyProcessed?: boolean;
}

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<IPaymentDetails | null>(null);

  // URL 파라미터 추출
  const paymentId = searchParams.get('paymentId');
  const orderId = searchParams.get('orderId');
  const amount = searchParams.get('amount');

  useEffect(() => {
    // 필수 파라미터 검증
    if (!paymentId || !orderId || !amount) {
      setError('필수 결제 정보가 누락되었습니다.');
      setIsProcessing(false);
      return;
    }

    // 결제 승인 처리
    const confirmPayment = async () => {
      try {
        console.log('🎯 [Payment Success] 결제 승인 시작:', { paymentId, orderId, amount });
        
        const response = await fetch('/api/payment/confirm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            paymentId,
            orderId,
            amount: Number(amount),
          }),
        });

        const result = await response.json();
        console.log('🎯 [Payment Success] 결제 승인 결과:', result);

        if (result.success && result.data) {
          setPaymentDetails(result.data);
          setIsSuccess(true);
          console.log('✅ [Payment Success] 결제 승인 완료');
        } else {
          throw new Error(result.error || 'Unknown error');
        }
      } catch (err: any) {
        console.error('❌ [Payment Success] 결제 승인 실패:', err);
        setError(err.message || '결제 승인 중 오류가 발생했습니다.');
      } finally {
        setIsProcessing(false);
      }
    };

    confirmPayment();
  }, [paymentId, orderId, amount]);

  if (isProcessing) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <div className="flex-1 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardContent className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                결제를 처리하고 있습니다
              </h2>
              <p className="text-sm text-gray-600 text-center">
                잠시만 기다려 주세요. 결제 승인을 확인하고 있습니다.
              </p>
            </CardContent>
          </Card>
        </div>
        <BusinessFooter />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <div className="flex-1 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
              <CardTitle className="text-red-600">결제 실패</CardTitle>
              <CardDescription>결제 처리 중 문제가 발생했습니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
              <div className="flex gap-2">
                <Button 
                  onClick={() => navigate("/chat")} 
                  variant="outline" 
                  className="flex-1"
                >
                  홈으로 가기
                </Button>
                <Button 
                  onClick={() => window.location.reload()} 
                  className="flex-1"
                >
                  다시 시도
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <BusinessFooter />
      </div>
    );
  }

  if (isSuccess && paymentDetails) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <div className="flex-1 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <CardTitle className="text-green-600">
                {paymentDetails.alreadyProcessed ? "구독 확인됨" : "결제 완료!"}
              </CardTitle>
              <CardDescription>
                {paymentDetails.alreadyProcessed 
                  ? "이미 활성화된 프리미엄 구독을 확인했습니다" 
                  : "프리미엄 구독이 성공적으로 활성화되었습니다"
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">구독 플랜:</span>
                    <span className="text-sm">{paymentDetails.planName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">구독 기간:</span>
                    <span className="text-sm">
                      {new Date(paymentDetails.startDate).toLocaleDateString('ko-KR')} ~ {new Date(paymentDetails.endDate).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">주문 번호:</span>
                    <span className="text-sm font-mono">{paymentDetails.orderId}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-900">🎉 이제 무제한으로 이용하세요!</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 무제한 AI 질문</li>
                  <li>• 모든 대화 기록 저장</li>
                  <li>• 개인화된 맞춤 답변</li>
                  <li>• 모든 기기에서 동기화</li>
                </ul>
              </div>

              <Button 
                onClick={() => navigate("/chat")} 
                className="w-full bg-green-600 hover:bg-green-700"
              >
                채팅하러 가기
              </Button>
            </CardContent>
          </Card>
        </div>
        <BusinessFooter />
      </div>
    );
  }

  return null;
} 