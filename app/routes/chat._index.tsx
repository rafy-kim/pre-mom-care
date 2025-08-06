"use client";

import { useState, useEffect, useRef } from "react";
import { type ActionFunctionArgs, json, redirect } from "@remix-run/node";
import { useSubmit, useOutletContext, useActionData, useNavigation } from "@remix-run/react";
import { getAuth } from "@clerk/remix/ssr.server";
import { nanoid } from "nanoid";
import { eq, sql } from "drizzle-orm";
import { db, chats, messages, userProfiles } from "~/db";
import { IMessage } from "types";

import { ChatInput } from "~/components/chat/ChatInput";
import { ChatMessage } from "~/components/chat/ChatMessage";
import { TypingIndicator } from "~/components/chat/TypingIndicator";
import { StreamingMessage } from "~/components/chat/StreamingMessage";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Bot } from "lucide-react";
import { LoginBanner } from "~/components/auth/LoginBanner";
import { QuestionLimitIndicator } from "~/components/freemium/QuestionLimitIndicator";
import { PremiumUpgradeModal } from "~/components/freemium/PremiumUpgradeModal";
import { useFreemiumPolicy } from "~/hooks/useFreemiumPolicy";
import { useStreamingChat } from "~/hooks/useStreamingChat";
import { action as geminiAction } from "~/routes/api.gemini";

type ContextType = {
  userProfile: ReturnType<typeof useOutletContext> extends { userProfile: infer T } ? T : never;
};

