import { type LoaderFunctionArgs } from "@remix-run/node";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getAuth } from "@clerk/remix/ssr.server";
import { db, messages } from "~/db";
import { eq, asc } from "drizzle-orm";
import { TIER_PERMISSIONS, MembershipTier } from "types";
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const FREEMIUM_MOCK_MODE = process.env.FREEMIUM_MOCK_MODE === 'true';

const SYSTEM_PROMPT = `
당신은 '예비맘 안심톡'의 AI 어시스턴트 '안심이'입니다. 임신/출산 관련 질문에 따뜻하고 친근한 어조로 답변하세요.

**답변 규칙:**
1. **친근한 대화체**: 딱딱한 설명보다는 친구처럼 자연스럽게 답변하세요.
2. **Context 활용**: 주어진 Context 정보를 자연스럽게 녹여내어 답변하세요.
3. **의료 한계 명시**: 답변 마지막에 "제가 드린 정보는 의학적 조언이 아니니, 꼭 전문의와 상담하여 정확한 정보를 확인하시는 것 잊지 마세요!"를 추가하세요.
4. **정보 부족시**: Context에 관련 정보가 없으면 솔직히 말하고 전문의 상담을 권하세요.
`;

async function getUserMembershipTier(userId: string): Promise<MembershipTier> {
  try {
    const { rows } = await pool.query(
      'SELECT membership_tier FROM user_profiles WHERE id = $1',
      [userId]
    );
    
    if (rows.length === 0) {
      return 'basic';
    }
    
    return rows[0].membership_tier as MembershipTier;
  } catch (error) {
    console.error('❌ [User Tier Error]', error);
    return 'basic';
  }
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const message = url.searchParams.get('message');
  const chatId = url.searchParams.get('chatId');
  
  if (!message) {
    return new Response("Message is required", { status: 400 });
  }

  console.log(`🎯 [Stream API] 스트리밍 시작 - 메시지: ${message}`);

  // Mock 모드
  if (FREEMIUM_MOCK_MODE) {
    console.log('🎭 [Mock Mode] 스트리밍 Mock 응답');
    
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const mockText = `안녕하세요! "${message}"에 대한 답변을 드릴게요. 
이것은 테스트 응답이에요. 실제 서비스에서는 전문가의 검증된 정보를 바탕으로 
정확하고 신뢰할 수 있는 답변을 제공해드릴 거예요. 

제가 드린 정보는 의학적 조언이 아니니, 꼭 전문의와 상담하여 정확한 정보를 확인하시는 것 잊지 마세요!`;
        
        const words = mockText.split(' ');
        
        for (let i = 0; i < words.length; i++) {
          const chunk = words[i] + (i < words.length - 1 ? ' ' : '');
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'token', 
            content: chunk 
          })}\n\n`));
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        // 소스 정보
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
          type: 'sources', 
          sources: [{
            reference: "[Mock] 임신과 출산의 모든 것",
            page: "123-125",
            refType: "book"
          }]
        })}\n\n`));
        
        // 완료 신호
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
        controller.close();
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no"
      }
    });
  }

  // 실제 구현
  try {
    const { userId } = await getAuth({ request, params: {}, context: {} });
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
    
    // 사용자 등급 확인
    let userTier: MembershipTier = 'basic';
    let allowedRefTypes = TIER_PERMISSIONS.basic.allowedRefTypes;
    
    if (userId) {
      userTier = await getUserMembershipTier(userId);
      allowedRefTypes = TIER_PERMISSIONS[userTier].allowedRefTypes;
    }

    // 모델 초기화
    const embeddingModel = genAI.getGenerativeModel({ model: 'gemini-embedding-exp-03-07' });
    const chatModel = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      systemInstruction: SYSTEM_PROMPT,
    });

    // 히스토리 가져오기
    let chatHistory = [];
    if (chatId) {
      const messageList = await db
        .select()
        .from(messages)
        .where(eq(messages.chatId, chatId))
        .orderBy(asc(messages.createdAt))
        .limit(10); // 최근 10개 메시지만

      chatHistory = messageList
        .filter(msg => msg.role === 'user' || msg.role === 'assistant')
        .slice(-6) // 최근 6개만 사용
        .map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: typeof msg.content === 'string' ? msg.content : (msg.content as any).answer || '' }]
        }));

      if (chatHistory.length > 0 && chatHistory[0].role === 'model') {
        chatHistory.shift();
      }
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 1. 임베딩 생성
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'status', 
            message: '관련 정보를 검색하고 있어요...' 
          })}\n\n`));

          const embeddingResult = await embeddingModel.embedContent(message);
          const queryEmbedding = embeddingResult.embedding.values;

          // 2. 벡터 검색
          const refTypeFilter = allowedRefTypes.map(type => `'${type}'`).join(',');
          const embeddingString = `[${queryEmbedding.join(',')}]`;
          
          const { rows: documents } = await pool.query(
            `SELECT * FROM (
               SELECT * FROM match_documents($1, $2, $3) 
               WHERE ref_type IN (${refTypeFilter})
             ) filtered_results
             LIMIT 5`,
            [embeddingString, 0.6, 10]
          );

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'status', 
            message: '답변을 생성하고 있어요...' 
          })}\n\n`));

          // 3. Context 생성
          const context = documents
            .map(doc => `출처: ${doc.reference}\n내용: ${doc.content}`)
            .join('\n\n');

          const augmentedPrompt = `
Context:
${context}

Question:
${message}
          `;

          // 4. 스트리밍 응답 생성
          const chat = chatModel.startChat({ history: chatHistory });
          const result = await chat.sendMessageStream(augmentedPrompt);
          
          let fullResponse = '';
          
          // 스트리밍
          for await (const chunk of result.stream) {
            const text = chunk.text();
            fullResponse += text;
            
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
              type: 'token', 
              content: text 
            })}\n\n`));
          }

          // 5. 소스 정보 전송
          const sources = documents.map(doc => {
            let metadata = {};
            if (doc.metadata) {
              try {
                metadata = typeof doc.metadata === 'string' ? JSON.parse(doc.metadata) : doc.metadata;
              } catch (e) {
                console.error('Metadata parse error:', e);
              }
            }
            return {
              reference: doc.reference,
              refType: doc.ref_type || 'unknown',
              ...metadata
            };
          });

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'sources', 
            sources 
          })}\n\n`));

          // 6. 완료
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'done',
            fullResponse 
          })}\n\n`));
          
          controller.close();
        } catch (error) {
          console.error('❌ [Stream Error]', error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'error', 
            error: 'AI 응답 생성 중 오류가 발생했습니다.' 
          })}\n\n`));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no"
      }
    });
  } catch (error) {
    console.error('❌ [Stream API Error]', error);
    return new Response(
      `data: ${JSON.stringify({
        type: 'error',
        error: '서버 오류가 발생했습니다.'
      })}\n\n`,
      {
        status: 500,
        headers: {
          'Content-Type': 'text/event-stream',
        },
      }
    );
  }
};