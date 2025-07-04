import { Link } from "@remix-run/react";
import { BusinessFooter } from "~/components/layout/BusinessFooter";
import { Button } from "~/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
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
            <h1 className="text-3xl font-bold text-gray-900 mb-6">개인정보처리방침</h1>
            
            <div className="prose max-w-none space-y-6 text-gray-700">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  ⚠️ <strong>개발자 노트:</strong> 아래 개인정보처리방침은 예시 템플릿입니다. 
                  실제 서비스 운영 시에는 개인정보보호법에 따라 정확한 방침으로 교체해야 합니다.
                </p>
              </div>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">1. 개인정보의 처리목적</h2>
                <p>
                  (주)프리맘케어(이하 "회사")는 다음의 목적을 위하여 개인정보를 처리합니다. 
                  처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 
                  이용 목적이 변경되는 경우에는 개인정보보호법 제18조에 따라 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.
                </p>
                <ul className="list-disc list-inside mt-3 space-y-2">
                  <li><strong>회원 가입 및 관리:</strong> 회원 가입의사 확인, 회원제 서비스 제공에 따른 본인 식별·인증, 회원자격 유지·관리, 서비스 부정이용 방지</li>
                  <li><strong>서비스 제공:</strong> 개인화된 AI 상담 서비스 제공, 맞춤형 콘텐츠 제공, 서비스 이용 기록 관리</li>
                  <li><strong>고객 지원:</strong> 고객 상담 및 불만처리, 공지사항 전달</li>
                  <li><strong>마케팅 및 광고:</strong> 신규 서비스 개발 및 맞춤 서비스 제공, 이벤트 및 광고성 정보 제공 및 참여기회 제공, 접속빈도 파악</li>
                  <li><strong>결제서비스:</strong> 유료 서비스 이용에 따른 요금결제·정산</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">2. 개인정보의 처리 및 보유기간</h2>
                <p>
                  회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시에 
                  동의받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.
                </p>
                <div className="mt-4">
                  <h3 className="text-lg font-medium mb-2">각각의 개인정보 처리 및 보유 기간은 다음과 같습니다:</h3>
                  <ul className="list-disc list-inside space-y-2">
                    <li><strong>회원 가입 및 관리:</strong> 회원 탈퇴 시까지 (단, 다른 법령에 보존의무가 있는 경우 해당 기간)</li>
                    <li><strong>서비스 이용 기록:</strong> 3년 (통신비밀보호법)</li>
                    <li><strong>대금결제 및 재화 등의 공급에 관한 기록:</strong> 5년 (전자상거래 등에서의 소비자보호에 관한 법률)</li>
                    <li><strong>소비자의 불만 또는 분쟁처리에 관한 기록:</strong> 3년 (전자상거래 등에서의 소비자보호에 관한 법률)</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">3. 처리하는 개인정보의 항목</h2>
                <p>회사는 다음의 개인정보 항목을 처리하고 있습니다:</p>
                
                <div className="mt-4 space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">▶ 회원가입 및 서비스 이용</h4>
                    <ul className="list-disc list-inside ml-4 space-y-1">
                      <li><strong>필수항목:</strong> 이메일주소, 프로필 정보 (소셜 로그인 정보)</li>
                      <li><strong>선택항목:</strong> 아기 태명, 출산 예정일, 아기 성별, 사용자 관계(부/모)</li>
                      <li><strong>자동수집항목:</strong> IP주소, 쿠키, MAC주소, 서비스 이용기록, 방문기록, 불량이용기록</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">▶ 결제서비스 이용</h4>
                    <ul className="list-disc list-inside ml-4 space-y-1">
                      <li><strong>필수항목:</strong> 결제정보 (카드번호, 유효기간 등은 PG사에서 처리)</li>
                      <li><strong>생성정보:</strong> 결제기록, 이용내역</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">4. 개인정보의 제3자 제공</h2>
                <p>
                  회사는 원칙적으로 정보주체의 개인정보를 수집·이용 목적으로 명시한 범위 내에서 처리하며, 
                  정보주체의 사전 동의 없이는 본래의 목적 범위를 초과하여 처리하거나 제3자에게 제공하지 않습니다.
                </p>
                <p className="mt-2">
                  다만, 다음의 경우에는 예외로 합니다:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>정보주체로부터 별도의 동의를 받은 경우</li>
                  <li>법률에 특별한 규정이 있거나 법령상 의무를 준수하기 위하여 불가피한 경우</li>
                  <li>정보주체 또는 그 법정대리인이 의사표시를 할 수 없는 상태에 있거나 주소불명 등으로 사전 동의를 받을 수 없는 경우로서 명백히 정보주체 또는 제3자의 급박한 생명, 신체, 재산의 이익을 위하여 필요하다고 인정되는 경우</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">5. 개인정보처리의 위탁</h2>
                <p>회사는 원활한 개인정보 업무처리를 위하여 다음과 같이 개인정보 처리업무를 위탁하고 있습니다:</p>
                
                <div className="mt-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">위탁받는 자</th>
                          <th className="text-left py-2">위탁하는 업무의 내용</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b">
                          <td className="py-2">Clerk (클러크)</td>
                          <td className="py-2">회원 인증 및 계정 관리</td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-2">포트원 (PortOne)</td>
                          <td className="py-2">결제처리 및 결제 정보 관리</td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-2">Google Cloud Platform</td>
                          <td className="py-2">클라우드 서버 호스팅 및 데이터 저장</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">6. 정보주체의 권리·의무 및 행사방법</h2>
                <p>정보주체는 회사에 대해 언제든지 다음 각 호의 개인정보 보호 관련 권리를 행사할 수 있습니다:</p>
                
                <ul className="list-decimal list-inside mt-3 space-y-2">
                  <li>개인정보 처리현황 통지요구</li>
                  <li>개인정보 열람요구</li>
                  <li>개인정보 정정·삭제요구</li>
                  <li>개인정보 처리정지요구</li>
                </ul>
                
                <p className="mt-3">
                  위의 권리 행사는 회사에 대해 서면, 전화, 전자우편, 모사전송(FAX) 등을 통하여 하실 수 있으며 
                  회사는 이에 대해 지체없이 조치하겠습니다.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">7. 개인정보의 파기</h2>
                <p>
                  회사는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 
                  지체없이 해당 개인정보를 파기합니다.
                </p>
                
                <div className="mt-4">
                  <h4 className="font-medium mb-2">파기절차 및 방법:</h4>
                  <ul className="list-disc list-inside space-y-2">
                    <li><strong>파기절차:</strong> 불필요한 개인정보 및 개인정보파일은 개인정보보호책임자의 승인을 받아 파기합니다.</li>
                    <li><strong>파기방법:</strong> 전자적 파일 형태로 기록·저장된 개인정보는 기록을 재생할 수 없도록 로우레벨포맷(Low Level Format) 등의 방법을 이용하여 파기하며, 종이 문서에 기록·저장된 개인정보는 분쇄기로 분쇄하거나 소각하여 파기합니다.</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">8. 개인정보의 안전성 확보조치</h2>
                <p>회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다:</p>
                
                <ul className="list-disc list-inside mt-3 space-y-2">
                  <li><strong>관리적 조치:</strong> 내부관리계획 수립·시행, 정기적 직원 교육 등</li>
                  <li><strong>기술적 조치:</strong> 개인정보처리시스템 등의 접근권한 관리, 접근통제시스템 설치, 고유식별정보 등의 암호화, 보안프로그램 설치</li>
                  <li><strong>물리적 조치:</strong> 전산실, 자료보관실 등의 접근통제</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">9. 개인정보보호책임자</h2>
                <p>회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보보호책임자를 지정하고 있습니다:</p>
                
                <div className="mt-4 bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">▶ 개인정보보호책임자</h4>
                  <ul className="space-y-1">
                    <li><strong>성명:</strong> 김대표</li>
                    <li><strong>직책:</strong> 대표이사</li>
                    <li><strong>연락처:</strong> 02-1234-5678, support@premomcare.com</li>
                  </ul>
                </div>
                
                <p className="mt-3">
                  정보주체께서는 회사의 서비스를 이용하시면서 발생한 모든 개인정보 보호 관련 문의, 불만처리, 피해구제 등에 관한 사항을 개인정보보호책임자에게 문의하실 수 있습니다.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">10. 권익침해 구제방법</h2>
                <p>정보주체는 아래의 기관에 대해 개인정보 침해신고, 상담 등을 문의하실 수 있습니다:</p>
                
                <div className="mt-4 space-y-3">
                  <div className="bg-gray-50 p-3 rounded">
                    <strong>▶ 개인정보보호위원회 개인정보보호 종합지원 포털(privacy.go.kr)</strong>
                    <br />신고전화: 국번없이 182 | 홈페이지: privacy.go.kr
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded">
                    <strong>▶ 개인정보 침해신고센터(privacy.go.kr/pims)</strong>
                    <br />신고전화: 국번없이 182 | 이메일: 2nfo@privacy.go.kr
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded">
                    <strong>▶ 대검찰청 사이버수사과(www.spo.go.kr)</strong>
                    <br />신고전화: 국번없이 1301 | 이메일: cybercid@spo.go.kr
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded">
                    <strong>▶ 경찰청 사이버수사국(cyberbureau.police.go.kr)</strong>
                    <br />신고전화: 국번없이 182 | 이메일: cyber@police.go.kr
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">11. 개인정보 처리방침 변경</h2>
                <p>
                  이 개인정보처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른 변경내용의 추가, 삭제 및 정정이 있는 경우에는 변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.
                </p>
              </section>

              <section className="pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-600">
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