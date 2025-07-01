"use client";

import { useState, useEffect, useRef } from "react";
import { type ActionFunctionArgs, json, redirect } from "@remix-run/node";
import { useSubmit, useOutletContext } from "@remix-run/react";
import { getAuth } from "@clerk/remix/ssr.server";
import { nanoid } from "nanoid";
import { eq, sql } from "drizzle-orm";
import { db, chats, messages, userProfiles } from "~/db";
import { IMessage } from "types";

import { ChatInput } from "~/components/chat/ChatInput";
import { ChatMessage } from "~/components/chat/ChatMessage";
import { TypingIndicator } from "~/components/chat/TypingIndicator";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Bot } from "lucide-react";
import { LoginBanner } from "~/components/auth/LoginBanner";
import { QuestionLimitIndicator } from "~/components/freemium/QuestionLimitIndicator";
import { PremiumUpgradeModal } from "~/components/freemium/PremiumUpgradeModal";
import { useFreemiumPolicy } from "~/hooks/useFreemiumPolicy";

type ContextType = {
  userProfile: ReturnType<typeof useOutletContext> extends { userProfile: infer T } ? T : never;
};

export const action = async (args: ActionFunctionArgs) => {
  const { userId } = await getAuth(args);
  
  // 🎯 [SERVER FREEMIUM] 서버에서도 Freemium 체크 추가
  console.log('🎯 [SERVER FREEMIUM] 서버 액션 호출됨 - userId:', userId);
  
  if (!userId) {
    // 게스트 사용자 - Freemium 제한 체크
    console.log('🎯 [SERVER FREEMIUM] 게스트 사용자 감지 - 제한 체크 필요');
    return json({ 
      error: "Guest limit reached", 
      freemiumBlock: true,
      message: "게스트는 1회 제한입니다. 로그인해주세요." 
    }, { status: 403 });
  }

  const formData = await args.request.formData();
  const userMessageContent = formData.get("message") as string;

  if (!userMessageContent) {
    return json({ error: "Message is required" }, { status: 400 });
  }

  // --- Freemium Logic: Check and Update Counts ---
  const profile = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.id, userId),
  });

  if (!profile) {
    // Onboarding을 거쳤다면 항상 프로필이 있어야 함
    return json({ error: "User profile not found." }, { status: 404 });
  }
  
  // TODO: 시간 기반 리셋 로직 구현
  const isPremium = profile.membershipTier === 'premium';
  if (!isPremium) {
    // TODO: 상수 또는 설정 값으로 변경
    if (profile.dailyQuestionsUsed >= 3) {
      return json({ error: "Daily limit reached." }, { status: 429 });
    }
    if (profile.weeklyQuestionsUsed >= 10) {
      return json({ error: "Weekly limit reached." }, { status: 429 });
    }
    if (profile.monthlyQuestionsUsed >= 30) {
      return json({ error: "Monthly limit reached." }, { status: 429 });
    }
  }

  const newChatId = nanoid();

  // 사용자 메시지 정의
  const userMessage: IMessage = {
    id: nanoid(),
    role: "user",
    content: userMessageContent,
  };
  
  // DB 작업을 트랜잭션으로 묶어서 원자성 보장
  await db.transaction(async (tx) => {
    // 1. 새 대화(chat) 생성
    await tx.insert(chats).values({
      id: newChatId,
      userId: userId,
      title: userMessageContent.substring(0, 50), // 첫 메시지를 제목으로 사용
    });

    // 2. 초기 인사 메시지 저장 (이것은 새 대화에만 필요)
    const greetingMessage: IMessage = {
      id: nanoid(),
      role: "assistant",
      content: {
        answer: "안녕하세요! 저는 '안심이'에요. 무엇이든 물어보세요.",
        sources: [] 
      },
    };
    await tx.insert(messages).values({
      id: greetingMessage.id,
      chatId: newChatId,
      role: greetingMessage.role,
      content: greetingMessage.content,
    });

    // 3. 사용자 메시지 저장
    await tx.insert(messages).values({
      id: userMessage.id,
      chatId: newChatId,
      role: userMessage.role,
      content: userMessage.content,
    });

    // 4. 사용자 질문 횟수 증가
    await tx.update(userProfiles)
      .set({
        dailyQuestionsUsed: sql`${userProfiles.dailyQuestionsUsed} + 1`,
        weeklyQuestionsUsed: sql`${userProfiles.weeklyQuestionsUsed} + 1`,
        monthlyQuestionsUsed: sql`${userProfiles.monthlyQuestionsUsed} + 1`,
        lastQuestionAt: new Date(),
      })
      .where(eq(userProfiles.id, userId));
  });

  // 5. 사용자의 첫 메시지에 대한 AI 응답 생성 (트랜잭션 외부에서 수행)
  try {
    const geminiResponse = await fetch(
      new URL("/api/gemini", args.request.url),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(args.request.headers.get("authorization") && {
            "authorization": args.request.headers.get("authorization")!
          }),
          ...(args.request.headers.get("cookie") && {
            "cookie": args.request.headers.get("cookie")!
          })
        },
        body: JSON.stringify({ 
          message: userMessageContent,
          history: [userMessage] // 첫 질문이므로 history는 사용자 질문만 포함
        }),
      }
    );

    if (geminiResponse.ok) {
      const { reply } = await geminiResponse.json();
      const aiMessage: IMessage = {
        id: nanoid(),
        role: "assistant",
        content: reply,
      };
      await db.insert(messages).values({
        id: aiMessage.id,
        chatId: newChatId,
        role: aiMessage.role,
        content: aiMessage.content as any,
      });
    }
  } catch (error) {
    console.error("Error fetching AI response for the first message:", error);
    // AI 첫 응답에 실패하더라도 일단 대화방은 만들어주도록 리디렉션합니다.
  }
  
  // 6. 생성된 대화 페이지로 리디렉션
  return redirect(`/chat/${newChatId}`);
};


