import { json, ActionFunctionArgs } from "@remix-run/node";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getAuth } from "@clerk/remix/ssr.server";
import { TIER_PERMISSIONS, MembershipTier } from "types";
import pg from 'pg';

// 🔧 디버그 모드 설정 - 배포시 false로 설정하세요
const DEBUG_MODE = false;

// 🎭 Freemium Mock 모드 설정 - 개발/테스트 환경에서 API 비용 절약
const FREEMIUM_MOCK_MODE = process.env.FREEMIUM_MOCK_MODE === 'true';

// 디버그 로그 헬퍼 함수
const debugLog = DEBUG_MODE ? console.log : () => {};
const debugError = DEBUG_MODE ? console.error : () => {};

// Mock 모드 로그 헬퍼 함수
const mockLog = (message: string) => {
  console.log(`🎭 [Mock Mode] ${message}`);
};

// Initialize a connection pool to the Neon database
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

// API 비용 계산을 위한 상수 (Gemini 2.5 Flash 가격 정책)
const GEMINI_PRICING = {
  // Gemini 2.5 Flash 유료 등급 가격 (per 1M tokens)
  INPUT_COST_PER_MILLION: 0.30,    // $0.30 per 1M tokens
  OUTPUT_COST_PER_MILLION: 2.50,   // $2.50 per 1M tokens
  // 임베딩 모델 (gemini-embedding-exp-03-07)은 현재 무료
  EMBEDDING_COST_PER_MILLION: 0.00, // 무료
  USD_TO_KRW: 1400 // 환율: 1달러 = 1400원
};

/**
 * API 비용을 계산하고 로그를 출력하는 함수
 */
function calculateAndLogCost(
  embeddingTokens: number,
  inputTokens: number,
  outputTokens: number,
  operation: string = "API Call"
) {
  // 각 API별 비용 계산 (USD)
  const embeddingCostUSD = (embeddingTokens / 1_000_000) * GEMINI_PRICING.EMBEDDING_COST_PER_MILLION;
  const inputCostUSD = (inputTokens / 1_000_000) * GEMINI_PRICING.INPUT_COST_PER_MILLION;
  const outputCostUSD = (outputTokens / 1_000_000) * GEMINI_PRICING.OUTPUT_COST_PER_MILLION;
  const totalCostUSD = embeddingCostUSD + inputCostUSD + outputCostUSD;
  
  // 원화 환산
  const totalCostKRW = totalCostUSD * GEMINI_PRICING.USD_TO_KRW;
  
  console.log(`\n💰 [${operation} 비용 분석]`);
  console.log(`┌─────────────────────────────────────────────────────────┐`);
  console.log(`│ 📊 토큰 사용량                                          │`);
  console.log(`│   • 임베딩 (gemini-embedding-exp-03-07): ${embeddingTokens.toLocaleString().padStart(8)} 토큰 │`);
  console.log(`│   • 입력 (gemini-2.5-flash):            ${inputTokens.toLocaleString().padStart(8)} 토큰 │`);
  console.log(`│   • 출력 (gemini-2.5-flash):            ${outputTokens.toLocaleString().padStart(8)} 토큰 │`);
  console.log(`│                                                         │`);
  console.log(`│ 💵 비용 상세 (USD)                                      │`);
  console.log(`│   • 임베딩 비용: $${embeddingCostUSD.toFixed(6).padStart(8)} (무료)        │`);
  console.log(`│   • 입력 비용:   $${inputCostUSD.toFixed(6).padStart(8)}                │`);
  console.log(`│   • 출력 비용:   $${outputCostUSD.toFixed(6).padStart(8)}                │`);
  console.log(`│   • 총 비용:     $${totalCostUSD.toFixed(6).padStart(8)}                │`);
  console.log(`│                                                         │`);
  console.log(`│ 🇰🇷 원화 환산 (1 USD = ${GEMINI_PRICING.USD_TO_KRW}원)                       │`);
  console.log(`│   • 총 비용:     ${totalCostKRW.toFixed(2).padStart(8)}원                │`);
  console.log(`└─────────────────────────────────────────────────────────┘`);
  
  return {
    embeddingTokens,
    inputTokens,
    outputTokens,
    totalCostUSD,
    totalCostKRW
  };
}

