import { Link } from "@remix-run/react";
import { BusinessFooter } from "~/components/layout/BusinessFooter";
import { Button } from "~/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
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
            <h1 className="text-3xl font-bold text-gray-900 mb-6">서비스 이용약관</h1>
            
            <div className="prose max-w-none space-y-6 text-gray-700">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  ⚠️ <strong>개발자 노트:</strong> 아래 이용약관은 예시 템플릿입니다. 
                  실제 서비스 운영 시에는 법무 전문가의 검토를 받아 정확한 약관으로 교체해야 합니다.
                </p>
              </div>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">제1조 (목적)</h2>
                <p>
                  이 약관은 (주)프리맘케어(이하 "회사")가 제공하는 "예비맘, 안심 톡" 서비스(이하 "서비스")의 
                  이용과 관련하여 회사와 이용자간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">제2조 (정의)</h2>
                <ul className="list-decimal list-inside space-y-2">
                  <li>"서비스"란 회사가 제공하는 임신/출산 관련 AI 상담 서비스를 의미합니다.</li>
                  <li>"이용자"란 이 약관에 따라 회사가 제공하는 서비스를 받는 회원 및 비회원을 의미합니다.</li>
                  <li>"회원"란 회사와 서비스 이용계약을 체결하고 이용자 아이디를 부여받은 자를 의미합니다.</li>
                  <li>"콘텐츠"란 서비스에서 제공되는 모든 정보, 텍스트, 그래픽, 링크 등을 의미합니다.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">제3조 (약관의 명시와 설명 및 개정)</h2>
                <ol className="list-decimal list-inside space-y-2">
                  <li>회사는 이 약관의 내용과 상호 및 대표자 성명, 영업소 소재지 주소, 전화번호 등을 이용자가 쉽게 알 수 있도록 서비스 초기 화면에 게시합니다.</li>
                  <li>회사는 약관의 규제에 관한 법률, 전자상거래 등에서의 소비자보호에 관한 법률 등 관련법을 위배하지 않는 범위에서 이 약관을 개정할 수 있습니다.</li>
                  <li>회사가 약관을 개정할 경우에는 적용일자 및 개정사유를 명시하여 현행약관과 함께 서비스의 초기화면에 그 적용일자 7일 이전부터 적용일자 전일까지 공지합니다.</li>
                </ol>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">제4조 (서비스의 제공 및 변경)</h2>
                <ol className="list-decimal list-inside space-y-2">
                  <li>회사가 제공하는 서비스는 다음과 같습니다:
                    <ul className="list-disc list-inside mt-2 ml-4 space-y-1">
                      <li>임신/출산 관련 AI 상담 서비스</li>
                      <li>전문가 콘텐츠 기반 정보 제공</li>
                      <li>개인화된 맞춤 상담</li>
                      <li>대화 기록 저장 및 관리</li>
                    </ul>
                  </li>
                  <li>회사는 운영상, 기술상의 필요에 따라 제공하고 있는 서비스를 변경할 수 있습니다.</li>
                  <li>서비스의 내용, 이용방법, 이용시간에 대하여 변경이 있는 경우에는 변경사유, 변경될 서비스의 내용 및 제공일자 등을 그 변경 전에 해당 서비스 화면에 게시하여야 합니다.</li>
                </ol>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">제5조 (서비스의 중단)</h2>
                <ol className="list-decimal list-inside space-y-2">
                  <li>회사는 컴퓨터 등 정보통신설비의 보수점검, 교체 및 고장, 통신의 두절 등의 사유가 발생한 경우에는 서비스의 제공을 일시적으로 중단할 수 있습니다.</li>
                  <li>회사는 제1항의 사유로 서비스의 제공이 일시적으로 중단됨으로 인하여 이용자 또는 제3자가 입은 손해에 대하여 배상합니다. 단, 회사가 고의 또는 과실이 없음을 입증하는 경우에는 그러하지 아니합니다.</li>
                </ol>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">제6조 (회원가입)</h2>
                <ol className="list-decimal list-inside space-y-2">
                  <li>이용자는 회사가 정한 가입 양식에 따라 회원정보를 기입한 후 이 약관에 동의한다는 의사표시를 함으로서 회원가입을 신청합니다.</li>
                  <li>회사는 제1항과 같이 회원으로 가입할 것을 신청한 이용자 중 다음 각호에 해당하지 않는 한 회원으로 등록합니다.</li>
                  <li>회원가입계약의 성립시기는 회사의 승낙이 회원에게 도달한 시점으로 합니다.</li>
                </ol>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">제7조 (개인정보보호)</h2>
                <ol className="list-decimal list-inside space-y-2">
                  <li>회사는 이용자의 정보수집시 서비스제공에 필요한 최소한의 정보를 수집합니다.</li>
                  <li>회사는 회원의 개인정보를 본인의 동의없이 제3자에게 제공하지 않습니다. 단, 관련법령에 의해 요구되는 경우는 예외로 합니다.</li>
                  <li>개인정보의 처리에 관한 자세한 사항은 별도의 개인정보 처리방침에서 정합니다.</li>
                </ol>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">제8조 (이용자의 의무)</h2>
                <ol className="list-decimal list-inside space-y-2">
                  <li>이용자는 다음 행위를 하여서는 안됩니다:
                    <ul className="list-disc list-inside mt-2 ml-4 space-y-1">
                      <li>신청 또는 변경시 허위내용의 등록</li>
                      <li>타인의 정보도용</li>
                      <li>회사가 게시한 정보의 변경</li>
                      <li>회사가 정한 정보 이외의 정보(컴퓨터 프로그램 등) 등의 송신 또는 게시</li>
                      <li>회사 기타 제3자의 저작권 등 지적재산권에 대한 침해</li>
                      <li>회사 기타 제3자의 명예를 손상시키거나 업무를 방해하는 행위</li>
                      <li>외설 또는 폭력적인 메시지, 화상, 음성, 기타 공서양속에 반하는 정보를 서비스에 공개 또는 게시하는 행위</li>
                    </ul>
                  </li>
                </ol>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">제9조 (저작권의 귀속 및 이용제한)</h2>
                <ol className="list-decimal list-inside space-y-2">
                  <li>회사가 작성한 저작물에 대한 저작권 기타 지적재산권은 회사에 귀속합니다.</li>
                  <li>이용자는 서비스를 이용함으로써 얻은 정보를 회사의 사전승낙 없이 복제, 송신, 출판, 배포, 방송 기타 방법에 의하여 영리목적으로 이용하거나 제3자에게 이용하게 하여서는 안됩니다.</li>
                </ol>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">제10조 (계약해지 및 이용제한)</h2>
                <ol className="list-decimal list-inside space-y-2">
                  <li>회원은 회사에 언제든지 해지신청을 할 수 있으며, 회사는 즉시 회원탈퇴를 처리합니다.</li>
                  <li>회원이 다음 각호의 사유에 해당하는 경우, 회사는 회원자격을 제한 또는 정지시킬 수 있습니다.</li>
                  <li>회사가 회원 자격을 제한․정지 시킨 후, 동일한 행위가 2회 이상 반복되거나 30일 이내에 그 사유가 시정되지 아니하는 경우 회사는 회원자격을 상실시킬 수 있습니다.</li>
                </ol>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">제11조 (손해배상 등)</h2>
                <ol className="list-decimal list-inside space-y-2">
                  <li>회사는 무료로 제공되는 서비스와 관련하여 회원에게 어떠한 손해가 발생하더라도 동 손해가 회사의 고의 또는 중대한 과실에 기인하지 않는 한 이에 대하여 책임을 부담하지 아니합니다.</li>
                  <li>회사가 제공하는 정보는 의학적 진단이나 치료를 대체할 수 없으며, 이용자는 의료진의 전문적인 상담을 받아야 합니다.</li>
                </ol>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">제12조 (면책조항)</h2>
                <ol className="list-decimal list-inside space-y-2">
                  <li>회사는 천재지변 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.</li>
                  <li>회사는 이용자의 귀책사유로 인한 서비스 이용의 장애에 대하여 책임을 지지 않습니다.</li>
                  <li>회사는 이용자가 서비스를 이용하여 기대하는 손익이나 서비스를 통하여 얻은 자료로 인한 손해에 관하여 책임을 지지 않습니다.</li>
                </ol>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">제13조 (준거법 및 관할법원)</h2>
                <ol className="list-decimal list-inside space-y-2">
                  <li>회사와 이용자 간에 발생한 전자상거래 분쟁에 관한 소송은 대한민국 법을 적용하며, 회사의 본사 소재지를 관할하는 법원을 관할 법원으로 합니다.</li>
                </ol>
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