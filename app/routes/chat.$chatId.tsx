"use client";

import { useState, useEffect, useRef } from "react";
import {
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
  json,
  redirect,
} from "@remix-run/node";
import { useFetcher, useLoaderData, useLocation } from "@remix-run/react";
import { getAuth } from "@clerk/remix/ssr.server";
import { nanoid } from "nanoid";
import { and, eq, desc, asc, isNotNull, sql } from "drizzle-orm";

import { db, chats, messages, bookmarks, userProfiles } from "~/db";
import { IMessage } from "types";

import { ChatInput } from "~/components/chat/ChatInput";
import { ChatMessage } from "~/components/chat/ChatMessage";
import { TypingIndicator } from "~/components/chat/TypingIndicator";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Bot } from "lucide-react";
import { QuestionLimitIndicator } from "~/components/freemium/QuestionLimitIndicator";
import { PremiumUpgradeModal } from "~/components/freemium/PremiumUpgradeModal";
import { useFreemiumPolicy } from "~/hooks/useFreemiumPolicy";

export const loader = async (args: LoaderFunctionArgs) => {
  const { userId } = await getAuth(args);
  const { chatId } = args.params;

  if (!userId) {
    return redirect("/");
  }

  if (!chatId) {
    return redirect("/chat");
  }

  const userProfile = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.id, userId),
  });

  if (!userProfile) {
    // This case should ideally not happen if user is logged in
    // and has gone through onboarding
    return redirect("/onboarding");
  }

  const chat = await db.query.chats.findFirst({
    where: and(eq(chats.id, chatId), eq(chats.userId, userId)),
  });

  if (!chat) {
    // Or show a "Chat not found" message
    return redirect("/chat");
  }

  const messageList = await db
    .select({
      id: messages.id,
      chatId: messages.chatId,
      role: messages.role,
      content: messages.content,
      createdAt: messages.createdAt,
      isBookmarked: isNotNull(bookmarks.id),
    })
    .from(messages)
    .leftJoin(
      bookmarks,
      and(
        eq(bookmarks.messageId, messages.id),
        eq(bookmarks.userId, userId),
      ),
    )
    .where(eq(messages.chatId, chatId))
    .orderBy(asc(messages.createdAt));

  return json({
    chatId,
    userProfile,
    messages: messageList.map((msg) => ({
      ...msg,
      content: msg.content as any, // Avoid TS errors for content structure
    })),
  });
};

export const action = async (args: ActionFunctionArgs) => {
  const { userId } = await getAuth(args);
  if (!userId) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await args.request.formData();
  const intent = formData.get("_action");

  if (intent === "delete") {
    const { chatId } = args.params;
    if (!chatId) {
      return json({ error: "Chat ID is required" }, { status: 400 });
    }
    
    // Verify user owns the chat before deleting
    const chat = await db.query.chats.findFirst({
      where: and(eq(chats.id, chatId), eq(chats.userId, userId)),
    });

    if (!chat) {
      return json({ error: "Chat not found or permission denied" }, { status: 404 });
    }

    await db.delete(chats).where(eq(chats.id, chatId));
    
    // Redirect to the main chat page so the user doesn't see the deleted chat
    return redirect("/chat");
  }

  // Fallback to existing message sending logic
  const { chatId } = args.params;
  if (!chatId) {
    return json({ error: "Chat ID is required" }, { status: 400 });
  }

  const userMessageContent = formData.get("message") as string;
  if (!userMessageContent) {
    return json({ error: "Message is required" }, { status: 400 });
  }

  // --- Freemium Logic: Check and Update Counts ---
  const profile = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.id, userId),
  });

  if (!profile) {
    return json({ error: "User profile not found." }, { status: 404 });
  }

  // TODO: Implement time-based reset logic here
  // For now, we just check the counts

  const isPremium = profile.membershipTier === 'premium';
  if (!isPremium) {
    if (profile.dailyQuestionsUsed >= 3) { // Use constant later
      return json({ error: "Daily limit reached." }, { status: 429 });
    }
    if (profile.weeklyQuestionsUsed >= 10) { // Use constant later
      return json({ error: "Weekly limit reached." }, { status: 429 });
    }
    if (profile.monthlyQuestionsUsed >= 30) { // Use constant later
      return json({ error: "Monthly limit reached." }, { status: 429 });
    }
  }

  // Define userMessage outside the transaction to use it in history
  const userMessage: IMessage = {
    id: nanoid(),
    role: "user",
    content: userMessageContent,
  };

  // Increment counts in a transaction
  await db.transaction(async (tx) => {
    // 1. Increment user question counts
    await tx.update(userProfiles)
      .set({
        dailyQuestionsUsed: sql`${userProfiles.dailyQuestionsUsed} + 1`,
        weeklyQuestionsUsed: sql`${userProfiles.weeklyQuestionsUsed} + 1`,
        monthlyQuestionsUsed: sql`${userProfiles.monthlyQuestionsUsed} + 1`,
        lastQuestionAt: new Date(),
      })
      .where(eq(userProfiles.id, userId));

    // 2. Save user message
    await tx.insert(messages).values({
      id: userMessage.id,
      chatId: chatId,
      role: userMessage.role,
      content: userMessage.content,
    });
  });

  // Get previous messages to send as history
  const history = await db.query.messages.findMany({
    where: eq(messages.chatId, chatId),
    orderBy: (messages, { asc }) => [asc(messages.createdAt)],
  });

  const fullHistory = [...history, userMessage];

  // 2. Call AI - 내부 서버 통신이므로 인증 정보가 자동으로 포함됨
  const geminiResponse = await fetch(
    new URL("/api/gemini", args.request.url),
    {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        // Clerk 인증 정보만 선택적으로 전달
        ...(args.request.headers.get("authorization") && {
          "authorization": args.request.headers.get("authorization")!
        }),
        ...(args.request.headers.get("cookie") && {
          "cookie": args.request.headers.get("cookie")!
        })
      },
      body: JSON.stringify({ 
        message: userMessageContent, // The current question for vector search
        history: fullHistory // The full conversation history for context
      }),
    }
  );

  if (!geminiResponse.ok) {
    return json({ error: "AI service failed" }, { status: 500 });
  }

  const { reply } = await geminiResponse.json();

  // 3. Save AI message
  const aiMessage: IMessage = {
    id: nanoid(),
    role: "assistant",
    content: reply,
  };
  await db.insert(messages).values({
    id: aiMessage.id,
    chatId: chatId,
    role: aiMessage.role,
    content: aiMessage.content as any,
  });

  return json({ ok: true, message: aiMessage });
};

