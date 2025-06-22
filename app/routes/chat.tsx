"use client";

import { useState, useEffect, useRef } from "react";
import { Bookmark, MessageSquarePlus, Trash2, Menu, X } from "lucide-react";
import { Button } from "~/components/ui/button";
import { LoginBanner } from "~/components/auth/LoginBanner";
import { IMessage } from "types";
import { Bot } from "lucide-react";
import { type LoaderFunctionArgs, json, redirect } from "@remix-run/node";
import { Form, Link, Outlet, useFetcher, useLoaderData, useParams } from "@remix-run/react";
import { getAuth } from "@clerk/remix/ssr.server";
import { SignedIn, SignedOut, UserButton, SignInButton } from "@clerk/remix";
import { db, userProfiles, chats } from "~/db";
import { eq, desc } from "drizzle-orm";
import { cn } from "~/lib/utils";
import { ChatInput } from "~/components/chat/ChatInput";
import { ChatMessage } from "~/components/chat/ChatMessage";
import { TypingIndicator } from "~/components/chat/TypingIndicator";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
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
    return json({ userProfile: null, chatList: [] });
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

  return json({ userProfile, chatList });
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


export default function ChatPage() {
  const { userProfile, chatList } = useLoaderData<typeof loader>();
  const params = useParams();
  const fetcher = useFetcher();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    let greeting = `${userProfile.baby_nickname}를 만나기까지`;
    const dueDate = new Date(userProfile.dueDate);
    const today = new Date();
    const dDay = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    let dDayText = dDay > 0 ? `D - ${dDay}` : dDay === 0 ? "D-Day" : `D + ${-dDay}`;
    
    return (
      <>
        <div className="relative flex h-screen bg-light-gray md:static">
          {isSidebarOpen && (
            <div 
              className="fixed inset-0 z-10 bg-black/60 md:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}
          <aside className={cn(
            "absolute top-0 left-0 z-20 flex h-full w-64 flex-col border-r bg-white transition-transform duration-300 ease-in-out md:relative md:translate-x-0",
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}>
            <Tabs defaultValue="chat" className="flex flex-col flex-1 h-full overflow-y-hidden">
              <div className="relative flex-shrink-0 p-4 border-b">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="chat">채팅</TabsTrigger>
                  <TabsTrigger value="bookmark">북마크</TabsTrigger>
                </TabsList>
                <Button variant="ghost" size="icon" className="absolute top-2.5 right-2 md:hidden" onClick={() => setIsSidebarOpen(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto">
                <TabsContent value="chat" className="flex flex-col h-full m-0">
                  <div className="p-4">
                    <Link to="/chat" className="w-full">
                      <Button className="w-full">
                        <MessageSquarePlus className="w-4 h-4 mr-2"/>
                        새 대화 시작
                      </Button>
                    </Link>
                  </div>
                  <nav className="flex-1 p-2 space-y-1 overflow-y-auto border-t">
                    {chatList.map((chat) => (
                      <div
                        key={chat.id}
                        className={cn(
                          "flex items-center justify-between rounded-md group hover:bg-gray-100",
                          params.chatId === chat.id && "bg-gray-200"
                        )}
                      >
                        <Link
                          to={`/chat/${chat.id}`}
                          className={cn(
                            "flex-grow p-2 text-sm truncate",
                            params.chatId === chat.id && "font-semibold"
                          )}
                          onClick={() => setIsSidebarOpen(false)}
                        >
                          {chat.title}
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="flex-shrink-0 w-8 h-8 opacity-0 group-hover:opacity-100 mx-1"
                          onClick={() => {
                            setChatToDelete(chat.id);
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-gray-400 hover:text-gray-800" />
                        </Button>
                      </div>
                    ))}
                  </nav>
                </TabsContent>
                <TabsContent value="bookmark" className="p-4 m-0">
                   <div className="text-center text-sm text-gray-500">
                      북마크한 대화가 여기에 표시됩니다.
                    </div>
                </TabsContent>
              </div>
            </Tabs>
            
            <div className="flex-shrink-0 p-4 border-t flex items-center gap-2">
              <UserButton />
              {userProfile && (
                <div className="text-sm overflow-hidden text-ellipsis whitespace-nowrap">
                  <p className="font-semibold">{`${userProfile.baby_nickname} ${
                    userProfile.relation === 'father' ? '아빠' : 
                    userProfile.relation === 'mother' ? '엄마' : 
                    userProfile.relation
                  }`}</p>
                </div>
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
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{greeting}</p>
                    <h1 className="text-sm font-bold">{dDayText}</h1>
                  </div>
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
      </>
    );
  }

  // --- Guest Mode Render ---
  return (
    <div className="flex flex-col h-screen bg-light-gray">
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
        <div className="flex-1 w-full max-w-4xl px-4 pt-4 mx-auto space-y-4 overflow-y-auto no-scrollbar">
          {messages.map((msg) => (
            <ChatMessage key={msg.id} {...msg} />
          ))}
          {isLoading && (
            <div className="flex items-start gap-3 justify-start">
              <Avatar>
                <AvatarImage src="/ansimi.png" alt="안심이 마스코트" />
                <AvatarFallback>
                  <Bot className="h-6 w-6" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-muted rounded-lg">
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

      <footer className="bg-white border-t">
        <div className="w-full max-w-4xl p-4 mx-auto">
          <ChatInput onSendMessage={handleGuestSendMessage} isLoading={isLoading} />
        </div>
      </footer>
    </div>
  );
} 