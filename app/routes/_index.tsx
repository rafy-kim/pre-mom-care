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
        <div className="flex flex-col items-center justify-center max-w-lg w-full">
          <img src="/ansimi.png" alt="안심이 마스코트" className="h-20 w-20 sm:h-28 sm:w-28" />
          <h1 className="mt-6 sm:mt-8 text-3xl sm:text-4xl font-bold text-dark-gray">
            예비맘, 안심 톡
          </h1>
          <div className="mt-8 sm:mt-10 text-base sm:text-lg text-gray-600 space-y-2">
            <p>임신하고 나서 궁금한 점 많으셨죠?</p>
            <p>신뢰할 수 있는 답변을 출처와 함께 제공하는</p>
            <p>'예비맘, 안심 톡'에 물어보세요!</p>
          </div>
        </div>
        <div className="mt-10 sm:mt-16 pb-safe">
          <SignedOut>
            <div className="mx-auto flex max-w-sm flex-col items-center gap-4">
              <SignInButton mode="modal">
                <Button size="lg" className="w-full touch-manipulation text-lg py-6 h-14">
                  시작하기
                </Button>
              </SignInButton>
              <Button asChild size="lg" variant="ghost" className="w-full touch-manipulation text-lg py-6 h-14 text-gray-500">
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
