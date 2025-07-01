import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Check, Crown, Zap, Clock, Calendar, CalendarDays, Heart, LogIn, Gift } from "lucide-react";
import { useFreemiumPolicy } from "~/hooks/useFreemiumPolicy";

interface IPremiumUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  onLogin?: () => void;
}

/**
 * 결제 유도 모달 컴포넌트
 * 질문 제한 도달 시 프리미엄 업그레이드를 유도합니다.
 */
export function PremiumUpgradeModal({ 
  isOpen, 
  onClose, 
  onUpgrade,
  onLogin
}: IPremiumUpgradeModalProps) {
  const {
    isGuest,
    limitType,
    remainingQuestions,
    LIMITS,
  } = useFreemiumPolicy();

  // 게스트 모드에서는 로그인 우선 유도
  if (isGuest) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-lg mx-4">
          <DialogHeader className="text-center space-y-4">
            {/* 아이콘 */}
            <div className="flex justify-center">
              <Heart className="h-8 w-8 text-pink-500" />
            </div>
            
            {/* 제목 */}
            <DialogTitle className="text-xl font-bold">
              체험하기가 끝났어요! 💝
            </DialogTitle>
            
            {/* 설명 */}
            <DialogDescription className="text-base text-gray-600">
              로그인하시면 더 많은 질문을 하실 수 있어요.
            </DialogDescription>
          </DialogHeader>

          {/* 로그인 혜택 */}
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-3">
                <Gift className="h-5 w-5 text-green-600" />
                <h3 className="font-bold text-green-800">로그인 혜택</h3>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700">하루 3회 무료 질문</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700">대화 기록 저장</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700">모든 기기에서 동기화</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700">개인화된 답변</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col gap-3">
            {/* 로그인 버튼 */}
            <Button 
              onClick={onLogin}
              className="w-full bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
              size="lg"
            >
              <LogIn className="h-4 w-4 mr-2" />
              로그인하고 무료로 더 이용하기
            </Button>
            
            {/* 나중에 하기 */}
            <Button variant="ghost" onClick={onClose} className="w-full text-gray-500">
              나중에 하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // 로그인 유저용 프리미엄 업그레이드 모달
  const getLimitMessage = () => {
    switch (limitType) {
      case 'daily':
        return {
          title: "오늘의 무료 질문을 모두 사용했어요! 🌙",
          description: "내일 자정에 다시 3개의 무료 질문이 제공됩니다.",
          icon: <Clock className="h-6 w-6 text-blue-500" />,
          resetInfo: "내일 자정에 질문 횟수 초기화",
        };
      case 'weekly':
        return {
          title: "이번 주 무료 질문을 모두 사용했어요! 📅",
          description: "다음 주 월요일에 다시 10개의 무료 질문이 제공됩니다.",
          icon: <Calendar className="h-6 w-6 text-green-500" />,
          resetInfo: "다음 주 월요일에 질문 횟수 초기화",
        };
      case 'monthly':
        return {
          title: "이번 달 무료 질문을 모두 사용했어요! 📆",
          description: "다음 달 1일에 다시 30개의 무료 질문이 제공됩니다.",
          icon: <CalendarDays className="h-6 w-6 text-purple-500" />,
          resetInfo: "다음 달 1일에 질문 횟수 초기화",
        };
      default:
        return {
          title: "무료 질문을 모두 사용했어요! ⏰",
          description: "프리미엄으로 업그레이드하여 무제한 질문을 이용해보세요.",
          icon: <Zap className="h-6 w-6 text-yellow-500" />,
          resetInfo: "프리미엄으로 무제한 이용",
        };
    }
  };

  const message = getLimitMessage();

  // 프리미엄 혜택 목록 (간소화)
  const premiumBenefits = [
    "🚀 무제한 질문",
    "📚 전문서적 기반 답변",
    "⚡ 우선 응답",
    "💎 프리미엄 콘텐츠",
    "🎯 개인화된 조언",
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center space-y-4">
          {/* 아이콘 */}
          <div className="flex justify-center">
            {message.icon}
          </div>
          
          {/* 제목 */}
          <DialogTitle className="text-xl font-bold">
            {message.title}
          </DialogTitle>
          
          {/* 설명 */}
          <DialogDescription className="text-base text-gray-600">
            {message.description}
          </DialogDescription>

          {/* 리셋 정보 */}
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm text-blue-700">
              💡 {message.resetInfo}
            </p>
          </div>
        </DialogHeader>

        {/* 프리미엄 플랜 소개 */}
        <div className="space-y-4">
          {/* 프리미엄 헤더 */}
          <div className="text-center bg-gradient-to-r from-purple-100 to-pink-100 p-4 rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Crown className="h-5 w-5 text-purple-600" />
              <h3 className="font-bold text-purple-800">프리미엄 플랜</h3>
              <Badge className="bg-purple-600 text-white">추천</Badge>
            </div>
            <div className="text-2xl font-bold text-purple-800">
              월 {LIMITS.SUBSCRIPTION_PRICE.toLocaleString()}원
            </div>
            <p className="text-sm text-purple-600 mt-1">
              하루 커피 한 잔 값으로 무제한!
            </p>
          </div>

          {/* 혜택 목록 (간소화) */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-gray-800 mb-3">
              프리미엄 혜택
            </h4>
            <div className="grid gap-2">
              {premiumBenefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col gap-3">
          {/* 업그레이드 버튼 */}
          <Button 
            onClick={onUpgrade}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            size="lg"
          >
            <Crown className="h-4 w-4 mr-2" />
            프리미엄으로 업그레이드
          </Button>
          
          {/* 닫기 버튼 */}
          <Button variant="ghost" onClick={onClose} className="w-full text-gray-500">
            내일 다시 이용하기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 