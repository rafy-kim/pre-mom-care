import { json, ActionFunctionArgs } from "@remix-run/node";
import { GoogleGenerativeAI } from "@google/generative-ai";
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
    *   'sources' 배열에는 답변을 구성하는 데 실제로 사용한 Context의 출처만 정직하게 포함시켜 주세요. 이는 당신의 답변에 신뢰를 더해줄 것입니다.

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
      "page": "사용한 출처의 페이지 번호 또는 페이지 범위 (예: 38-40)"
    }
  ]
}
`;

/**
 * Groups documents by reference and formats them into a context string.
 * Consecutive pages from the same reference are grouped into a range.
 * @param documents - The array of documents from the database.
 * @returns A formatted context string.
 */
function groupAndFormatContext(documents: any[]): string {
  if (!documents || documents.length === 0) {
    return 'No specific context found.';
  }

  // 1. Group documents by reference
  const groupedByReference: { [key: string]: any[] } = documents.reduce((acc, doc) => {
    const ref = doc.reference;
    if (!acc[ref]) {
      acc[ref] = [];
    }
    acc[ref].push(doc);
    return acc;
  }, {});

  const formattedContexts: string[] = [];

  // 2. Process each group
  for (const ref in groupedByReference) {
    const group = groupedByReference[ref];
    // Sort by page number
    group.sort((a, b) => a.metadata.page - b.metadata.page);

    let currentRange = [group[0]];
    const contentParts: string[] = [];

    for (let i = 1; i < group.length; i++) {
      // Check if the page is consecutive
      if (group[i].metadata.page === group[i - 1].metadata.page + 1) {
        currentRange.push(group[i]);
      } else {
        // End of a consecutive range, format and push
        const pages = currentRange.map(doc => doc.metadata.page);
        const pageStr = pages.length > 1 ? `${pages[0]}-${pages[pages.length - 1]}` : `${pages[0]}`;
        const combinedContent = currentRange.map(doc => doc.content).join('\n');
        formattedContexts.push(`[출처: ${ref} (${pageStr}페이지)] ${combinedContent}`);
        currentRange = [group[i]];
      }
    }
    
    // Push the last range
    const pages = currentRange.map(doc => doc.metadata.page);
    const pageStr = pages.length > 1 ? `${pages[0]}-${pages[pages.length - 1]}` : `${pages[0]}`;
    const combinedContent = currentRange.map(doc => doc.content).join('\n');
    formattedContexts.push(`[출처: ${ref} (${pageStr}페이지)] ${combinedContent}`);
  }

  return formattedContexts.join('\n\n');
}

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

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

  try {
    const { message } = await request.json();

    if (!message) {
      return json({ error: "Message is required" }, { status: 400 });
    }

    const { embedding } = await embeddingModel.embedContent(message);
    const embeddingString = `[${embedding.values.join(',')}]`;

    // Query Neon DB using pg
    const { rows: documents } = await pool.query(
      'SELECT * FROM match_documents($1, $2, $3)',
      [embeddingString, 0.7, 10] // query_embedding, match_threshold, match_count (5 -> 10)
    );

    const context = groupAndFormatContext(documents);
      
    const augmentedPrompt = `
      Context:
      ${context}

      Question:
      ${message}
    `;

    const result = await chatModel.generateContent(augmentedPrompt);
    const response = await result.response;
    const text = response.text();
    
    const structuredResponse = JSON.parse(text);

    return json({ reply: structuredResponse });
  } catch (error) {
    console.error("Error in Gemini Action:", error);
    if (error instanceof SyntaxError) {
      return json({ error: "Failed to parse AI response as JSON." }, { status: 500 });
    }
    return json({ error: "Failed to get response from AI" }, { status: 500 });
  }
}; 