const MOCK_MESSAGES: IMessage[] = [
  {
    id: "1",
    role: "assistant",
    content: {
      answer: "안녕하세요! 저는 '안심이'에요. 무엇이든 물어보세요.",
      sources: [] 
    },
  },
];

export default function ChatIndexPage() {
  const [messages, setMessages] = useState<IMessage[]>(MOCK_MESSAGES);
  const [isLoading, setIsLoading] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const submit = useSubmit();
  const { userProfile } = useOutletContext<ContextType>();
  
  // Freemium 정책 훅
  const freemium = useFreemiumPolicy(userProfile);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (text: string) => {
    console.log('🎯 [DEBUG] handleSendMessage 호출됨:', text);
    
    // 🎯 Freemium 질문 제한 체크
    const limitCheck = freemium.checkQuestionLimit();
    console.log('🎯 [DEBUG] 제한 체크 결과:', limitCheck);
    
    if (!limitCheck.canAsk) {
      console.log('🎯 [DEBUG] 질문 제한 도달 - 모달 표시');
      // 질문 제한 도달 시 업그레이드 모달 표시
      setShowUpgradeModal(true);
      return;
    }

    console.log('🎯 [DEBUG] 질문 허용 - 메시지 전송');
    const newUserMessage: IMessage = {
      id: String(Date.now()),
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, newUserMessage]);
    setIsLoading(true);

    // 질문 횟수 증가
    console.log('🎯 [DEBUG] 질문 카운트 증가 시작');
    await freemium.incrementQuestionCount();
    console.log('🎯 [DEBUG] 질문 카운트 증가 완료');

    const formData = new FormData();
    formData.append("message", text);
    submit(formData, { method: "post" });
  };

  // 업그레이드 버튼 클릭 핸들러
  const handleUpgrade = () => {
    // TODO: 실제 결제 페이지로 이동 또는 결제 플로우 시작
    console.log("업그레이드 버튼 클릭됨");
    setShowUpgradeModal(false);
    // 예: window.location.href = "/subscribe";
  };

  // 모달 닫기 핸들러
  const handleCloseModal = () => {
    setShowUpgradeModal(false);
  };

  return (
    <div className="flex h-full flex-col mobile-container">
      {/* 질문 한도 표시 */}
      <div className="mx-auto w-full max-w-4xl px-2 pt-4 sm:px-4">
        <QuestionLimitIndicator
          compact
          isLoading={freemium.isLoading}
          isGuest={freemium.isGuest}
          isSubscribed={freemium.isSubscribed}
          remainingQuestions={freemium.remainingQuestions}
          limitType={freemium.limitType}
          guestQuestionsUsed={freemium.guestQuestionsUsed}
          dailyQuestionsUsed={freemium.dailyQuestionsUsed}
          weeklyQuestionsUsed={freemium.weeklyQuestionsUsed}
          monthlyQuestionsUsed={freemium.monthlyQuestionsUsed}
        />
      </div>
      
      <div className="mx-auto w-full max-w-4xl flex-1 space-y-4 overflow-y-auto px-2 pt-4 no-scrollbar sm:px-4">
        {messages.map((msg) => (
          <div key={msg.id} className="w-full min-w-0">
            <ChatMessage {...msg} />
          </div>
        ))}
        {isLoading && (
          <div className="flex items-start justify-start gap-2 sm:gap-3 w-full min-w-0">
            <Avatar className="flex-shrink-0">
              <AvatarImage src="/ansimi.png" alt="안심이 마스코트" />
              <AvatarFallback>
                <Bot className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>
            <div className="bg-muted rounded-lg min-w-0">
              <TypingIndicator />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <footer className="border-t bg-white pb-safe">
        <div className="w-full max-w-4xl p-4 mx-auto">
          <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
        </div>
      </footer>

      {/* 프리미엄 업그레이드 모달 */}
      <PremiumUpgradeModal
        isOpen={showUpgradeModal}
        onClose={handleCloseModal}
        onUpgrade={handleUpgrade}
      />
    </div>
  );
} 