export const action = async (args: ActionFunctionArgs) => {
  const { userId } = await getAuth(args);
  
  const formData = await args.request.formData();
  const intent = formData.get("_action");
  
  // 스트리밍 후 새 채팅 저장
  if (intent === "saveNewChat") {
    const userMessageContent = formData.get("userMessage") as string;
    const aiResponseStr = formData.get("aiResponse") as string;
    
    if (!userMessageContent || !aiResponseStr || !userId) {
      return json({ error: "Missing required data" }, { status: 400 });
    }
    
    try {
      const aiResponse = JSON.parse(aiResponseStr);
      const newChatId = nanoid();
      
      await db.transaction(async (tx) => {
        // 1. 새 대화 생성
        await tx.insert(chats).values({
          id: newChatId,
          userId: userId,
          title: userMessageContent.substring(0, 50),
        });
        
        // 2. 인사 메시지
        await tx.insert(messages).values({
          id: nanoid(),
          chatId: newChatId,
          role: "assistant",
          content: {
            answer: "안녕하세요! 저는 '안심이'에요. 무엇이든 물어보세요.",
            sources: []
          },
        });
        
        // 3. 사용자 메시지
        await tx.insert(messages).values({
          id: nanoid(),
          chatId: newChatId,
          role: "user",
          content: userMessageContent,
        });
        
        // 4. AI 메시지
        await tx.insert(messages).values({
          id: nanoid(),
          chatId: newChatId,
          role: "assistant",
          content: aiResponse,
        });
      });
      
      return redirect(`/chat/${newChatId}`);
    } catch (error) {
      console.error('❌ [saveNewChat] 오류:', error);
      return json({ error: "Failed to save chat" }, { status: 500 });
    }
  }
  
  // 기존 로직 (폴백용)
  const userMessageContent = formData.get("message") as string;
  if (!userMessageContent) {
    return json({ error: "Message is required" }, { status: 400 });
  }

  const newChatId = nanoid();

  // 사용자 메시지 정의
  const userMessage: IMessage = {
    id: nanoid(),
    role: "user",
    content: userMessageContent,
  };
  
  // 게스트/로그인 사용자 구분 처리
  if (userId) {
    // 로그인 사용자 - DB에 대화 기록 저장
    await db.transaction(async (tx) => {
      // 1. 새 대화(chat) 생성
      await tx.insert(chats).values({
        id: newChatId,
        userId: userId,
        title: userMessageContent.substring(0, 50), // 첫 메시지를 제목으로 사용
      });

      // 2. 초기 인사 메시지 저장
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

      // 질문 카운트 증가는 API에서 처리됨 (중복 제거)
    });
  }

  // 5. AI API 호출하여 질문 제한 체크 및 응답 생성
  try {
    // 개발 환경에서만 AI API 호출 로그 출력
    if (process.env.NODE_ENV === 'development') {
      console.log('🎯 [Server Action] AI API 호출 시작');
    }

    // 🔧 [FIX] 직접 API 액션 함수 호출 (fetch 대신)
    const geminiRequest = new Request(new URL("/api/gemini", args.request.url), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...Object.fromEntries(args.request.headers.entries()), // 모든 헤더 복사
      },
      body: JSON.stringify({ 
        message: userMessageContent,
        history: [userMessage] // 첫 질문이므로 history는 사용자 질문만 포함
      }),
    });

    const geminiResponse = await geminiAction({
      request: geminiRequest,
      params: {},
      context: args.context,
    });

    const responseData = await geminiResponse.json();

    // API에서 Freemium 제한 차단 응답이 온 경우
    if (geminiResponse.status === 429 && responseData.freemiumBlock) {
      console.log('🚫 [Server Action] 질문 제한 차단:', responseData.limitType);
      
      // 로그인 사용자의 경우 생성된 대화방/메시지 롤백
      if (userId) {
        try {
          await db.transaction(async (tx) => {
            await tx.delete(messages).where(eq(messages.chatId, newChatId));
            await tx.delete(chats).where(eq(chats.id, newChatId));
          });
          if (process.env.NODE_ENV === 'development') {
            console.log('🔄 [Server Action] 대화방 롤백 완료');
          }
        } catch (rollbackError) {
          console.error('❌ [SERVER ACTION] 대화방 롤백 실패:', rollbackError);
        }
      }
      
      // Freemium 제한 정보와 함께 에러 응답 반환
      return json({
        error: responseData.error,
        freemiumBlock: true,
        limitType: responseData.limitType,
        remainingQuestions: responseData.remainingQuestions,
        message: responseData.message
      }, { status: geminiResponse.status });
    }

    // API 호출 성공 시 AI 응답 저장 (로그인 사용자만)
    if (geminiResponse.status === 200 && userId) {
      const { reply } = responseData;
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
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ [Server Action] AI 응답 저장 완료');
      }
    }

  } catch (error) {
    console.error("❌ [SERVER ACTION] AI API 호출 오류:", error);
    
    // 네트워크 오류 등으로 API 호출 실패 시 대화방 롤백
    if (userId) {
      try {
        await db.transaction(async (tx) => {
          await tx.delete(messages).where(eq(messages.chatId, newChatId));
          await tx.delete(chats).where(eq(chats.id, newChatId));
        });
        if (process.env.NODE_ENV === 'development') {
          console.log('🔄 [Server Action] 오류로 인한 대화방 롤백 완료');
        }
      } catch (rollbackError) {
        console.error('❌ [SERVER ACTION] 롤백 실패:', rollbackError);
      }
    }
    
    return json({ 
      error: "AI 서비스에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요." 
    }, { status: 500 });
  }
  
  // 6. 성공 시 생성된 대화 페이지로 리디렉션 (로그인 사용자만)
  if (userId) {
    console.log('✅ [SERVER ACTION] 새 대화 생성 완료 - 리디렉션:', newChatId);
    return redirect(`/chat/${newChatId}`);
  } else {
    // 게스트 사용자는 현재 페이지에 머물면서 메시지만 표시
    console.log('✅ [SERVER ACTION] 게스트 사용자 응답 완료');
    const { reply } = responseData;
    return json({ 
      success: true, 
      reply: reply,
      message: "게스트 모드에서 질문이 처리되었습니다." 
    });
  }
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
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [processedActionId, setProcessedActionId] = useState<string | null>(null); // 처리된 액션 ID 추적
  const [tempChatId, setTempChatId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const submit = useSubmit();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const { userProfile } = useOutletContext<ContextType>();
  
  // Freemium 정책 훅
  const freemium = useFreemiumPolicy(userProfile);
  
  // 스트리밍 채팅 훅
  const { isStreaming, streamingMessage, sendMessage } = useStreamingChat({
    chatId: tempChatId || 'new',
    onMessageComplete: async (aiMessage) => {
      setMessages((prev) => [...prev, aiMessage]);
      
      // 로그인 사용자의 경우 서버에 저장
      if (userProfile) {
        // 새 채팅 생성과 메시지 저장을 한 번에 처리
        const formData = new FormData();
        formData.append("_action", "saveNewChat");
        formData.append("userMessage", messages[messages.length - 1].content as string);
        formData.append("aiResponse", JSON.stringify(aiMessage.content));
        submit(formData, { method: "post" });
      }
    },
    onError: (error) => {
      console.error('스트리밍 오류:', error);
      // 폴백: 기존 API 사용
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.role === "user") {
        const formData = new FormData();
        formData.append("message", lastMessage.content as string);
        submit(formData, { method: "post" });
      }
    }
  });
  
  const isLoading = navigation.state !== "idle" || isStreaming;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 서버 액션 결과 처리 (완전한 중복 처리 방지)
  useEffect(() => {
    if (!actionData) return;
    
    // actionData의 내용으로 고유 ID 생성 (Date.now 제거)
    const actionId = JSON.stringify(actionData);
    
    // 이미 처리된 액션인지 확인
    if (processedActionId === actionId) {
      console.log('🔄 [CLIENT] 이미 처리된 액션 - 스킵');
      return;
    }
    
    console.log('🎯 [CLIENT] 새로운 서버 액션 결과 수신:', actionData);
    console.log('🔍 [CLIENT] actionData 상세 분석:', {
      hasReply: 'reply' in actionData,
      hasUserCounts: 'userCounts' in actionData,
      hasFreemiumBlock: 'freemiumBlock' in actionData,
      hasError: 'error' in actionData,
      hasSuccess: 'success' in actionData,
      fullData: actionData
    });
    
    // 현재 액션을 처리됨으로 표시
    setProcessedActionId(actionId);
    
    // Freemium 제한 차단 응답 처리
    if ('freemiumBlock' in actionData && actionData.freemiumBlock) {
      console.log('🚫 [CLIENT] 서버에서 제한 차단:', actionData.limitType);
      
      // UI에서 마지막 사용자 메시지 제거 (전송되지 않았으므로)
      setMessages((prev) => prev.slice(0, -1));
      
      // 업그레이드 모달 표시 (한 번만)
      setShowUpgradeModal(true);
      return;
    }
    
    // 에러 응답 처리
    if ('error' in actionData && actionData.error && !('freemiumBlock' in actionData)) {
      console.error('❌ [CLIENT] 서버 액션 오류:', actionData.error);
      
      // UI에서 마지막 사용자 메시지 제거
      setMessages((prev) => prev.slice(0, -1));
      
      // 오류 메시지 표시
      const errorMessage: IMessage = {
        id: String(Date.now() + 1),
        role: "assistant",
        content: {
          answer: actionData.error || "죄송합니다. 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
          sources: []
        },
      };
      setMessages((prev) => [...prev, errorMessage]);
      return;
    }
    
    // 게스트 모드 성공 처리
    if ('success' in actionData && actionData.success) {
      console.log('✅ [CLIENT] 게스트 모드 응답 완료');
      freemium.incrementQuestionCount(); // 게스트 카운트 증가
    }
    
    // 🎯 로그인 사용자 성공 처리 - 서버에서 받은 최신 카운트로 UI 업데이트
    if ('reply' in actionData && actionData.reply && 'userCounts' in actionData && (actionData as any).userCounts) {
      console.log('✅ [CLIENT] 로그인 사용자 질문 성공 - 카운트 업데이트:', (actionData as any).userCounts);
      console.log('🔍 [CLIENT] freemium.updateUserCounts 호출 전 상태:', {
        currentCounts: {
          daily: freemium.dailyQuestionsUsed,
          weekly: freemium.weeklyQuestionsUsed, 
          monthly: freemium.monthlyQuestionsUsed
        },
        newCounts: (actionData as any).userCounts
      });
      freemium.updateUserCounts((actionData as any).userCounts);
      console.log('🔍 [CLIENT] freemium.updateUserCounts 호출 완료');
    }
  }, [actionData]); // freemium dependency 제거

  // 스크롤 업데이트 (스트리밍 중에도)
  useEffect(() => {
    if (isStreaming) {
      scrollToBottom();
    }
  }, [streamingMessage, isStreaming]);

  const handleSendMessage = async (text: string) => {
    console.log('🎯 [CLIENT] handleSendMessage 호출됨:', text);
    
    // Freemium 체크
    const questionLimitCheck = freemium.checkQuestionLimit();
    console.log('🔍 [handleSendMessage] Freemium 체크:', {
      canAsk: questionLimitCheck.canAsk,
      limitType: questionLimitCheck.limitType,
      remainingQuestions: questionLimitCheck.remainingQuestions,
      isSubscribed: freemium.isSubscribed,
    });
    
    if (!questionLimitCheck.canAsk) {
      console.log('❌ [handleSendMessage] Freemium 제한');
      setShowUpgradeModal(true);
      return;
    }
    
    // UI 표시용 메시지 추가
    const newUserMessage: IMessage = {
      id: String(Date.now()),
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, newUserMessage]);

    // 새로운 제출이므로 이전 처리 상태 초기화
    setProcessedActionId(null);

    // 스트리밍 API 사용
    console.log('🚀 [handleSendMessage] 스트리밍 시작');
    await sendMessage(text);
  };

  // 모달 닫기 핸들러
  const handleCloseModal = () => {
    console.log('🔽 [CLIENT] 모달 닫기');
    setShowUpgradeModal(false);
    // 다음 액션을 위해 상태 초기화
    setProcessedActionId(null);
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
        {isStreaming && streamingMessage && (
          <div className="w-full min-w-0">
            <ChatMessage
              id="streaming"
              role="assistant"
              content={{
                answer: streamingMessage,
                sources: []
              }}
              isStreaming={true}
            />
          </div>
        )}
        {/* 스트리밍 메시지가 없지만 스트리밍 중이거나, 로딩 중인 경우 로딩 표시 */}
        {((isStreaming && !streamingMessage) || (isLoading && !isStreaming)) && (
          <StreamingMessage />
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
      />
    </div>
  );
} 