export default function ChatIdPage() {
  const { messages: initialMessages, chatId, userProfile } = useLoaderData<typeof loader>();
  const [messages, setMessages] = useState<IMessage[]>(initialMessages as IMessage[]);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const fetcher = useFetcher<typeof action>();
  const location = useLocation();
  const isLoading = fetcher.state !== "idle";
  
  // Freemium 정책 훅
  const freemium = useFreemiumPolicy(userProfile);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const highlightedMessageRef = useRef<HTMLDivElement>(null);

  // loader로부터 새로운 initialMessages가 전달될 때마다 messages 상태를 업데이트합니다.
  useEffect(() => {
    setMessages(initialMessages as IMessage[]);
  }, [initialMessages]);

  const scrollToBottom = () => {
    if (highlightedMessageRef.current) {
      highlightedMessageRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    // Scroll to bottom on new message
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Scroll to highlighted message from bookmark
    const hash = location.hash;
    if (hash) {
      // Add a small delay to ensure DOM is updated
      const timer = setTimeout(() => {
        const element = document.getElementById(hash.substring(1));
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          // 카드 요소를 찾아서 테두리 하이라이트 적용
          const cardElement = element.querySelector('[class*="border"]') || element.querySelector('.bg-muted') || element;
          if (cardElement) {
            cardElement.classList.add(
              'border-yellow-400', 
              'border-2', 
              'shadow-lg', 
              'shadow-yellow-200/50',
              'transition-all', 
              'duration-500',
              'ease-out'
            );
            setTimeout(() => {
              cardElement.classList.remove(
                'border-yellow-400',
                'border-2',
                'shadow-lg',
                'shadow-yellow-200/50'
              );
            }, 3000);
          }
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [location.hash, location.key, messages]); // Re-run when hash changes or messages update

  // Add new message from fetcher optimistic UI
  useEffect(() => {
    if (fetcher.data && "message" in fetcher.data) {
        const newMessage = fetcher.data.message as IMessage;
        if (newMessage.chatId === chatId && !messages.find(m => m.id === newMessage.id)) {
            setMessages(prev => [...prev, newMessage]);
        }
    }
  }, [fetcher.data, messages, chatId]);

  const handleSendMessage = async (text: string) => {
    // 🎯 Freemium 질문 제한 체크
    const limitCheck = freemium.checkQuestionLimit();
    
    if (!limitCheck.canAsk) {
      // 질문 제한 도달 시 업그레이드 모달 표시
      setShowUpgradeModal(true);
      return;
    }

    const newUserMessage: IMessage = {
      id: String(Date.now()),
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, newUserMessage]);
    
    // 질문 횟수 증가
    await freemium.incrementQuestionCount();
    
    const formData = new FormData();
    formData.append("message", text);
    fetcher.submit(formData, { method: "post" });
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
      {/* 질문 제한 표시 */}
      <div className="w-full max-w-4xl px-2 sm:px-4 pt-4 mx-auto">
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

      <div className="no-scrollbar w-full flex-1 space-y-4 overflow-y-auto px-2 sm:px-4 pt-4 max-w-4xl mx-auto overscroll-contain">
        {messages.map((msg) => (
          <div key={msg.id} className="w-full min-w-0">
            <ChatMessage
              {...(msg as IMessage)}
              isBookmarked={(msg as any).isBookmarked}
            />
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
            <div className="bg-muted rounded-lg p-3 min-w-0">
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