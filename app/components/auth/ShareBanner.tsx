"use client";

import { Button } from "~/components/ui/button";
import { SignInButton } from "@clerk/remix";
import { Share2, Sparkles } from "lucide-react";

export function ShareBanner() {
  return (
    <div className="rounded-lg border border-blue-300 bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            <Sparkles className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-blue-800 flex items-center gap-1">
            임신하고 나서 궁금한 점 많으셨죠?
            </p>
            <p className="text-sm text-blue-700">
              신뢰할 수 있는 답변을 출처와 함께 제공해 주는 '예비맘, 안심 톡'에 물어보세요!
            </p>
          </div>
        </div>
        <div className="flex-shrink-0">
          <SignInButton mode="modal">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
              시작하기
            </Button>
          </SignInButton>
        </div>
      </div>
    </div>
  );
} 