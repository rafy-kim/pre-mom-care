import { useNavigate, useSearchParams } from "@remix-run/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { XCircle, AlertTriangle } from "lucide-react";

export default function PaymentFail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const code = searchParams.get("code");
  const message = searchParams.get("message");
  const orderId = searchParams.get("orderId");
  const paymentId = searchParams.get("paymentId");

  // 에러 코드에 따른 사용자 친화적 메시지 매핑
  const getErrorMessage = (code: string | null, message: string | null) => {
    if (!code) return message || "결제 처리 중 오류가 발생했습니다.";

    const errorMessages: Record<string, string> = {
      "PAY_PROCESS_CANCELED": "결제가 취소되었습니다.",
      "PAY_PROCESS_ABORTED": "결제가 중단되었습니다.",
      "REJECT_CARD_COMPANY": "카드사에서 결제를 거절했습니다. 다른 카드를 사용해 주세요.",
      "INVALID_CARD_EXPIRATION": "카드 유효기간이 만료되었습니다.",
      "INVALID_STOPPED_CARD": "정지된 카드입니다.",
      "EXCEED_MAX_DAILY_PAYMENT_COUNT": "일일 결제 한도를 초과했습니다.",
      "EXCEED_MAX_ONE_DAY_PAYMENT_AMOUNT": "일일 결제 금액 한도를 초과했습니다.",
      "CARD_PROCESSING_ERROR": "카드 처리 중 오류가 발생했습니다.",
      "EXCEED_MAX_AMOUNT": "결제 한도를 초과했습니다.",
      "INVALID_CARD_INSTALLMENT_PLAN": "할부 개월 수가 잘못되었습니다.",
      "NOT_MATCHED_CARD_TYPE": "카드 타입이 맞지 않습니다.",
      "INVALID_CARD_BIN": "유효하지 않은 카드입니다.",
      "INVALID_CARD_NUMBER": "카드 번호가 잘못되었습니다.",
      "INVALID_UNREGISTERED_SUBMALL": "등록되지 않은 서브몰입니다.",
      "NOT_REGISTERED_BUSINESS": "등록되지 않은 사업자입니다."
    };

    return errorMessages[code] || message || "결제 처리 중 오류가 발생했습니다.";
  };

  const errorMessage = getErrorMessage(code, message);
  const isUserCanceled = code === "PAY_PROCESS_CANCELED" || code === "PAY_PROCESS_ABORTED";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {isUserCanceled ? (
            <AlertTriangle className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
          ) : (
            <XCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          )}
          <CardTitle className={isUserCanceled ? "text-yellow-600" : "text-red-600"}>
            {isUserCanceled ? "결제 취소" : "결제 실패"}
          </CardTitle>
          <CardDescription>
            {isUserCanceled 
              ? "결제가 취소되었습니다" 
              : "결제 처리 중 문제가 발생했습니다"
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>

          {orderId && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs text-gray-600">주문 번호</p>
              <p className="text-sm font-mono">{orderId}</p>
            </div>
          )}

          <div className="flex gap-2">
            <Button 
              onClick={() => navigate("/chat")} 
              variant="outline" 
              className="flex-1"
            >
              홈으로 가기
            </Button>
            {!isUserCanceled && (
              <Button 
                onClick={() => navigate(-1)} 
                className="flex-1"
              >
                다시 시도
              </Button>
            )}
          </div>

          {isUserCanceled && (
            <Button 
              onClick={() => navigate(-1)} 
              className="w-full"
            >
              결제 다시 시도
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 