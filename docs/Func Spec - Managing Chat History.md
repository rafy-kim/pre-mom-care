### **📝 1\. 대화 기록 관리 명세서**

게스트 상태의 대화를 로그인 시 계정에 동기화하고, 로그인 이후의 모든 대화를 서버에 영구적으로 저장하여 언제든 다시 볼 수 있게 합니다.

#### **1.1. 프론트엔드 기능명세서**

**1\) 컴포넌트: 채팅 UI (app/chat/ChatUI.tsx)**

* **인증 상태 확인**: next-auth/react의 useSession 훅을 사용하여 사용자의 인증 상태(status: 'authenticated' | 'unauthenticated' | 'loading')를 실시간으로 확인합니다.  
* **로직 추가**:  
  * **로그인 시 대화 기록 동기화**:  
    1. 사용자가 소셜 로그인을 성공하고 세션 상태가 'authenticated'로 변경되는 시점을 감지합니다. (useEffect 활용)  
    2. 이때, 현재 클라이언트 messages 상태에 남아있는 게스트 시절의 대화 기록을 백엔드 동기화 API (POST /api/chat/sync)로 전송합니다.  
  * **기존 대화 기록 불러오기**:  
    1. 인증된 사용자가 /chat 페이지에 처음 진입할 때, 백엔드 대화 기록 API (GET /api/chat/history)를 호출하여 과거 대화 목록을 불러옵니다.  
    2. 불러온 대화 기록으로 messages 상태를 초기화하여 이전 대화를 이어서 할 수 있도록 합니다.

#### **1.2. 백엔드 기능명세서**

**1\) API: 게스트 대화 기록 동기화 (Route Handler)**

* **파일 위치**: app/api/chat/sync/route.ts  
* **엔드포인트**: POST /api/chat/sync  
* **역할**: 게스트 상태의 대화 기록을 받아 현재 로그인한 사용자의 계정에 저장합니다.  
* **처리 로직**:  
  1. 요청 헤더의 세션 정보를 통해 사용자의 userId를 확인합니다. (인증된 사용자만 접근 가능)  
  2. Request Body로 받은 messages 배열을 chat\_messages 테이블에 userId와 함께 저장합니다. (Bulk Insert로 처리하여 효율성 증대)  
  3. 성공적으로 저장되면 201 Created 상태 코드를 반환합니다.

**2\) API: 로그인 사용자 대화 저장 (기존 API 수정)**

* **파일 위치**: app/api/chat/route.ts  
* **엔드포인트**: POST /api/chat  
* **처리 로직 수정**:  
  1. 기존 AI 답변 생성 로직에 더하여, 세션을 확인합니다.  
  2. 사용자가 로그인 상태인 경우, 사용자의 질문과 생성된 AI의 답변을 모두 chat\_messages 테이블에 userId와 함께 저장합니다.

**3\) API: 대화 기록 조회 (Route Handler)**

* **파일 위치**: app/api/chat/history/route.ts  
* **엔드포인트**: GET /api/chat/history  
* **역할**: 현재 로그인한 사용자의 전체 대화 기록을 조회합니다.  
* **처리 로직**:  
  1. 세션에서 userId를 확인합니다. (인증된 사용자만 접근 가능)  
  2. chat\_messages 테이블에서 해당 userId를 가진 모든 메시지를 createdAt(생성 시간) 순서대로 조회하여 반환합니다.

**4\) 데이터베이스 설계 (db/schema.ts)**

* **chat\_messages 테이블 추가**:  
  * id: (PK) 메시지 고유 ID  
  * userId: (FK) users 테이블의 ID 참조  
  * sender: 'user' 또는 'ai'  
  * text: 메시지 내용  
  * source: (Nullable) AI 답변의 출처  
  * createdAt: 메시지 생성 타임스탬프

