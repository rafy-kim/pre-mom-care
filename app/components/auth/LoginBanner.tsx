"use client";

import { Button } from "~/components/ui/button";
import { SignInButton } from "@clerk/remix";
import { Info } from "lucide-react";

export function LoginBanner() {
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            <Info className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="font-semibold text-amber-800">
              '둘러보기' 모드는 대화가 저장되지 않아요.
            </p>
            <p className="text-sm text-amber-700">
              소중한 대화 기록을 안전하게 보관하려면 로그인이 필요해요.
            </p>
          </div>
        </div>
        <div className="flex-shrink-0">
          <SignInButton mode="modal">
            <Button size="sm">시작하기</Button>
          </SignInButton>
        </div>
      </div>
    </div>
  );
} 