const SYSTEM_PROMPT = `
당신은 '예비맘 안심톡'의 AI 어시스턴트 '안심이'입니다. 임신/출산 관련 질문에 따뜻하고 친근한 어조로 답변하세요.

**답변 규칙:**
1. **친근한 대화체**: 딱딱한 설명보다는 친구처럼 자연스럽게 답변하세요.
2. **Context 활용**: 주어진 Context 정보를 자연스럽게 녹여내어 답변하세요.
3. **출처 분리**: answer 필드에는 출처 정보를 포함하지 마세요. 출처는 sources 배열에만 포함하세요.
4. **의료 한계 명시**: 답변 마지막에 "제가 드린 정보는 의학적 조언이 아니니, 꼭 전문의와 상담하여 정확한 정보를 확인하시는 것 잊지 마세요!"를 추가하세요.
5. **정보 부족시**: Context에 관련 정보가 없으면 솔직히 말하고 전문의 상담을 권하세요.

**JSON 출력 형식:**
{
  "answer": "따뜻한 어조의 답변 (출처 정보 포함 금지)",
  "sources": [
    {
      "reference": "출처 제목",
      "page": "페이지 (책인 경우)",
      "refType": "book/youtube/paper",
      "videoTitle": "영상 제목 (YouTube인 경우)",
      "videoUrl": "영상 URL (YouTube인 경우)",
      "timestamp": "타임스탬프 초단위 (YouTube인 경우)"
    }
  ]
}
`;

// 🎭 Mock 응답 데이터 - Freemium 정책 테스트용
const MOCK_RESPONSES = [
  {
    answer: "임신 초기에는 엽산 섭취가 정말 중요해요! 하루 400~800μg 정도 섭취하시는 것이 좋습니다. 엽산은 태아의 신경관 결손을 예방하는 데 도움을 줘요. 시금치, 브로콜리 같은 녹색 채소나 엽산 보충제를 통해 섭취하실 수 있어요. 제가 드린 정보는 의학적 조언이 아니니, 꼭 전문의와 상담하여 정확한 정보를 확인하시는 것 잊지 마세요!",
    sources: [
      {
        reference: "임신 중 영양 관리 가이드",
        refType: "youtube" as const,
        videoTitle: "임신 초기 엽산의 중요성",
        videoUrl: "https://youtube.com/watch?v=mock-video-1",
        timestamp: 120
      }
    ]
  },
  {
    answer: "입덧은 정말 힘드시죠. 개인차가 있지만 보통 12주 정도가 되면 호전되는 경우가 많아요. 소량씩 자주 드시고, 생강차나 레몬 물이 도움이 될 수 있어요. 너무 심하시면 산부인과에 꼭 상담받아보세요. 제가 드린 정보는 의학적 조언이 아니니, 꼭 전문의와 상담하여 정확한 정보를 확인하시는 것 잊지 마세요!",
    sources: [
      {
        reference: "임신 증상 이해하기",
        refType: "youtube" as const,
        videoTitle: "입덧 극복하는 방법",
        videoUrl: "https://youtube.com/watch?v=mock-video-2",
        timestamp: 300
      }
    ]
  },
  {
    answer: "임신 중 운동은 적당히 하시는 게 좋아요! 산책이나 요가, 수영 등 가벼운 운동은 도움이 됩니다. 하지만 격렬한 운동이나 배에 충격이 갈 수 있는 운동은 피하시는 게 좋겠어요. 운동 전에는 꼭 담당 의사와 상의해 보세요. 제가 드린 정보는 의학적 조언이 아니니, 꼭 전문의와 상담하여 정확한 정보를 확인하시는 것 잊지 마세요!",
    sources: [
      {
        reference: "임신 중 건강 관리",
        refType: "youtube" as const,
        videoTitle: "임산부를 위한 안전한 운동",
        videoUrl: "https://youtube.com/watch?v=mock-video-3",
        timestamp: 180
      }
    ]
  },
  {
    answer: "태동을 처음 느끼시는 건 정말 신기하고 감동적이에요! 보통 18~22주 정도에 처음 느끼시는 경우가 많아요. 처음에는 장이 꿈틀거리는 느낌이나 가스가 차는 느낌과 비슷할 수 있어요. 시간이 지나면서 점점 더 확실하게 느끼실 수 있을 거예요. 제가 드린 정보는 의학적 조언이 아니니, 꼭 전문의와 상담하여 정확한 정보를 확인하시는 것 잊지 마세요!",
    sources: [
      {
        reference: "임신 중기 변화",
        refType: "youtube" as const,
        videoTitle: "태동 느끼기 시작하는 시기",
        videoUrl: "https://youtube.com/watch?v=mock-video-4", 
        timestamp: 240
      }
    ]
  },
  {
    answer: "예비아빠로서 많이 걱정되고 궁금하실 거예요! 아내의 컨디션을 자주 물어보시고, 병원 검진에 함께 가주시면 정말 큰 힘이 될 거예요. 집안일을 도와주시고, 아내가 좋아하는 음식을 준비해 주시는 것도 좋겠어요. 무엇보다 아내의 이야기를 잘 들어주시는 것이 가장 중요해요. 제가 드린 정보는 의학적 조언이 아니니, 꼭 전문의와 상담하여 정확한 정보를 확인하시는 것 잊지 마세요!",
    sources: [
      {
        reference: "예비아빠 가이드",
        refType: "youtube" as const,
        videoTitle: "임신 중 남편의 역할",
        videoUrl: "https://youtube.com/watch?v=mock-video-5",
        timestamp: 360
      }
    ]
  }
];

