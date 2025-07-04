import { Link } from "@remix-run/react";
import { Button } from "~/components/ui/button";
import { SignInButton, SignedOut } from "@clerk/remix";
import { getAuth } from "@clerk/remix/ssr.server";
import { redirect, type LoaderFunctionArgs } from "@remix-run/node";
import { BusinessFooter } from "~/components/layout/BusinessFooter";

export const loader = async (args: LoaderFunctionArgs) => {
  const { userId } = await getAuth(args);
  if (userId) {
    return redirect("/onboarding");
  }
  return {};
};

export default function Index() {
  return (
    <div className="flex min-h-screen flex-col bg-light-gray touch-manipulation">
      <div className="flex flex-1 flex-col items-center justify-center px-4 sm:px-8 text-center">
        <div className="flex flex-col items-center justify-center max-w-md w-full">
          <img src="/ansimi.png" alt="안심이 마스코트" className="h-16 w-16 sm:h-20 sm:w-20" />
          <h1 className="mt-4 sm:mt-6 text-xl sm:text-2xl font-bold text-dark-gray">
            예비맘, 안심 톡
          </h1>
          <p className="mt-6 sm:mt-8 text-sm sm:text-base text-gray-600 leading-relaxed">
            임신하고 나서 궁금한 점 많으셨죠?
            <br />
            신뢰할 수 있는 답변을 출처와 함께 제공하는
            <br />
            '예비맘, 안심 톡'에 물어보세요!
          </p>
        </div>
        <div className="mt-8 sm:mt-12 pb-safe">
          <SignedOut>
            <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
              <SignInButton mode="modal">
                <Button size="lg" className="w-full touch-manipulation">
                  시작하기
                </Button>
              </SignInButton>
              <Button asChild size="lg" variant="ghost" className="w-full touch-manipulation">
                <Link to="/chat">둘러보기</Link>
              </Button>
            </div>
          </SignedOut>
        </div>
      </div>
      
      {/* 사업자 정보 푸터 */}
      <BusinessFooter />
    </div>
  );
}
