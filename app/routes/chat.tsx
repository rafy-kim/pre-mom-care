"use client";

import { useState, useEffect, useRef } from "react";
import { Bookmark, MessageSquarePlus, Trash2, Menu, X } from "lucide-react";
import { Button } from "~/components/ui/button";
import { LoginBanner } from "~/components/auth/LoginBanner";
import { IMessage } from "types";
import { Bot } from "lucide-react";
import { type LoaderFunctionArgs, json, redirect } from "@remix-run/node";
import { Form, Link, Outlet, useFetcher, useLoaderData, useParams, useLocation } from "@remix-run/react";
import { getAuth } from "@clerk/remix/ssr.server";
import { SignedIn, SignedOut, UserButton, SignInButton, useAuth } from "@clerk/remix";
import { db, userProfiles, chats, bookmarks } from "~/db";
import { eq, desc } from "drizzle-orm";
import { cn } from "~/lib/utils";
import { format } from "date-fns";
import { ChatInput } from "~/components/chat/ChatInput";
import { ChatMessage } from "~/components/chat/ChatMessage";
import { TypingIndicator } from "~/components/chat/TypingIndicator";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { OnboardingEditModal } from "~/components/onboarding/OnboardingEditModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "~/components/ui/tabs";

export const loader = async (args: LoaderFunctionArgs) => {
  const { userId } = await getAuth(args);

  if (!userId) {
    // Guest user, return with no user-specific data
    return json({ userProfile: null, chatList: [], bookmarks: [] });
  }

  // Logged-in user
  const userProfile = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.id, userId),
  });

  if (!userProfile) {
    return redirect("/onboarding");
  }

  const chatList = await db.query.chats.findMany({
    where: eq(chats.userId, userId),
    orderBy: [desc(chats.createdAt)],
  });

  const userBookmarks = await db.query.bookmarks.findMany({
    where: eq(bookmarks.userId, userId),
    with: {
      message: {
        columns: {
          id: true,
          chatId: true,
          content: true,
        },
      },
    },
    orderBy: [desc(bookmarks.createdAt)],
  });

  return json({ userProfile, chatList, bookmarks: userBookmarks });
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

function getMessagePreview(content: any): string {
  if (typeof content === 'string') {
    return content.substring(0, 80)
  }
  if (typeof content === 'object' && content !== null && 'answer' in content) {
    return (content.answer as string).substring(0, 80)
  }
  return '내용을 표시할 수 없습니다.'
}