/**
 * Mock API 응답을 생성하는 함수
 * Freemium 정책 테스트 및 개발 환경에서 API 비용 절약을 위해 사용
 */
function generateMockResponse(message: string) {
  mockLog(`Generating mock response for: "${message.substring(0, 50)}..."`);
  
  // 질문에 따라 적절한 Mock 응답 선택
  const lowerMessage = message.toLowerCase();
  let selectedResponse;
  
  if (lowerMessage.includes('엽산') || lowerMessage.includes('영양')) {
    selectedResponse = MOCK_RESPONSES[0];
  } else if (lowerMessage.includes('입덧') || lowerMessage.includes('메스꺼')) {
    selectedResponse = MOCK_RESPONSES[1];
  } else if (lowerMessage.includes('운동') || lowerMessage.includes('활동')) {
    selectedResponse = MOCK_RESPONSES[2];
  } else if (lowerMessage.includes('태동') || lowerMessage.includes('움직')) {
    selectedResponse = MOCK_RESPONSES[3];
  } else if (lowerMessage.includes('아빠') || lowerMessage.includes('남편')) {
    selectedResponse = MOCK_RESPONSES[4];
  } else {
    // 기본 응답 (랜덤 선택)
    selectedResponse = MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)];
  }
  
  mockLog(`Selected mock response: ${selectedResponse.answer.substring(0, 50)}...`);
  
  // Mock 비용 계산 (실제 API 호출하지 않으므로 0원)
  calculateAndLogCost(0, 0, 0, "Mock API Call (Free)");
  
  return selectedResponse;
}

/**
 * Groups documents by reference and formats them into a context string.
 * Consecutive pages from the same reference are grouped into a range.
 * For YouTube videos, includes video title and timestamp information.
 * @param documents - The array of documents from the database.
 * @returns A formatted context string.
 */
function groupAndFormatContext(documents: any[]): string {
  if (!documents || documents.length === 0) {
    return 'No specific context found.';
  }



  // 1. Group documents by reference, refType, and videoId for YouTube
  const groupedByReference: { [key: string]: any[] } = documents.reduce((acc, doc) => {
    if (doc.ref_type === 'youtube') {
      // For YouTube, group by videoId instead of just reference
      const videoId = doc.metadata?.videoId || 'unknown';
      const key = `${doc.reference}|${doc.ref_type}|${videoId}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(doc);
    } else {
      const key = `${doc.reference}|${doc.ref_type}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(doc);
    }
    return acc;
  }, {});

  const formattedContexts: string[] = [];

  // 2. Process each group
  for (const key in groupedByReference) {
    const parts = key.split('|');
    const ref = parts[0];
    const refType = parts[1];
    const group = groupedByReference[key];

    if (refType === 'book') {
      // Handle books - group consecutive pages
      group.sort((a, b) => (a.metadata?.page || 0) - (b.metadata?.page || 0));

      let currentRange = [group[0]];

      for (let i = 1; i < group.length; i++) {
        // Check if the page is consecutive
        if (group[i].metadata?.page === group[i - 1].metadata?.page + 1) {
          currentRange.push(group[i]);
        } else {
          // End of a consecutive range, format and push
          const pages = currentRange.map(doc => doc.metadata?.page).filter(Boolean);
          const pageStr = pages.length > 1 ? `${pages[0]}-${pages[pages.length - 1]}` : `${pages[0]}`;
          const combinedContent = currentRange.map(doc => doc.content).join('\n');
          formattedContexts.push(`[출처: ${ref} (${pageStr}페이지)] ${combinedContent}`);
          currentRange = [group[i]];
        }
      }
      
      // Push the last range
      const pages = currentRange.map(doc => doc.metadata?.page).filter(Boolean);
      const pageStr = pages.length > 1 ? `${pages[0]}-${pages[pages.length - 1]}` : `${pages[0]}`;
      const combinedContent = currentRange.map(doc => doc.content).join('\n');
      formattedContexts.push(`[출처: ${ref} (${pageStr}페이지)] ${combinedContent}`);
    } else if (refType === 'youtube') {
      // Handle YouTube videos - group all timestamps for same video
      group.sort((a, b) => (a.metadata?.seconds || 0) - (b.metadata?.seconds || 0));
      
      const videoId = parts[2];
      const videoTitle = group[0].title;
      const timestamps = group.map(doc => {
        const seconds = doc.metadata?.seconds || 0;
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
      }).join(', ');
      
      const combinedContent = group.map(doc => doc.content).join('\n');
      formattedContexts.push(`[YouTube영상출처: ${videoTitle} (${timestamps}) - VideoID: ${videoId}] ${combinedContent}`);
    } else {
      // Handle other types (papers, etc.)
      group.forEach(doc => {
        formattedContexts.push(`[출처: ${ref}] ${doc.content}`);
      });
    }
  }

  return formattedContexts.join('\n\n');
}

