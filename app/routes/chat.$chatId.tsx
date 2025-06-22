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

import { db, chats, messages, bookmarks } from "~/db";
import { IMessage } from "types";

import { ChatInput } from "~/components/chat/ChatInput";
import { ChatMessage } from "~/components/chat/ChatMessage";
import { TypingIndicator } from "~/components/chat/TypingIndicator";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Bot } from "lucide-react";

export const loader = async (args: LoaderFunctionArgs) => {
  const { userId } = await getAuth(args);
  const { chatId } = args.params;

  if (!userId) {
    return redirect("/");
  }

  if (!chatId) {
    return redirect("/chat");
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

  // Get previous messages to send as history
  const history = await db.query.messages.findMany({
    where: eq(messages.chatId, chatId),
    orderBy: (messages, { asc }) => [asc(messages.createdAt)],
  });

  // 1. Save user message
  const userMessage: IMessage = {
    id: nanoid(),
    role: "user",
    content: userMessageContent,
  };
  await db.insert(messages).values({
    id: userMessage.id,
    chatId: chatId,
    role: userMessage.role,
    content: userMessage.content,
  });

  const fullHistory = [...history, userMessage];

  // 2. Call AI
  const geminiResponse = await fetch(
    new URL("/api/gemini", args.request.url),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
  const { messages: initialMessages, chatId } = useLoaderData<typeof loader>();
  const [messages, setMessages] = useState<IMessage[]>(initialMessages as IMessage[]);
  const fetcher = useFetcher<typeof action>();
  const location = useLocation();
  const isLoading = fetcher.state !== "idle";

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
          element.classList.add('bg-yellow-200/50', 'dark:bg-yellow-800/50', 'transition-colors', 'duration-300');
          setTimeout(() => {
            element.classList.remove(
              'bg-yellow-200/50',
              'dark:bg-yellow-800/50',
            );
          }, 2000);
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

  const handleSendMessage = (text: string) => {
    const newUserMessage: IMessage = {
      id: String(Date.now()),
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, newUserMessage]);
    
    const formData = new FormData();
    formData.append("message", text);
    fetcher.submit(formData, { method: "post" });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="no-scrollbar w-full flex-1 space-y-4 overflow-y-auto px-4 pt-4 max-w-4xl mx-auto">
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            {...(msg as IMessage)}
            isBookmarked={(msg as any).isBookmarked}
          />
        ))}
        {isLoading && (
          <div className="flex items-start justify-start gap-3">
            <Avatar>
              <AvatarImage src="/ansimi.png" alt="안심이 마스코트" />
              <AvatarFallback>
                <Bot className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>
            <div className="bg-muted rounded-lg p-3">
              <TypingIndicator />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <footer className="border-t bg-white">
        <div className="w-full max-w-4xl p-4 mx-auto">
          <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
        </div>
      </footer>
    </div>
  );
} 