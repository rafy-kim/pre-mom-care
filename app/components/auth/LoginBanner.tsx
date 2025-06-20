"use client";

import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";

interface LoginBannerProps {
  onLogin: () => void;
  onDismiss: () => void;
}

export function LoginBanner({ onLogin, onDismiss }: LoginBannerProps) {
  return (
    <div className="animate-in slide-in-from-bottom-5 fade-in duration-500">
      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <p className="text-sm text-dark-gray">
            소중한 대화 기록을 안전하게 저장하고 싶다면?
          </p>
          <div className="flex gap-2">
            <Button
              onClick={onLogin}
              className="bg-yellow-400 text-black hover:bg-yellow-500"
            >
              카카오로 시작하기
            </Button>
            <Button variant="ghost" onClick={onDismiss}>
              나중에 하기
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 