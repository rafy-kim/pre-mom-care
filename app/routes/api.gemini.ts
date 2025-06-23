import { json, ActionFunctionArgs } from "@remix-run/node";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getAuth } from "@clerk/remix/ssr.server";
import { TIER_PERMISSIONS, MembershipTier } from "types";
import pg from 'pg';

// Initialize a connection pool to the Neon database
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const SYSTEM_PROMPT = `
당신은 대한민국 예비 부모를 위한 AI 챗봇 '예비맘 안심톡'의 AI 어시스턴트 '안심이'입니다. 당신의 역할은 임신과 출산에 관한 전문 지식을 바탕으로, 사용자의 불안한 마음에 공감하고 따뜻한 위로를 건네는 지식이 풍부하고 신뢰할 수 있는 친구가 되어주는 것입니다.

당신은 주어진 'Context' 정보를 바탕으로 답변을 구성하되, 항상 따뜻하고 친근하며, 안심시키는 어조를 유지해야 합니다.

### **핵심 임무 및 답변 규칙 (JSON 형식으로 출력):**

1.  **친구처럼 답변하기:**
    *   'answer' 필드에는 딱딱한 정보 요약이 아닌, 친구와 대화하듯 자연스럽고 따뜻한 문장으로 답변을 작성해주세요.
    *   답변이 길어지거나 여러 주제를 다룰 경우, 사용자가 읽기 편하도록 적절하게 줄바꿈(\n)을 사용하여 문단을 나눠주세요.
    *   Context의 내용을 기반으로 답변하되, 이를 당신의 지식인 것처럼 자연스럽게 녹여내어 설명해야 합니다. 예를 들어, 사용자가 '영양제'에 대해 물었지만 Context에 '아연이 풍부한 음식' 정보가 있다면, "영양제도 중요하지만, 혹시 아연 섭취에 관심이 있다면 이런 음식들은 어떠세요?" 와 같이 부드럽게 대화를 이끌어 가세요.

2.  **정확한 출처 제공:**
    *   'sources' 배열에는 답변을 구성하는 데 실제로 사용한 Context의 출처만 정직하게 포함시켜 주세요. 
    *   Context에서 '[출처: 제목 (페이지)]' 형태의 도서 정보가 있으면 'refType': 'book', 'reference': '제목', 'page': '페이지번호'로 설정하세요.
    *   Context에서 '[YouTube영상출처: 영상제목 (시간) - URL: url - VideoID: id]' 형태의 YouTube 정보가 있으면 'refType': 'youtube', 'videoTitle': '영상제목', 'videoUrl': 'url값', 'timestamp': 초단위숫자로변환, 'reference': '영상제목'로 설정하세요.
    *   이는 당신의 답변에 신뢰를 더해줄 것입니다.

3.  **안전 최우선 및 한계 명시:**
    *   답변 마지막에는 항상 "제가 드린 정보는 의학적 조언이 아니니, 꼭 전문의와 상담하여 정확한 정보를 확인하시는 것 잊지 마세요!" 와 같이 당신의 역할의 한계를 명확히 하고, 전문가 상담을 권유하는 문구를 부드럽게 추가해주세요.

4.  **정보가 없을 때:**
    *   Context에서 질문에 대한 유용한 정보를 정말 찾을 수 없을 때만, "음, 그 질문에 대해서는 제가 가진 정보 안에서는 정확한 답변을 찾기 어렵네요. 더 자세한 내용은 전문의와 상담해보시는 게 좋을 것 같아요." 와 같이 솔직하고 따뜻하게 응답해주세요. 이 경우 'sources' 배열은 비워둡니다.


### **JSON 출력 형식:**
{
  "answer": "친구처럼 따뜻한 어조로, Context 정보를 자연스럽게 녹여내어 작성한 답변.",
  "sources": [
    {
      "reference": "사용한 출처의 제목",
      "page": "사용한 출처의 페이지 번호 또는 페이지 범위 (예: 38-40)",
      "refType": "출처 타입 (book, youtube, paper)",
      "videoTitle": "YouTube 영상의 경우 영상 제목",
      "videoUrl": "YouTube 영상의 경우 영상 URL",
      "timestamp": "YouTube 영상의 경우 타임스탬프(초 단위)"
    }
  ]
}
`;

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
    console.error('❌ [User Tier Error]', error);
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
    
    console.log(`💬 [Query] "${message}"`);

    // 사용자 등급 조회 (로그인한 사용자만, 게스트는 기본 등급)
    let userTier: MembershipTier = 'basic';
    if (userId) {
      userTier = await getUserMembershipTier(userId);
    }
    
    const allowedRefTypes = TIER_PERMISSIONS[userTier].allowedRefTypes;

    // 임베딩 생성
    const { embedding } = await embeddingModel.embedContent(message);
    const embeddingString = `[${embedding.values.join(',')}]`;

    // 등급별 필터링된 RAG 검색 쿼리
    const refTypeFilter = allowedRefTypes.map(type => `'${type}'`).join(',');
    
    const { rows: documents } = await pool.query(
      `SELECT * FROM match_documents($1, $2, $3) 
       WHERE ref_type IN (${refTypeFilter})`,
      [embeddingString, 0.7, 10] // query_embedding, match_threshold, match_count
    );
    
    // 상세 검색 결과 로그
    if (documents.length > 0) {
      console.log(`\n📊 [Search Results] Found ${documents.length} documents:`);
      documents.forEach((doc, index) => {
        const similarity = (doc.similarity * 100).toFixed(2);
        const refType = doc.ref_type || 'unknown';
        const reference = doc.reference || 'unknown';
        const title = doc.title ? doc.title.substring(0, 60) + '...' : 'No title';
        const contentPreview = doc.content ? doc.content.substring(0, 100).replace(/\n/g, ' ') + '...' : 'No content';

        console.log(`  ${index + 1}. [${similarity}%] ${refType} | ${reference}`);
        console.log(`     Title: ${title}`);
        console.log(`     Content: ${contentPreview}`);
        
        // 메타데이터 정보 추가
        if (doc.metadata) {
          const metadata = typeof doc.metadata === 'string' ? JSON.parse(doc.metadata) : doc.metadata;
          if (refType === 'youtube' && metadata.videoId) {
            console.log(`     VideoID: ${metadata.videoId} | Timestamp: ${metadata.seconds}s`);
          } else if (refType === 'book' && metadata.page) {
            console.log(`     Page: ${metadata.page}`);
          }
        }
        console.log('');
      });
    } else {
      console.log("⚠️ [Search Results] No documents found above similarity threshold");
    }

    const context = groupAndFormatContext(documents);
    
    // Format history for Gemini
    const geminiHistory = (history || [])
      .filter((msg: any) => msg.role === 'user' || msg.role === 'assistant')
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
    
    try {
      // Clean the response text by removing markdown and extra characters
      const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      
      // Find the start and end of the main JSON object
      const firstBrace = cleanedText.indexOf('{');
      const lastBrace = cleanedText.lastIndexOf('}');

      if (firstBrace === -1 || lastBrace < firstBrace) {
        console.log("❌ [Parse Error] No JSON object found in response");
        console.log("Raw response:", text.substring(0, 500) + "...");
        throw new Error("No JSON object found in the response.");
      }
      
      const jsonString = cleanedText.substring(firstBrace, lastBrace + 1);
      
      // Sanitize newlines within string values, as the model might not escape them properly.
      const sanitizedJsonString = jsonString.replace(/"([^"\\]|\\.)*"/g, (match: string) => {
        return match.replace(/\n/g, '\\n');
      });
      
      const structuredResponse = JSON.parse(sanitizedJsonString);
      
      // Replace the sources array with grouped sources
      if (structuredResponse.sources) {
        structuredResponse.sources = groupDocumentsForSources(documents);
      }
      
      return json({ reply: structuredResponse });
    } catch (parseError) {
      console.error("❌ [Parse Error] Failed to parse JSON response:", parseError);
      console.error("Raw AI response:", text);
      // Re-throw the error to be caught by the outer catch block
      throw parseError;
    }

  } catch (error) {
    console.error("💥 [Error]", error);
    
    if (error instanceof SyntaxError) {
      return json({ error: "Failed to parse AI response as JSON." }, { status: 500 });
    }
    
    return json({ error: "Failed to get response from AI" }, { status: 500 });
  }
}; 