import type { LoaderFunctionArgs } from "@remix-run/node";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  console.log('🧪 [Test SSE] 요청 받음');
  
  const stream = new ReadableStream({
    async start(controller) {
      // 간단한 테스트 메시지들
      const messages = [
        "안녕하세요!",
        "이것은",
        "스트리밍",
        "테스트",
        "메시지입니다."
      ];
      
      for (const msg of messages) {
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ message: msg })}\n\n`));
        await new Promise(resolve => setTimeout(resolve, 500)); // 0.5초 대기
      }
      
      controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
};

import { useState } from "react";

export default function TestSSE() {
  const [messages, setMessages] = useState<string[]>([]);
  const [streamingText, setStreamingText] = useState("");
  
  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">SSE 테스트 페이지</h1>
      <p className="mb-4">브라우저 콘솔을 열고 버튼을 클릭하세요.</p>
      
      <div className="space-y-4">
        <button
          onClick={() => {
            console.log('🚀 SSE 테스트 시작');
            setMessages(prev => [...prev, '🚀 SSE 테스트 시작']);
            const eventSource = new EventSource('/test-sse');
            
            eventSource.onopen = () => {
              console.log('✅ SSE 연결 성공');
              setMessages(prev => [...prev, '✅ SSE 연결 성공']);
            };
            
            eventSource.onmessage = (event) => {
              console.log('📨 메시지 수신:', event.data);
              setMessages(prev => [...prev, `📨 메시지 수신: ${event.data}`]);
            };
            
            eventSource.onerror = (error) => {
              console.error('❌ SSE 오류:', error);
              setMessages(prev => [...prev, '❌ SSE 오류 발생']);
              eventSource.close();
            };
          }}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          기본 SSE 테스트
        </button>
        
        <button
          onClick={() => {
            console.log('🚀 Chat Stream 테스트 시작');
            setMessages(prev => [...prev, '🚀 Chat Stream 테스트 시작']);
            setStreamingText("");
            
            const testMessage = "임신 초기에 입덧이 심한데 어떻게 해야 하나요?";
            const eventSource = new EventSource(`/api/chat/stream?message=${encodeURIComponent(testMessage)}`);
            
            eventSource.onopen = () => {
              console.log('✅ Chat Stream 연결 성공');
              setMessages(prev => [...prev, '✅ Chat Stream 연결 성공']);
            };
            
            eventSource.onmessage = (event) => {
              console.log('📨 스트림 데이터:', event.data);
              const data = JSON.parse(event.data);
              
              if (data.type === 'status') {
                setMessages(prev => [...prev, `📊 상태: ${data.message}`]);
              } else if (data.type === 'token') {
                setStreamingText(prev => prev + data.content);
              } else if (data.type === 'done') {
                setMessages(prev => [...prev, '✅ 스트리밍 완료']);
                eventSource.close();
              }
            };
            
            eventSource.onerror = (error) => {
              console.error('❌ Chat Stream 오류:', error);
              setMessages(prev => [...prev, '❌ Chat Stream 오류 발생']);
              eventSource.close();
            };
          }}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
          Chat Stream API 테스트
        </button>
      </div>
      
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-2">로그:</h2>
        <div className="bg-gray-100 p-4 rounded max-h-60 overflow-y-auto">
          {messages.map((msg, idx) => (
            <div key={idx} className="text-sm mb-1">{msg}</div>
          ))}
        </div>
      </div>
      
      {streamingText && (
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-2">스트리밍 텍스트:</h2>
          <div className="bg-blue-50 p-4 rounded">
            {streamingText}
          </div>
        </div>
      )}
    </div>
  );
}