export default function ChatPage() {
  const { userProfile, chatList, bookmarks: userBookmarks } = useLoaderData<typeof loader>();
  const { getToken } = useAuth();
  const params = useParams();
  const location = useLocation();
  const fetcher = useFetcher();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isOnboardingEditOpen, setIsOnboardingEditOpen] = useState(false);
  
  // 현재 선택된 메시지 ID 추출
  const selectedMessageId = location.hash.replace('#', '');

  // --- Guest Mode Logic ---
  const [messages, setMessages] = useState<IMessage[]>(MOCK_MESSAGES);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    // This effect is for guest mode chat scrolling
    if (!userProfile) {
      scrollToBottom();
    }
  }, [messages, userProfile]);

  const handleGuestSendMessage = async (text: string) => {
    const newUserMessage: IMessage = {
      id: String(Date.now()),
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, newUserMessage]);
    setIsLoading(true);

    try {
      // Clerk 토큰을 포함하여 API 호출
      const token = await getToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };
      
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch("/api/gemini", {
        method: "POST",
        headers,
        credentials: 'include', // 쿠키 포함
        body: JSON.stringify({ message: text }),
      });
      if (!response.ok) throw new Error("API call failed");
      const { reply } = await response.json();
      const aiResponse: IMessage = {
        id: String(Date.now() + 1),
        role: "assistant",
        content: reply,
      };
      setMessages((prev) => [...prev, aiResponse]);
    } catch (error) {
      console.error("Error fetching AI response:", error);
      const errorResponse: IMessage = {
        id: String(Date.now() + 1),
        role: "assistant",
        content: {
          answer: "죄송합니다. 답변을 생성하는 동안 오류가 발생했습니다.",
          sources: []
        },
      };
      setMessages((prev) => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  };
  // --- End Guest Mode Logic ---

  // --- Logged-In Mode Render ---
  if (userProfile) {
    const dueDate = new Date(userProfile.dueDate);
    const today = new Date();
    const dDay = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    // 임신 주차 계산 (전체 280일 기준)
    const totalPregnancyDays = 280;
    const elapsedDays = totalPregnancyDays - dDay;
    const weeks = Math.floor(elapsedDays / 7);
    const days = elapsedDays % 7;
    const greeting = `${weeks}주 + ${days}일`;
    
    let dDayText = dDay > 0 ? `D - ${dDay}` : dDay === 0 ? "D - Day" : `D + ${-dDay}`;
    
    return (
      <>
        <div className="relative flex h-screen bg-light-gray md:static touch-manipulation">
          {isSidebarOpen && (
            <div 
              className="fixed inset-0 z-10 bg-black/60 md:hidden touch-manipulation"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}
          <aside className={cn(
            "absolute top-0 left-0 z-20 flex h-full w-64 flex-col border-r bg-white transition-transform duration-300 ease-in-out md:relative md:translate-x-0",
            "touch-manipulation overscroll-contain",
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}>
            <Tabs defaultValue="chat" className="flex flex-col flex-1 h-full overflow-y-hidden">
              <div className="relative flex-shrink-0 p-4 border-b">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="chat">대화</TabsTrigger>
                  <TabsTrigger value="bookmark">북마크</TabsTrigger>
                </TabsList>
                <Button variant="ghost" size="icon" className="absolute top-2.5 right-2 md:hidden" onClick={() => setIsSidebarOpen(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="flex-1 min-h-0">
                <TabsContent value="chat" className="flex flex-col h-full m-0 data-[state=active]:flex data-[state=inactive]:hidden">
                  <div className="flex-shrink-0 p-4">
                    <Link to="/chat" className="w-full">
                      <Button className="w-full">
                        <MessageSquarePlus className="w-4 h-4 mr-2"/>
                        새 대화 시작
                      </Button>
                    </Link>
                  </div>
                  <nav className="flex-1 p-2 space-y-1 overflow-y-auto border-t min-h-0">
                    {chatList.map((chat) => (
                      <div
                        key={chat.id}
                        className={cn(
                          "flex items-center justify-between rounded-md group",
                          "md:hover:bg-gray-100 active:bg-gray-100 touch-manipulation",
                          params.chatId === chat.id && "bg-gray-200"
                        )}
                      >
                        <Link
                          to={`/chat/${chat.id}`}
                          className={cn(
                            "flex-grow p-2 text-sm truncate touch-manipulation",
                            params.chatId === chat.id && "font-semibold"
                          )}
                          onClick={() => setIsSidebarOpen(false)}
                        >
                          {chat.title}
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="flex-shrink-0 w-8 h-8 opacity-100 md:opacity-0 md:group-hover:opacity-100 group-active:opacity-100 mx-1 touch-manipulation"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setChatToDelete(chat.id);
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-gray-400 md:hover:text-gray-800 active:text-gray-800" />
                        </Button>
                      </div>
                    ))}
                  </nav>
                </TabsContent>
                <TabsContent value="bookmark" className="flex flex-col h-full m-0 data-[state=active]:flex data-[state=inactive]:hidden">
                  <div className="flex-shrink-0 p-4">
                    <div className="text-sm text-gray-500 font-medium">
                      북마크한 답변
                    </div>
                  </div>
                  <nav className="flex-1 p-2 space-y-2 overflow-y-auto border-t min-h-0">
                    {userBookmarks?.length > 0 ? (
                      userBookmarks.map(bookmark => {
                        const isSelected = selectedMessageId === bookmark.message.id;
                        return (
                          <Link
                            key={bookmark.id}
                            to={`/chat/${bookmark.message.chatId}#${bookmark.message.id}`}
                            className={cn(
                              "block rounded-lg p-3 group transition-all duration-200 border touch-manipulation",
                              isSelected 
                                ? "bg-blue-50 border-blue-200 shadow-sm" 
                                : "md:hover:bg-gray-50 active:bg-gray-50 border-gray-100 md:hover:border-gray-200 md:hover:shadow-sm"
                            )}
                            onClick={() => setIsSidebarOpen(false)}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-xs text-muted-foreground font-medium">
                                {format(new Date(bookmark.createdAt), 'MM월 dd일')}
                              </div>
                              <div className={cn(
                                "flex items-center text-xs transition-opacity",
                                isSelected ? "opacity-100 text-blue-600" : "opacity-0 md:group-hover:opacity-100 group-active:opacity-100 text-blue-500"
                              )}>
                                <Bookmark className="h-3 w-3 mr-1 fill-current" />
                                <span>저장됨</span>
                              </div>
                            </div>
                            <div className="text-sm leading-relaxed text-gray-700 line-clamp-3">
                              {getMessagePreview(bookmark.message.content)}
                              {getMessagePreview(bookmark.message.content).length >= 80 && '...'}
                            </div>
                          </Link>
                        );
                      })
                    ) : (
                      <div className="text-center text-gray-500 p-6 rounded-lg bg-gray-50">
                        <Bookmark className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-sm font-medium mb-1">북마크한 답변이 없어요</p>
                        <p className="text-xs">채팅에서 유용한 답변을 북마크해보세요</p>
                      </div>
                    )}
                  </nav>
                </TabsContent>
              </div>
            </Tabs>
            
            <div className="flex-shrink-0 p-4 border-t flex items-center gap-2">
              <UserButton />
              {userProfile && (
                <button 
                  onClick={() => setIsOnboardingEditOpen(true)}
                  className="text-sm overflow-hidden text-ellipsis whitespace-nowrap hover:bg-gray-100 p-2 rounded-md transition-colors flex-1 text-left"
                >
                  <p className="font-semibold">{`${userProfile.baby_nickname} ${
                    userProfile.relation === 'father' ? '아빠' : 
                    userProfile.relation === 'mother' ? '엄마' : 
                    userProfile.relation
                  }`}</p>
                </button>
              )}
            </div>
          </aside>
          <div className="flex flex-1 flex-col">
            <header className="border-b bg-white">
              <div className="mx-auto flex w-full max-w-4xl items-center justify-between p-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    onClick={() => setIsSidebarOpen(true)}
                  >
                    <Menu className="h-6 w-6" />
                  </Button>
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
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setIsOnboardingEditOpen(true)}
                    className="text-right hover:bg-gray-100 p-2 rounded-md transition-colors cursor-pointer"
                  >
                    <p className="text-xs text-muted-foreground">{greeting}</p>
                    <h1 className="text-sm font-medium">{dDayText}</h1>
                  </button>
                </div>
              </div>
            </header>
            <main className="flex flex-1 flex-col overflow-y-hidden">
              <Outlet />
            </main>
          </div>
        </div>
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>정말로 삭제하시겠습니까?</AlertDialogTitle>
              <AlertDialogDescription>
                이 작업은 되돌릴 수 없습니다. 이 대화의 모든 메시지가 영구적으로 삭제됩니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => {
                  if (chatToDelete) {
                    fetcher.submit(
                      { _action: 'delete' },
                      { method: 'post', action: `/chat/${chatToDelete}` }
                    );
                  }
                }}
                className="bg-red-500 hover:bg-red-600"
              >
                삭제
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        {/* 온보딩 정보 수정 모달 */}
        <OnboardingEditModal 
          isOpen={isOnboardingEditOpen}
          onOpenChange={setIsOnboardingEditOpen}
          userProfile={userProfile}
          onSuccess={() => {
            // 수정 완료 후 페이지 새로고침으로 데이터 업데이트
            setTimeout(() => {
              window.location.reload();
            }, 100);
          }}
        />
      </>
    );
  }

  // --- Guest Mode Render ---
  return (
    <div className="flex flex-col h-screen bg-light-gray touch-manipulation">
      <header className="border-b bg-white">
      <div className="mx-auto flex w-full max-w-4xl items-center justify-between p-4">
          <Link to="/chat" className="touch-manipulation">
            <div className="flex items-center gap-2">
              <img
                src="/ansimi.png"
                alt="안심이 로고"
                className="h-8 w-8"
              />
              <span className="text-lg sm:text-xl font-bold text-dark-gray">
                예비맘, 안심 톡
              </span>
            </div>
          </Link>
          <SignedOut>
            <SignInButton mode="modal">
              <Button className="touch-manipulation">시작하기</Button>
            </SignInButton>
          </SignedOut>
        </div>
      </header>

      <main className="flex-1 flex flex-col overflow-y-hidden">
        <div className="flex-1 w-full max-w-4xl px-2 sm:px-4 pt-4 mx-auto space-y-4 overflow-y-auto no-scrollbar overscroll-contain">
          {messages.map((msg) => (
            <div key={msg.id} className="w-full min-w-0">
              <ChatMessage {...msg} />
            </div>
          ))}
          {isLoading && (
            <div className="flex items-start gap-2 sm:gap-3 justify-start w-full min-w-0">
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
        <div className="w-full max-w-4xl px-4 mx-auto mt-auto pb-2">
          <LoginBanner />
        </div>
      </main>

      <footer className="bg-white border-t pb-safe">
        <div className="w-full max-w-4xl p-4 mx-auto">
          <ChatInput onSendMessage={handleGuestSendMessage} isLoading={isLoading} />
        </div>
      </footer>
    </div>
  );
} 