import { Link } from "@remix-run/react";
import { BusinessFooter } from "~/components/layout/BusinessFooter";
import { Button } from "~/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function RefundPage() {
  return (
    <div className="min-h-screen flex flex-col bg-light-gray">
      {/* 헤더 */}
      <header className="border-b bg-white">
        <div className="mx-auto flex w-full max-w-4xl items-center gap-4 p-4">
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
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">환불 정책</h1>
            
            <div className="prose max-w-none space-y-6 text-gray-700">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  ⚠️ <strong>개발자 노트:</strong> 아래 환불정책은 예시 템플릿입니다. 
                  실제 서비스 운영 시에는 전자상거래법 및 소비자보호법에 따라 정확한 정책으로 교체해야 합니다.
                </p>
              </div>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">1. 기본 원칙</h2>
                <p>
                  (주)프리맘케어(이하 "회사")는 「전자상거래 등에서의 소비자보호에 관한 법률」 및 
                  「소비자기본법」 등 관련 법령을 준수하여 공정하고 투명한 환불 정책을 운영합니다.
                </p>
                <ul className="list-disc list-inside mt-3 space-y-2">
                  <li>모든 환불 처리는 관련 법령에 따라 진행됩니다</li>
                  <li>고객의 단순 변심에 의한 환불도 법정 기간 내에서 가능합니다</li>
                  <li>환불 처리 과정은 투명하게 안내드립니다</li>
                  <li>부당한 환불 거부는 하지 않습니다</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">2. 서비스 구분 및 환불 기준</h2>
                
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-blue-900 mb-2">🔵 월간 프리미엄 구독 서비스</h3>
                    <ul className="list-disc list-inside space-y-1 text-blue-800">
                      <li><strong>서비스 내용:</strong> 무제한 AI 질문, 대화 기록 저장, 개인화된 답변</li>
                      <li><strong>결제 방식:</strong> 월 자동 결제</li>
                      <li><strong>환불 가능 기간:</strong> 결제 후 7일 이내 (미사용 기간에 대해서만)</li>
                    </ul>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-green-900 mb-2">🔵 무료 서비스</h3>
                    <ul className="list-disc list-inside space-y-1 text-green-800">
                      <li><strong>서비스 내용:</strong> 제한적 AI 질문 (일/주/월 한도)</li>
                      <li><strong>결제 방식:</strong> 무료</li>
                      <li><strong>환불:</strong> 해당 없음 (무료 서비스)</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">3. 환불 가능 사유</h2>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">▶ 정당한 환불 사유 (100% 환불)</h4>
                    <ul className="list-disc list-inside space-y-1">
                      <li>서비스에 중대한 결함이 있어 정상적인 이용이 불가능한 경우</li>
                      <li>회사의 귀책사유로 서비스 제공이 불가능한 경우</li>
                      <li>서비스 내용이 표시·광고 내용과 다르거나 다르게 이행된 경우</li>
                      <li>기타 회사의 고의 또는 중과실로 인한 경우</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">▶ 단순 변심 (조건부 환불)</h4>
                    <ul className="list-disc list-inside space-y-1">
                      <li>결제 후 7일 이내 신청 시 가능</li>
                      <li>이미 사용한 서비스 기간은 환불 대상에서 제외</li>
                      <li>미사용 기간에 대해서만 일할 계산하여 환불</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">4. 환불 불가 사유</h2>
                <ul className="list-disc list-inside space-y-2">
                  <li>서비스를 이미 상당 부분 사용한 경우 (사용 기간에 대한 환불 불가)</li>
                  <li>고객의 단순 변심으로 인한 환불 신청이 7일을 초과한 경우</li>
                  <li>무료 서비스 이용 중 발생한 불만 (결제가 없는 서비스)</li>
                  <li>고객의 귀책사유로 서비스 이용에 제한이 발생한 경우</li>
                  <li>기타 관련 법령에서 환불을 제한하는 경우</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">5. 환불 신청 방법</h2>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-3">📞 환불 신청 접수</h4>
                  <ul className="space-y-2">
                    <li><strong>이메일:</strong> support@premomcare.com</li>
                    <li><strong>전화:</strong> 02-1234-5678 (평일 09:00~18:00)</li>
                    <li><strong>운영시간:</strong> 평일 09:00~18:00 (점심시간 12:00~13:00 제외)</li>
                  </ul>
                </div>

                <div className="mt-4">
                  <h4 className="font-medium mb-2">▶ 환불 신청 시 필요 정보</h4>
                  <ul className="list-disc list-inside space-y-1">
                    <li>회원 정보 (이메일 주소)</li>
                    <li>결제 정보 (결제일시, 결제금액, 주문번호)</li>
                    <li>환불 사유</li>
                    <li>환불 받을 계좌 정보</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">6. 환불 처리 절차 및 기간</h2>
                
                <div className="space-y-4">
                  <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                    <h4 className="font-medium text-blue-900 mb-2">1단계: 환불 신청 접수</h4>
                    <ul className="list-disc list-inside text-blue-800 space-y-1">
                      <li>환불 신청서 작성 및 제출</li>
                      <li>접수 확인 통지 (24시간 이내)</li>
                    </ul>
                  </div>

                  <div className="bg-green-50 border-l-4 border-green-400 p-4">
                    <h4 className="font-medium text-green-900 mb-2">2단계: 환불 심사</h4>
                    <ul className="list-disc list-inside text-green-800 space-y-1">
                      <li>환불 사유 및 자격 검토</li>
                      <li>서비스 이용 내역 확인</li>
                      <li>환불 가능 여부 결정 (영업일 기준 3일 이내)</li>
                    </ul>
                  </div>

                  <div className="bg-purple-50 border-l-4 border-purple-400 p-4">
                    <h4 className="font-medium text-purple-900 mb-2">3단계: 환불 처리</h4>
                    <ul className="list-disc list-inside text-purple-800 space-y-1">
                      <li>환불 승인 시: 승인 통지 후 환불 처리</li>
                      <li>환불 거부 시: 거부 사유 상세 안내</li>
                      <li>환불 완료까지 영업일 기준 3~5일 소요</li>
                    </ul>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>💡 참고사항:</strong> 카드 결제의 경우 카드사 정책에 따라 환불 처리 기간이 추가로 소요될 수 있습니다. 
                    (일반적으로 3~5 영업일, 해외카드의 경우 최대 한 달)
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">7. 환불 금액 계산 방법</h2>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">▶ 월간 구독 서비스 환불 계산</h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="font-mono text-sm mb-2">
                        환불금액 = 결제금액 - (일할 사용료 × 사용일수)
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>예시:</strong> 월 29,900원 구독 서비스를 10일 사용 후 환불 신청
                        <br />
                        환불금액 = 29,900원 - (997원 × 10일) = 19,930원
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">▶ 환불 수수료</h4>
                    <ul className="list-disc list-inside space-y-1">
                      <li><strong>회사 귀책사유:</strong> 환불 수수료 없음 (100% 환불)</li>
                      <li><strong>고객 단순변심:</strong> 실제 사용한 금액 차감 후 환불</li>
                      <li><strong>송금 수수료:</strong> 고객 부담 (은행 송금 시)</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">8. 자동 결제 취소 및 구독 해지</h2>
                
                <div className="space-y-3">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">자동 결제 취소</h4>
                    <ul className="list-disc list-inside text-blue-800 space-y-1">
                      <li>언제든지 마이페이지에서 구독 해지 가능</li>
                      <li>해지 시점까지의 서비스는 정상 이용 가능</li>
                      <li>다음 결제일 이전 해지 시 자동 결제 중단</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="font-medium text-green-900 mb-2">구독 해지 후 이용</h4>
                    <ul className="list-disc list-inside text-green-800 space-y-1">
                      <li>해지 후에도 결제한 구독 기간 만료까지 서비스 이용 가능</li>
                      <li>구독 기간 만료 후 무료 서비스로 자동 전환</li>
                      <li>저장된 대화 기록은 계속 유지</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">9. 분쟁 해결 및 소비자 보호</h2>
                
                <div className="space-y-3">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="font-medium text-red-900 mb-2">소비자분쟁조정위원회</h4>
                    <p className="text-red-800 text-sm">
                      환불 관련 분쟁이 발생한 경우, 공정거래위원회 소비자분쟁조정위원회에 조정을 신청할 수 있습니다.
                      <br />
                      <strong>홈페이지:</strong> www.ccn.go.kr | <strong>전화:</strong> 국번없이 1372
                    </p>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">전자상거래 분쟁조정위원회</h4>
                    <p className="text-gray-700 text-sm">
                      전자상거래 관련 분쟁 조정 신청이 가능합니다.
                      <br />
                      <strong>홈페이지:</strong> www.ecmc.or.kr | <strong>전화:</strong> 02-2122-2500
                    </p>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">10. 유의사항</h2>
                <ul className="list-disc list-inside space-y-2">
                  <li>환불 정책은 관련 법령 변경에 따라 수정될 수 있습니다</li>
                  <li>변경 시 7일 전 공지사항을 통해 안내드립니다</li>
                  <li>허위 정보로 환불을 신청하는 경우 법적 책임을 질 수 있습니다</li>
                  <li>환불 처리 과정에서 추가 서류 요청이 있을 수 있습니다</li>
                  <li>본 정책에 명시되지 않은 사항은 관련 법령을 따릅니다</li>
                </ul>
              </section>

              <section className="pt-6 border-t border-gray-200">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">📞 환불 문의</h4>
                  <ul className="space-y-1 text-blue-800">
                    <li><strong>이메일:</strong> support@premomcare.com</li>
                    <li><strong>전화:</strong> 02-1234-5678</li>
                    <li><strong>운영시간:</strong> 평일 09:00~18:00 (점심시간 12:00~13:00 제외)</li>
                    <li><strong>휴무:</strong> 토요일, 일요일, 공휴일</li>
                  </ul>
                </div>

                <p className="text-sm text-gray-600 mt-4">
                  <strong>시행일:</strong> 2024년 1월 1일<br/>
                  <strong>최종 수정일:</strong> 2024년 1월 1일
                </p>
              </section>
            </div>
          </div>
        </div>
      </main>

      {/* 사업자 정보 푸터 */}
      <BusinessFooter />
    </div>
  );
} 