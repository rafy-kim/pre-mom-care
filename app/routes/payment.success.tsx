import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "@remix-run/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  
  // 🔒 중복 요청 방지용 ref
  const isConfirmingRef = useRef(false);
  const hasConfirmedRef = useRef(false);

  const paymentId = searchParams.get("paymentId");
  const orderId = searchParams.get("orderId");
  const amount = searchParams.get("amount");

  useEffect(() => {
    const confirmPayment = async () => {
      // 🚫 필수 정보 검증
      if (!paymentId || !orderId || !amount) {
        setError("필수 결제 정보가 누락되었습니다.");
        setIsProcessing(false);
        return;
      }

      // 🚫 중복 요청 방지: 이미 처리 중이거나 완료된 경우 스킵
      if (isConfirmingRef.current || hasConfirmedRef.current) {
        console.log('⚠️ [Payment Success Page] 중복 요청 방지 - 스킵:', {
          isConfirming: isConfirmingRef.current,
          hasConfirmed: hasConfirmedRef.current
        });
        return;
      }

      // 🔒 요청 시작 플래그 설정
      isConfirmingRef.current = true;

      try {
        console.log('🎯 [Payment Success Page] 결제 승인 요청:', {
          paymentId,
          orderId,
          amount,
          timestamp: new Date().toISOString()
        });

        const response = await fetch('/api/payment/confirm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            paymentId,
            orderId,
            amount: Number(amount)
          })
        });

        const result = await response.json();

        if (result.success) {
          // ✅ 성공 처리 완료 플래그 설정
          hasConfirmedRef.current = true;
          
          setPaymentDetails(result.data);
          setIsSuccess(true);
          
          if (result.data.alreadyProcessed) {
            console.log('ℹ️ [Payment Success] 이미 처리된 결제 - 기존 구독 정보 표시:', result.data);
          } else {
            console.log('✅ [Payment Success] 결제 승인 완료:', result.data);
          }
        } else {
          setError(result.error || "결제 승인에 실패했습니다.");
          console.error('❌ [Payment Error]', result.error);
        }
      } catch (error) {
        console.error('❌ [Payment Confirm Error]', error);
        setError("결제 처리 중 오류가 발생했습니다.");
      } finally {
        // 🔓 요청 완료 플래그 해제
        isConfirmingRef.current = false;
        setIsProcessing(false);
      }
    };

    confirmPayment();
  }, [paymentId, orderId, amount]);

  if (isProcessing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
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
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
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
    );
  }

  if (isSuccess && paymentDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
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
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">구독 계획</span>
                <span className="text-sm font-medium">{paymentDetails.planName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">멤버십 등급</span>
                <span className="text-sm font-medium capitalize">
                  {paymentDetails.membershipTier}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">구독 시작일</span>
                <span className="text-sm font-medium">
                  {new Date(paymentDetails.startDate).toLocaleDateString('ko-KR')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">구독 종료일</span>
                <span className="text-sm font-medium">
                  {new Date(paymentDetails.endDate).toLocaleDateString('ko-KR')}
                </span>
              </div>
            </div>

            {paymentDetails.receipt && (
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => window.open(paymentDetails.receipt.url, '_blank')}
              >
                영수증 확인
              </Button>
            )}

            <Button 
              onClick={() => navigate("/chat")} 
              className="w-full"
            >
              채팅 시작하기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
} 