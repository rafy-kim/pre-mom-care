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
import { StreamingMessage } from "~/components/chat/StreamingMessage";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Bot } from "lucide-react";
import { QuestionLimitIndicator } from "~/components/freemium/QuestionLimitIndicator";
import { PremiumUpgradeModal } from "~/components/freemium/PremiumUpgradeModal";
import { useFreemiumPolicy } from "~/hooks/useFreemiumPolicy";
import { useStreamingChat } from "~/hooks/useStreamingChat";
import { action as geminiAction } from "~/routes/api.gemini";

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

  const { chatId } = args.params;
  if (!chatId) {
    return json({ error: "Chat ID is required" }, { status: 400 });
  }

  const formData = await args.request.formData();
  const intent = formData.get("_action");

  // 스트리밍된 메시지 저장
  if (intent === "saveStreamedMessage") {
    const message = formData.get("message") as string;
    const aiResponse = formData.get("aiResponse") as string;
    
    if (!message || !aiResponse) {
      return json({ error: "Missing message or AI response" }, { status: 400 });
    }
    
    try {
      const parsedResponse = JSON.parse(aiResponse);
      
      // 사용자 메시지 저장
      const userMessageId = nanoid();
      await db.insert(messages).values({
        id: userMessageId,
        chatId: chatId,
        role: "user",
        content: message,
      });
      
      // AI 메시지 저장
      await db.insert(messages).values({
        id: nanoid(),
        chatId: chatId,
        role: "assistant",
        content: parsedResponse,
      });
      
      return json({ ok: true });
    } catch (error) {
      console.error('❌ [스트리밍 메시지 저장] 오류:', error);
      return json({ error: "Failed to save message" }, { status: 500 });
    }
  }

  if (intent === "delete") {
    
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

  const userMessageContent = formData.get("message") as string;
  if (!userMessageContent) {
    return json({ error: "Message is required" }, { status: 400 });
  }

  // Define userMessage for history
  const userMessage: IMessage = {
    id: nanoid(),
    role: "user",
    content: userMessageContent,
  };

  // Save user message first (질문 카운트는 API에서 처리)
  await db.insert(messages).values({
    id: userMessage.id,
    chatId: chatId,
    role: userMessage.role,
    content: userMessage.content,
  });

  // Get previous messages to send as history
  const history = await db.query.messages.findMany({
    where: eq(messages.chatId, chatId),
    orderBy: (messages, { asc }) => [asc(messages.createdAt)],
  });

  const fullHistory = [...history, userMessage];

  // 2. Call AI API with Freemium check
  try {
    // 🔧 [FIX] 직접 API 액션 함수 호출 (fetch 대신)
    const geminiRequest = new Request(new URL("/api/gemini", args.request.url), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...Object.fromEntries(args.request.headers.entries()), // 모든 헤더 복사
      },
      body: JSON.stringify({ 
        message: userMessageContent, // The current question for vector search
        history: fullHistory // The full conversation history for context
      }),
    });

    const geminiResponse = await geminiAction({
      request: geminiRequest,
      params: {},
      context: args.context,
    });

    const responseData = await geminiResponse.json();

    // Freemium 제한 차단 응답 처리
    if (geminiResponse.status === 429 && responseData.freemiumBlock) {
      // 저장된 사용자 메시지 롤백
      await db.delete(messages).where(eq(messages.id, userMessage.id));
      
      // Freemium 제한 정보 반환
      return json({
        error: responseData.error,
        freemiumBlock: true,
        limitType: responseData.limitType,
        remainingQuestions: responseData.remainingQuestions,
        message: responseData.message
      }, { status: geminiResponse.status });
    }

    // 기타 API 오류
    if (geminiResponse.status !== 200) {
      console.error('❌ [CHAT ACTION] AI API 오류:', responseData);
      // 저장된 사용자 메시지 롤백
      await db.delete(messages).where(eq(messages.id, userMessage.id));
      return json({ error: responseData.error || "AI service failed" }, { status: 500 });
    }

    // 성공 응답 처리
    const { reply, userCounts } = responseData;

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

    // 응답에 userCounts 포함 (있는 경우)
    const response: any = { ok: true, message: aiMessage };
    if (userCounts) {
      response.userCounts = userCounts;
    }
    
    return json(response);

  } catch (error) {
    console.error('❌ [CHAT ACTION] AI API 네트워크 오류:', error);
    
    // 저장된 사용자 메시지 롤백
    await db.delete(messages).where(eq(messages.id, userMessage.id));
    
    return json({ 
      error: "AI 서비스에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요." 
    }, { status: 500 });
  }
};