/**
 * Groups documents for the sources array in the response.
 * Same grouping logic as groupAndFormatContext, but returns structured data.
 */
function groupDocumentsForSources(documents: any[]): any[] {
  if (!documents || documents.length === 0) {
    return [];
  }

  // 1. Group documents by reference, refType, and videoId for YouTube
  const groupedByReference: { [key: string]: any[] } = documents.reduce((acc, doc) => {
    if (doc.ref_type === 'youtube') {
      // For YouTube, group by videoId instead of just reference
      const videoId = doc.metadata?.videoId || 'unknown';
      const key = `${doc.reference}|${doc.ref_type}|${videoId}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(doc);
    } else {
      const key = `${doc.reference}|${doc.ref_type}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(doc);
    }
    return acc;
  }, {});

  const groupedSources: any[] = [];

  // 2. Process each group
  for (const key in groupedByReference) {
    const parts = key.split('|');
    const ref = parts[0];
    const refType = parts[1];
    const group = groupedByReference[key];

    if (refType === 'book') {
      // Handle books - group consecutive pages
      group.sort((a, b) => (a.metadata?.page || 0) - (b.metadata?.page || 0));

      let currentRange = [group[0]];

      for (let i = 1; i < group.length; i++) {
        // Check if the page is consecutive
        if (group[i].metadata?.page === group[i - 1].metadata?.page + 1) {
          currentRange.push(group[i]);
        } else {
          // End of a consecutive range, create source object
          const pages = currentRange.map(doc => doc.metadata?.page).filter(Boolean);
          const pageStr = pages.length > 1 ? `${pages[0]}-${pages[pages.length - 1]}` : `${pages[0]}`;
          groupedSources.push({
            reference: ref,
            page: pageStr,
            refType: 'book'
          });
          currentRange = [group[i]];
        }
      }
      
      // Push the last range
      const pages = currentRange.map(doc => doc.metadata?.page).filter(Boolean);
      const pageStr = pages.length > 1 ? `${pages[0]}-${pages[pages.length - 1]}` : `${pages[0]}`;
      groupedSources.push({
        reference: ref,
        page: pageStr,
        refType: 'book'
      });
    } else if (refType === 'youtube') {
      // Handle YouTube videos - group all timestamps for same video
      group.sort((a, b) => (a.metadata?.seconds || 0) - (b.metadata?.seconds || 0));
      
      const videoId = parts[2];
      const videoTitle = group[0].title;
      const baseUrl = group[0].metadata?.url?.split('&t=')[0] || '';
      
      const timestamps = group.map(doc => ({
        seconds: doc.metadata?.seconds || 0,
        url: `${baseUrl}&t=${doc.metadata?.seconds || 0}s`
      }));
      
      groupedSources.push({
        reference: ref,
        refType: 'youtube',
        videoTitle: videoTitle,
        videoUrl: baseUrl,
        timestamps: timestamps
      });
    } else {
      // Handle other types (papers, etc.)
      group.forEach(doc => {
        groupedSources.push({
          reference: ref,
          refType: refType || 'paper'
        });
      });
    }
  }

  return groupedSources;
}

/**
 * 사용자 등급을 조회하는 함수
 */
