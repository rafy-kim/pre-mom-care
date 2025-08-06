import { useState, useRef } from "react";
import { IMessage } from "types";

interface UseStreamingChatOptions {
  chatId: string;
  onMessageComplete?: (message: IMessage) => void;
  onError?: (error: Error) => void;
}

export function useStreamingChat({ chatId, onMessageComplete, onError }: UseStreamingChatOptions) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = async (text: string) => {
    console.log('🚀 [Streaming Hook] 메시지 전송:', text);
    setIsStreaming(true);
    setStreamingMessage("");

    // 이전 요청 취소
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch(`/api/chat/stream?message=${encodeURIComponent(text)}&chatId=${chatId}`, {
        signal: abortController.signal,
        headers: {
          'Accept': 'text/event-stream',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No reader available');
      }

      let accumulatedContent = "";
      let sources: any[] = [];
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // 마지막 라인은 불완전할 수 있으므로 버퍼에 보관
        buffer = lines.pop() || "";
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            try {
              const parsed = JSON.parse(data);
              console.log('📨 [Streaming Hook] 데이터 수신:', parsed);
              
              if (parsed.type === 'status') {
                console.log('📊 상태:', parsed.message);
              } else if (parsed.type === 'token') {
                accumulatedContent += parsed.content;
                setStreamingMessage(accumulatedContent);
              } else if (parsed.type === 'sources') {
                sources = parsed.sources;
              } else if (parsed.type === 'done') {
                const aiMessage: IMessage = {
                  id: String(Date.now()),
                  role: "assistant",
                  content: {
                    answer: parsed.fullResponse || accumulatedContent,
                    sources: sources
                  }
                };
                
                setStreamingMessage("");
                setIsStreaming(false);
                onMessageComplete?.(aiMessage);
                
                console.log('✅ [Streaming Hook] 완료');
                return;
              } else if (parsed.type === 'error') {
                throw new Error(parsed.error);
              }
            } catch (e) {
              console.error('❌ [Streaming Hook] 파싱 오류:', e);
            }
          }
        }
      }
    } catch (error: any) {
      console.error('❌ [Streaming Hook] 오류:', error);
      setIsStreaming(false);
      setStreamingMessage("");
      
      if (error.name !== 'AbortError') {
        onError?.(error);
      }
    }
  };

  const cancelStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setStreamingMessage("");
  };

  return {
    isStreaming,
    streamingMessage,
    sendMessage,
    cancelStreaming,
  };
}