export default function ChatIdPage() {
  const { chatId, userProfile, messages: initialMessages } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const location = useLocation();
  const [messages, setMessages] = useState<IMessage[]>(initialMessages as IMessage[]);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  // fetcher의 이전 상태를 추적하기 위한 ref
  const prevFetcherState = useRef(fetcher.state);

  // Freemium 정책 훅
  const freemium = useFreemiumPolicy(userProfile);

  // 사용자 메시지를 저장할 ref
  const lastUserMessageRef = useRef<string>("");

  // 스트리밍 채팅 훅
  const { isStreaming, streamingMessage, sendMessage } = useStreamingChat({
    chatId,
    onMessageComplete: async (aiMessage) => {
      setMessages((prev) => [...prev, aiMessage]);
      
      // 서버에 메시지 저장
      const formData = new FormData();
      formData.append("_action", "saveStreamedMessage");
      formData.append("message", lastUserMessageRef.current);
      formData.append("aiResponse", JSON.stringify(aiMessage.content));
      fetcher.submit(formData, { method: "post" });
    },
    onError: (error) => {
      console.error('스트리밍 오류, 폴백 사용:', error);
      // 폴백: 기존 API 사용
      if (lastUserMessageRef.current) {
        const formData = new FormData();
        formData.append("message", lastUserMessageRef.current);
        fetcher.submit(formData, { method: "post" });
      }
    }
  });

  const isLoading = fetcher.state !== "idle" || isStreaming;

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const highlightedMessageRef = useRef<HTMLDivElement>(null);
  
  // 스트리밍 중일 때도 자동 스크롤
  useEffect(() => {
    if (isStreaming || messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [streamingMessage, messages, isStreaming]);


  // loader로부터 새로운 initialMessages가 전달될 때마다 messages 상태를 업데이트합니다.
  useEffect(() => {
    setMessages(initialMessages as IMessage[]);
  }, [initialMessages]);

  // chatId가 변경될 때 모든 상태 초기화 (가장 중요한 부분!)
  useEffect(() => {
    setShowUpgradeModal(false); // 모달 닫기
  }, [chatId]);

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
    if (fetcher.data) {
      // 에러 처리
      if ("error" in fetcher.data) {
        console.error('❌ [fetcher] 에러:', fetcher.data.error);
        // 에러 메시지를 사용자에게 표시
        const errorMessage: IMessage = {
          id: String(Date.now()),
          role: "assistant",
          content: {
            answer: "죄송합니다. 메시지 저장 중 오류가 발생했습니다. 다시 시도해주세요.",
            sources: []
          }
        };
        setMessages(prev => {
          // 마지막 메시지가 스트리밍 메시지인 경우 교체
          const lastMessage = prev[prev.length - 1];
          if (lastMessage && lastMessage.role === "assistant") {
            return [...prev.slice(0, -1), errorMessage];
          }
          return [...prev, errorMessage];
        });
      } 
      // 정상 응답 처리
      else if ("message" in fetcher.data) {
        const newMessage = fetcher.data.message as IMessage;
        if (newMessage.chatId === chatId && !messages.find(m => m.id === newMessage.id)) {
            setMessages(prev => [...prev, newMessage]);
        }
      }
    }
  }, [fetcher.data, messages, chatId]);

  const handleSendMessage = async (text: string) => {
    console.log('🎯 [handleSendMessage] 호출됨 - 메시지:', text);
    
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

    const newUserMessage: IMessage = {
      id: String(Date.now()),
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, newUserMessage]);
    
    // 사용자 메시지 저장 (나중에 서버로 전송)
    lastUserMessageRef.current = text;
    
    console.log('🚀 [handleSendMessage] 스트리밍 sendMessage 호출 예정');
    
    try {
      // 새로운 스트리밍 훅 사용
      await sendMessage(text);
      console.log('✅ [handleSendMessage] 스트리밍 완료');
    } catch (error) {
      console.error('❌ [handleSendMessage] 스트리밍 오류:', error);
    }
  };

  // fetcher 응답 처리 (fetcher.state가 변경될 때만)
  useEffect(() => {
    // fetcher가 실행을 마치고 'idle' 상태로 돌아왔을 때만 데이터 처리
    const isFetchCompleted = prevFetcherState.current !== 'idle' && fetcher.state === 'idle';

    if (isFetchCompleted && fetcher.data) {
      if ("freemiumBlock" in fetcher.data && fetcher.data.freemiumBlock) {
        const errorData = fetcher.data as any;
        
        const lastMessage = messages[messages.length - 1];
        if (lastMessage && lastMessage.role === "user") {
          setMessages((prev) => prev.slice(0, -1));
        }
        setShowUpgradeModal(true);
      } else if ("error" in fetcher.data && !("freemiumBlock" in fetcher.data)) {
        console.error('❌ [CHAT CLIENT] 서버 오류:', (fetcher.data as any).error);
        
        const lastMessage = messages[messages.length - 1];
        if (lastMessage && lastMessage.role === "user") {
          setMessages((prev) => prev.slice(0, -1));
        }
        
        const errorMessage: IMessage = {
          id: String(Date.now()),
          role: "assistant",
          content: {
            answer: (fetcher.data as any).error || "죄송합니다. 일시적인 오류가 발생했습니다.",
            sources: []
          },
        };
        setMessages((prev) => [...prev, errorMessage]);
      } else if ('userCounts' in fetcher.data && (fetcher.data as any).userCounts) {
        freemium.updateUserCounts((fetcher.data as any).userCounts);
      }
    }

    // 현재 fetcher 상태를 다음 렌더링을 위해 저장
    prevFetcherState.current = fetcher.state;
  }, [fetcher.state, fetcher.data, messages, freemium]);

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