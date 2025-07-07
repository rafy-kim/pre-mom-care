import { Link } from "@remix-run/react";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export interface IBusinessFooterProps {
  className?: string;
}

export function BusinessFooter({ className = "" }: IBusinessFooterProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <footer className={`bg-gray-50 border-t border-gray-200 ${className}`}>
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="space-y-2">
          {/* 사업자 정보 토글 버튼 & 법적 페이지 링크 */}
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <span>사업자 정보</span>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            {/* 법적 페이지 링크 */}
            <div className="flex flex-wrap gap-2 sm:gap-4 text-sm">
              <Link 
                to="/terms" 
                className="text-gray-600 hover:text-gray-900 underline"
              >
                이용약관
              </Link>
              <Link 
                to="/privacy" 
                className="text-gray-600 hover:text-gray-900 underline"
              >
                개인정보처리방침
              </Link>
              <Link 
                to="/refund" 
                className="text-gray-600 hover:text-gray-900 underline"
              >
                환불정책
              </Link>
              <Link 
                to="/pricing" 
                className="text-gray-600 hover:text-gray-900 underline"
              >
                요금제
              </Link>
            </div>
          </div>

          {/* 사업자 정보 - 펼쳐질 때만 표시 */}
          {isExpanded && (
            <div className="space-y-3 text-sm text-gray-600 bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <span className="font-medium">상호명:</span> (주)라옴
                </div>
                <div>
                  <span className="font-medium">대표자:</span> 김범준
                </div>
                <div>
                  <span className="font-medium">사업자등록번호:</span> 703-87-02243
                </div>
                <div>
                  <span className="font-medium">통신판매업번호:</span> 2024-서울구로-1794
                </div>
              </div>
              
              <div className="space-y-1">
                <div>
                  <span className="font-medium">주소:</span> 서울특별시 송파구 가락로 244, 3층 305-68호 (방이동, 동원빌딩)
                </div>
                <div>
                  <span className="font-medium">연락처:</span> 010-3352-2321
                </div>
                <div>
                  <span className="font-medium">이메일:</span> rafy@raom.kr
                </div>
              </div>

              {/* 면책사항 */}
              <div className="pt-2 border-t border-gray-200 text-xs text-gray-500">
                <p>
                  본 서비스는 의학적 진단이나 치료를 대체할 수 없습니다. 
                  전문의의 상담을 받으시기 바랍니다.
                </p>
              </div>
            </div>
          )}

          {/* 저작권 정보 - 항상 표시 */}
          <div className="text-xs text-gray-500">
            © RAOM Inc.
          </div>
        </div>
      </div>
    </footer>
  );
} 