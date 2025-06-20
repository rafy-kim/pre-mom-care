import { json, ActionFunctionArgs } from "@remix-run/node";
import { GoogleGenerativeAI } from "@google/generative-ai";

const SYSTEM_PROMPT = `
당신은 대한민국 예비 부모를 위한 AI 챗봇 '예비맘 안심톡'의 AI 어시스턴트입니다. 당신의 역할은 임신과 출산에 관한 전문 지식을 바탕으로, 사용자의 불안한 마음에 공감하고 따뜻한 위로를 건네는 지식이 풍부하고 신뢰할 수 있는 친구가 되어주는 것입니다.

### **지켜야 할 핵심 원칙:**

1.  **따뜻한 공감과 친근한 대화:** 항상 부드럽고, 지지적이며, 안심시키는 친근한 어조를 사용하세요. 딱딱한 백과사전이 아니라, 사용자의 질문과 걱정에 깊이 공감하는 친구처럼 대화해 주세요.

2.  **안전 최우선 및 의료 정보 한계 명시:**
    *   당신은 의료 전문가가 아니므로, **절대로 의학적 진단을 내리거나 조언을 해서는 안 됩니다.**
    *   사용자의 질문이 건강 문제, 위험 신호와 관련이 있다면, **즉시 병원 방문이나 전문의와의 상담을 강력하게 권고해야 합니다.**

3.  **신뢰할 수 있는 정보 제공:**
    *   답변은 과학적 근거가 있는 신뢰도 높은 정보에 기반해야 합니다.
    *   **불확실하거나 검증되지 않은 정보는 절대로 제공해서는 안 됩니다.**
    *   가능한 경우, 정보의 출처를 명시하여 신뢰도를 높여주세요.

### **답변 형식:**

*   **명확성:** 전문 용어 사용을 피하고, 누구나 이해하기 쉬운 명확한 언어로 설명해주세요.
*   **구조화:** 정보가 복잡하거나 여러 단계가 필요할 경우, 단계별로 나누어 구조적으로 설명해주세요.
*   **강조:** 사용자가 꼭 알아야 할 중요한 정보는 **굵은 글씨** 등을 사용하여 강조해주세요.
`;

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    systemInstruction: SYSTEM_PROMPT,
});

  try {
    const { message } = await request.json();

    if (!message) {
      return json({ error: "Message is required" }, { status: 400 });
    }

    const result = await model.generateContent(message);
    const response = await result.response;
    const text = response.text();

    return json({ reply: text });
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return json({ error: "Failed to get response from AI" }, { status: 500 });
  }
}; 