async function getUserMembershipTier(userId: string): Promise<MembershipTier> {
  try {
    const { rows } = await pool.query(
      'SELECT membership_tier FROM user_profiles WHERE id = $1',
      [userId]
    );
    
    if (rows.length === 0) {
      return 'basic';
    }
    
    const tier = rows[0].membership_tier as MembershipTier;
    return tier;
  } catch (error) {
    debugError('❌ [User Tier Error]', error);
    return 'basic';
  }
}

export const action = async (args: ActionFunctionArgs) => {
  const { request } = args;
  
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const authResult = await getAuth(args);
    const { userId } = authResult;

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
    
    const chatModel = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        responseMimeType: 'application/json',
      }
    });

    // Model for embedding
    const embeddingModel = genAI.getGenerativeModel({ model: 'gemini-embedding-exp-03-07' });

    const { message, history } = await request.json();

    if (!message) {
      return json({ error: "Message is required" }, { status: 400 });
    }
    
    debugLog(`💬 [Query] "${message}"`);

    // 🎭 Mock 모드 체크 - 환경 변수로 활성화/비활성화
    if (FREEMIUM_MOCK_MODE) {
      mockLog("Mock mode is enabled - returning mock response");
      mockLog(`Environment FREEMIUM_MOCK_MODE: ${process.env.FREEMIUM_MOCK_MODE}`);
      
      // 🎯 [MOCK] Mock 모드에서는 Freemium 체크를 클라이언트에 맡김
      console.log('🎯 [MOCK] Mock 모드 - 게스트/로그인 관계없이 Mock 응답 제공');
      
      // Mock 응답 생성 (지연 시뮬레이션: 실제 API 호출처럼 1-2초 대기)
      const delay = 1000 + Math.random() * 1000; // 1-2초 랜덤 지연
      await new Promise(resolve => setTimeout(resolve, delay));
      
      const mockResponse = generateMockResponse(message);
      return json({ reply: mockResponse });
    }

    mockLog("Mock mode is disabled - proceeding with real API call");

    // 🎯 [API FREEMIUM] 게스트 사용자 차단
    console.log('🎯 [API FREEMIUM] /api/gemini 액션 호출됨 - userId:', userId);
    
    if (!userId) {
      console.log('🎯 [API FREEMIUM] 게스트 사용자 감지 - API 접근 차단');
      return json({ 
        error: "Guest access denied",
        freemiumBlock: true,
        message: "로그인 후 이용해주세요. 게스트는 제한된 기능만 사용 가능합니다." 
      }, { status: 403 });
    }

    // 사용자 등급 조회 (로그인한 사용자만)
    const userTier = await getUserMembershipTier(userId);
    
    const allowedRefTypes = TIER_PERMISSIONS[userTier].allowedRefTypes;

    // 임베딩 생성
    const embeddingResult = await embeddingModel.embedContent(message);
    const { embedding } = embeddingResult;
    const embeddingString = `[${embedding.values.join(',')}]`;
    
    // 임베딩 토큰 사용량 추적 (추정값: 한국어 텍스트 길이 기반)
    const embeddingTokens = Math.ceil(message.length / 4); // 대략적인 토큰 추정

    // 등급별 필터링된 RAG 검색 쿼리 (효율적인 방법)
    const refTypeFilter = allowedRefTypes.map(type => `'${type}'`).join(',');
    
    // 필터링과 LIMIT을 한 번의 쿼리로 처리 (더 효율적)
    const { rows: documents } = await pool.query(
      `SELECT * FROM (
         SELECT * FROM match_documents($1, $2, $3) 
         WHERE ref_type IN (${refTypeFilter})
       ) filtered_results
       LIMIT 5`,
      [embeddingString, 0.75, 10] // 충분한 후보군 확보를 위해 10개로 설정
    );
    
    // 상세 검색 결과 로그
    debugLog(`\n📊 [RAG Search Process]`);
    debugLog(`   • User Tier: ${userTier} | Allowed RefTypes: [${allowedRefTypes.join(', ')}]`);
    debugLog(`   • Documents found (filtered & limited): ${documents.length}`);
    
    if (DEBUG_MODE && documents.length > 0) {
      debugLog(`\n📋 [Selected Documents]:`);
      documents.forEach((doc, index) => {
        const similarity = (doc.similarity * 100).toFixed(2);
        const refType = doc.ref_type || 'unknown';
        const reference = doc.reference || 'unknown';
        const title = doc.title ? doc.title.substring(0, 60) + '...' : 'No title';
        const contentPreview = doc.content ? doc.content.substring(0, 100).replace(/\n/g, ' ') + '...' : 'No content';

        debugLog(`  ${index + 1}. [${similarity}%] ${refType} | ${reference}`);
        debugLog(`     Title: ${title}`);
        debugLog(`     Content: ${contentPreview}`);
        
        // 메타데이터 정보 추가
        if (doc.metadata) {
          const metadata = typeof doc.metadata === 'string' ? JSON.parse(doc.metadata) : doc.metadata;
          if (refType === 'youtube' && metadata.videoId) {
            debugLog(`     VideoID: ${metadata.videoId} | Timestamp: ${metadata.seconds}s`);
          } else if (refType === 'book' && metadata.page) {
            debugLog(`     Page: ${metadata.page}`);
          }
        }
        debugLog('');
      });
    } else if (DEBUG_MODE) {
      debugLog("⚠️ [Search Results] No documents found above similarity threshold");
    }

    const context = groupAndFormatContext(documents);
    
    // Format history for Gemini (최근 6개 메시지만 유지 - 3턴 대화)
    const geminiHistory = (history || [])
      .filter((msg: any) => msg.role === 'user' || msg.role === 'assistant')
      .slice(-6) // 최근 6개 메시지만 유지 (사용자 3개 + AI 3개)
      .map((msg: any) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: typeof msg.content === 'string' ? msg.content : msg.content.answer || '' }],
      }));

    // The Gemini API requires the history to start with a user role.
    // If the first message is from the assistant (our initial greeting), we remove it.
    if (geminiHistory.length > 0 && geminiHistory[0].role === 'model') {
      geminiHistory.shift();
    }

    // Remove the last message from history as it's the current user question
    geminiHistory.pop();

    const augmentedPrompt = `
      Context:
      ${context}

      Question:
      ${message}
    `;

    const chat = chatModel.startChat({
      history: geminiHistory,
    });

    const result = await chat.sendMessage(augmentedPrompt);
    const response = await result.response;
    const text = response.text();
    
    // 토큰 사용량 정보 추출
    const usageMetadata = response.usageMetadata;
    const inputTokens = usageMetadata?.promptTokenCount || 0;
    const outputTokens = usageMetadata?.candidatesTokenCount || 0;
    const totalTokens = usageMetadata?.totalTokenCount || 0;
    
    // API 비용 계산 및 로그 출력 (디버그 모드에서만)
    if (DEBUG_MODE) {
      calculateAndLogCost(embeddingTokens, inputTokens, outputTokens, "질문 답변");
    }
    
    try {
      // Clean the response text by removing markdown and extra characters
      const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      
      // Find the start and end of the main JSON object
      const firstBrace = cleanedText.indexOf('{');
      const lastBrace = cleanedText.lastIndexOf('}');

      if (firstBrace === -1 || lastBrace < firstBrace) {
        debugLog("❌ [Parse Error] No JSON object found in response");
        debugLog("Raw response:", text.substring(0, 500) + "...");
        throw new Error("No JSON object found in the response.");
      }
      
      const jsonString = cleanedText.substring(firstBrace, lastBrace + 1);
      
      // Sanitize newlines within string values, as the model might not escape them properly.
      const sanitizedJsonString = jsonString.replace(/"([^"\\]|\\.)*"/g, (match: string) => {
        return match.replace(/\n/g, '\\n');
      });
      
      const structuredResponse = JSON.parse(sanitizedJsonString);
      
      // Replace <br> tags with newlines for consistent markdown rendering
      if (structuredResponse.answer && typeof structuredResponse.answer === 'string') {
        structuredResponse.answer = structuredResponse.answer.replace(/<br\s*\/?>/gi, '\n');
      }

      // Replace the sources array with grouped sources
      if (structuredResponse.sources) {
        structuredResponse.sources = groupDocumentsForSources(documents);
      }
      
      return json({ reply: structuredResponse });
    } catch (parseError) {
      debugError("❌ [Parse Error] Failed to parse JSON response:", parseError);
      debugError("Raw AI response:", text);
      // Re-throw the error to be caught by the outer catch block
      throw parseError;
    }

  } catch (error) {
    debugError("💥 [Error]", error);
    
    if (error instanceof SyntaxError) {
      return json({ error: "Failed to parse AI response as JSON." }, { status: 500 });
    }
    
    return json({ error: "Failed to get response from AI" }, { status: 500 });
  }
}; 