import { Link } from "@remix-run/react";
import { Button } from "~/components/ui/button";

export default function Index() {
  return (
    <div className="flex min-h-screen flex-col bg-light-gray">
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
        <img src="/ansimi.png" alt="안심이 마스코트" className="h-24 w-24" />
        <h1 className="mt-6 text-4xl font-bold text-dark-gray">
          예비맘, 안심 톡
          </h1>
        <p className="mt-4 max-w-md text-lg text-gray-600">
          임신·출산 과정의 모든 궁금증과 불안감,
          <br />
          신뢰할 수 있는 AI 친구에게 무엇이든 물어보세요.
        </p>
      </div>
      <div className="p-8">
        <div className="mx-auto flex max-w-sm flex-col gap-4">
          <Button asChild size="lg" className="bg-[#FEE500] text-black hover:bg-[#FEE500]/90">
            <Link to="/onboarding">카카오로 시작하기</Link>
          </Button>
          <Button asChild size="lg" variant="ghost">
            <Link to="/onboarding">게스트로 둘러보기</Link>
          </Button>
          </div>
      </div>
    </div>
  );
}
