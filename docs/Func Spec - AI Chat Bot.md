### **📝 1\. AI 챗봇 연동 명세서**

setTimeout으로 구현했던 가상 응답을 실제 백엔드 API 호출로 대체하여, 동적인 AI 답변을 받아오는 기능을 구현합니다.

#### **1.1. 프론트엔드 기능명세서**

**1\) 컴포넌트: 채팅 UI (app/chat/ChatUI.tsx)**

* **로직 변경**:  
  * 기존 setTimeout 로직을 fetch API를 사용한 비동기 함수 호출로 변경합니다.  
  * **메시지 전송 핸들러 (handleSendMessage)**:  
    1. 사용자 메시지를 messages 상태에 추가합니다.  
    2. 로딩 상태를 true로 설정하고, messages 배열에 로딩 인디케이터를 추가합니다.  
    3. fetch를 사용해 백엔드 API (/api/chat)에 POST 요청을 보냅니다. 요청 본문(body)에는 현재까지의 대화 목록(messages)을 포함하여 문맥을 전달합니다.  
    4. **요청 성공 시**: API 응답으로 받은 AI 답변(answer)과 출처(source)를 messages 상태에 추가합니다.  
    5. **요청 실패 시**: 에러를 핸들링하여 사용자에게 "답변을 가져오는 데 실패했어요. 잠시 후 다시 시도해 주세요."와 같은 에러 메시지를 표시합니다.  
    6. 성공/실패 여부와 관계없이 로딩 상태를 false로 변경하고, messages 배열에서 로딩 인디케이터를 제거합니다.

**2\) 타입 정의 (types/index.ts)**

* **Message 인터페이스 확장**: API 요청/응답 구조에 맞게 타입을 명확히 정의합니다.  
  TypeScript  
  export interface Message {  
    id: string;  
    sender: 'user' | 'ai' | 'loading' | 'error';  
    text: string;  
    source?: string;  
  }

#### **1.2. 백엔드 기능명세서**

**1\) API 정의 (Route Handler)**

* **파일 위치**: app/api/chat/route.ts  
* **엔드포인트**: POST /api/chat  
* **역할**: 사용자의 질문과 대화 문맥을 받아 AI의 답변과 출처를 반환합니다.  
* **요청 (Request Body)**:  
  JSON  
  {  
    "messages": \[  
      { "sender": "user", "text": "입덧이 너무 심해" },  
      { "sender": "ai", "text": "입덧 때문에 힘드시겠어요..." },  
      { "sender": "user", "text": "12주차 검사는 뭐가 있나요?" }  
    \]  
  }

* **응답 (Response Body)**:  
  JSON  
  {  
    "answer": "12주차에는 태아의 목덜미 투명대(NT)를 측정하는 1차 기형아 검사를 진행할 수 있어요.",  
    "source": "보건복지부 임신·출산 정보 포털"  
  }

* **처리 로직**:  
  1. Request Body에서 messages 배열을 파싱합니다.  
  2. (AI 엔진 연동 전 Mocking 단계) 마지막 사용자 메시지를 기반으로 미리 정의된 답변을 반환합니다. 실제 RAG 엔진의 응답 속도 및 형태를 시뮬레이션합니다. 1  
  3. 오류 발생 시, 500 상태 코드와 에러 메시지를 포함한 JSON을 반환합니다.


