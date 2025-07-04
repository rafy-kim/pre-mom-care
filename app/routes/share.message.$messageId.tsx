import { useState } from "react";
import { Button } from "~/components/ui/button";
import { ShareBanner } from "~/components/auth/ShareBanner";
import { IMessage } from "types";
import { type LoaderFunctionArgs, json, type MetaFunction } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { getAuth } from "@clerk/remix/ssr.server";
import { SignedOut, SignInButton } from "@clerk/remix";
import { db, messages } from "~/db";
import { eq } from "drizzle-orm";
import { ChatMessage } from "~/components/chat/ChatMessage";
import { BusinessFooter } from "~/components/layout/BusinessFooter";

export const loader = async (args: LoaderFunctionArgs) => {
  const { params } = args;
  const { messageId } = params;

  if (!messageId) {
    throw new Response("Message ID is required", { status: 400 });
  }

  // 메시지 조회 (로그인 상태와 무관하게)
  const message = await db.query.messages.findFirst({
    where: eq(messages.id, messageId),
  });

  if (!message) {
    throw new Response("Message not found", { status: 404 });
  }

  // IMessage 형태로 변환
  const formattedMessage: IMessage = {
    id: message.id,
    role: message.role as "user" | "assistant",
    content: message.content as string | { answer: string; sources: any[] },
  };

  return json({ message: formattedMessage });
};

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data?.message) {
    return [
      { title: "메시지를 찾을 수 없습니다 | 예비맘, 안심 톡" },
      { name: "description", content: "요청하신 메시지를 찾을 수 없습니다." },
    ];
  }

  const textContent = typeof data.message.content === 'string' 
    ? data.message.content 
    : data.message.content.answer;
  
  const previewText = textContent.substring(0, 150) + (textContent.length > 150 ? '...' : '');

  return [
    { title: `공유된 답변 | 예비맘, 안심 톡` },
    { name: "description", content: previewText },
    { property: "og:title", content: "예비맘, 안심 톡 - AI 답변" },
    { property: "og:description", content: previewText },
    { property: "og:type", content: "article" },
    { property: "og:site_name", content: "예비맘, 안심 톡" },
    { name: "twitter:card", content: "summary" },
    { name: "twitter:title", content: "예비맘, 안심 톡 - AI 답변" },
    { name: "twitter:description", content: previewText },
  ];
};

export default function SharedMessagePage() {
  const { message } = useLoaderData<typeof loader>();

  return (
    <div className="flex flex-col min-h-screen bg-light-gray">
      <header className="border-b bg-white">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between p-4">
          <Link to="/chat">
            <div className="flex items-center gap-2">
              <img
                src="/ansimi.png"
                alt="안심이 로고"
                className="h-8 w-8"
              />
              <span className="text-xl font-bold text-dark-gray">
                예비맘, 안심 톡
              </span>
            </div>
          </Link>
          <SignedOut>
            <SignInButton mode="modal">
              <Button>시작하기</Button>
            </SignInButton>
          </SignedOut>
        </div>
      </header>

      <main className="flex-1 flex flex-col overflow-y-hidden">
        <div className="flex-1 w-full max-w-4xl px-4 pt-8 pb-6 mx-auto space-y-4 overflow-y-auto no-scrollbar">
          <ChatMessage 
            {...message} 
            isBookmarked={false}
            disableActions={true}
          />
        </div>
        
        <div className="w-full max-w-4xl px-4 mx-auto mt-auto pb-2">
          <ShareBanner />
        </div>
      </main>
      
      {/* 사업자 정보 푸터 */}
      <BusinessFooter />
    </div>
  );
} 