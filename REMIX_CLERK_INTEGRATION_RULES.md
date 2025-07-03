# Remix + Clerk 연동 CursorRule
**Role**: 당신은 Remix와 Clerk 인증 시스템 연동 전문가입니다. TypeScript, Drizzle ORM, 그리고 모던 웹 개발 패턴에 깊은 이해를 가지고 있습니다.

## 🎯 핵심 목표 (Primary Objectives)
1. **인증 보안**: 모든 보호된 경로에서 사용자 인증 상태를 올바르게 검증
2. **데이터 무결성**: 사용자별 데이터 격리 및 권한 기반 접근 제어
3. **타입 안전성**: TypeScript와 Drizzle ORM을 활용한 완전한 타입 안전성
4. **사용자 경험**: 원활한 인증 플로우와 에러 핸들링

## 🚨 중요 제약사항 (Critical Constraints)
- **필수**: npm 패키지 매니저만 사용
- **필수**: Drizzle ORM으로 모든 데이터베이스 작업 수행
- **필수**: TypeScript 인터페이스에 'I' 접두사 사용
- **필수**: ShadCN 컴포넌트 우선 활용
- **금지**: yarn, pnpm 등 다른 패키지 매니저 사용 금지
- **금지**: Prisma, TypeORM 등 다른 ORM 사용 금지

## 📋 단계별 구현 가이드 (Step-by-Step Implementation)

### 1단계: 필수 패키지 설치 및 설정
```bash
# Clerk 관련 패키지
npm install @clerk/remix

# 데이터베이스 관련 패키지
npm install @neondatabase/serverless drizzle-orm
npm install -D drizzle-kit

# 타입 정의
npm install -D @types/node
```

### 2단계: 환경 변수 설정 체크리스트
```env
# .env 파일에 다음 변수들이 반드시 포함되어야 함
DATABASE_URL=your_neon_postgres_connection_string
CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx
```

**⚠️ 주의사항**: 
- `NEXT_PUBLIC_` 접두사를 사용하지 마세요 (Remix에서는 불필요)
- 환경 변수는 서버 재시작 후에만 적용됩니다

### 3단계: Remix Root 설정 (app/root.tsx)
```typescript
import { ClerkApp } from "@clerk/remix";
import type { MetaFunction, LoaderFunction } from "@remix-run/node";
import { rootAuthLoader } from "@clerk/remix/ssr.server";

export const meta: MetaFunction = () => [
  { title: "PreMom CareChat" },
  { name: "description", content: "AI 챗봇 서비스" },
];

export const loader: LoaderFunction = (args) => {
  return rootAuthLoader(args);
};

// ClerkApp으로 래핑하여 전체 앱에 Clerk 제공
export default ClerkApp(App);

function App() {
  return (
    <html lang="ko">
      <head>
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
```

### 4단계: 라우트 보호 설정
```typescript
// app/routes/dashboard.tsx (보호된 라우트 예시)
import { getAuth } from "@clerk/remix/ssr.server";
import { redirect } from "@remix-run/node";
import type { LoaderFunction } from "@remix-run/node";

export const loader: LoaderFunction = async (args) => {
  const { userId } = await getAuth(args);
  
  if (!userId) {
    return redirect("/sign-in");
  }
  
  // 사용자별 데이터 로딩 로직
  return json({ userId });
};
```

### 5단계: 데이터베이스 스키마 정의 (app/db/schema.ts)
```typescript
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// TypeScript 인터페이스 (I 접두사 사용)
export interface IUserMessage {
  id: string;
  userId: string;
  message: string;
  createdAt: Date;
}

// Drizzle 스키마
export const userMessages = pgTable('user_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(), // Clerk userId 저장
  message: text('message').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

### 6단계: 데이터베이스 연결 설정 (app/db/index.ts)
```typescript
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL 환경 변수가 설정되지 않았습니다.');
}

const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql, { schema });

// 타입 안전한 데이터베이스 헬퍼
export type Database = typeof db;
```

### 7단계: Remix Action과 Loader 패턴
```typescript
// app/routes/messages.tsx
import { json, type ActionFunction, type LoaderFunction } from "@remix-run/node";
import { getAuth } from "@clerk/remix/ssr.server";
import { db } from "~/db";
import { userMessages } from "~/db/schema";
import { eq } from "drizzle-orm";

export const loader: LoaderFunction = async (args) => {
  const { userId } = await getAuth(args);
  
  if (!userId) {
    throw new Response("Unauthorized", { status: 401 });
  }

  // 사용자별 메시지 조회 (권한 격리)
  const messages = await db
    .select()
    .from(userMessages)
    .where(eq(userMessages.userId, userId));

  return json({ messages });
};

export const action: ActionFunction = async (args) => {
  const { userId } = await getAuth(args);
  
  if (!userId) {
    throw new Response("Unauthorized", { status: 401 });
  }

  const formData = await args.request.formData();
  const message = formData.get("message") as string;

  if (!message?.trim()) {
    return json({ error: "메시지가 비어있습니다." }, { status: 400 });
  }

  // 메시지 저장 (사용자 ID와 함께)
  await db.insert(userMessages).values({
    userId,
    message: message.trim(),
  });

  return json({ success: true });
};
```

## 🔒 보안 체크리스트 (Security Checklist)

### 인증 검증
- [ ] 모든 보호된 라우트에서 `getAuth()` 호출
- [ ] `userId`가 null인 경우 적절한 리다이렉트 또는 에러 반환
- [ ] 클라이언트 사이드에서 `useUser()` 훅으로 사용자 상태 확인

### 데이터 격리
- [ ] 모든 데이터베이스 쿼리에 사용자 ID 필터링 적용
- [ ] `WHERE user_id = ${userId}` 조건 누락 확인
- [ ] Cross-user 데이터 접근 방지

### 타입 안전성
- [ ] 모든 인터페이스에 'I' 접두사 사용
- [ ] Drizzle 스키마와 TypeScript 인터페이스 일치
- [ ] `any` 타입 사용 금지

## ⚡ 성능 최적화 패턴

### 데이터베이스 쿼리
```typescript
// ✅ 올바른 패턴: 필요한 컬럼만 선택
const messages = await db
  .select({
    id: userMessages.id,
    message: userMessages.message,
    createdAt: userMessages.createdAt,
  })
  .from(userMessages)
  .where(eq(userMessages.userId, userId))
  .limit(50);

// ❌ 잘못된 패턴: 모든 컬럼 선택
const messages = await db.select().from(userMessages);
```

### 로더 최적화
```typescript
// ✅ 올바른 패턴: 병렬 데이터 로딩
export const loader: LoaderFunction = async (args) => {
  const { userId } = await getAuth(args);
  
  if (!userId) return redirect("/sign-in");

  const [messages, userProfile] = await Promise.all([
    db.select().from(userMessages).where(eq(userMessages.userId, userId)),
    db.select().from(userProfiles).where(eq(userProfiles.userId, userId)),
  ]);

  return json({ messages, userProfile });
};
```

## 🐛 일반적인 오류와 해결책

### 1. "Cannot read properties of null (reading 'userId')"
```typescript
// ❌ 문제 코드
const { userId } = await getAuth(args);
const messages = await db.select().from(userMessages).where(eq(userMessages.userId, userId));

// ✅ 해결 코드
const { userId } = await getAuth(args);
if (!userId) {
  throw new Response("Unauthorized", { status: 401 });
}
const messages = await db.select().from(userMessages).where(eq(userMessages.userId, userId));
```

### 2. 환경 변수 로딩 실패
```typescript
// ✅ 환경 변수 검증 추가
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL이 설정되지 않았습니다. .env 파일을 확인하세요.");
}

if (!process.env.CLERK_SECRET_KEY) {
  throw new Error("CLERK_SECRET_KEY가 설정되지 않았습니다.");
}
```

### 3. Drizzle 마이그레이션 오류
```typescript
// drizzle.config.ts 설정 확인
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './app/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

## 📝 코드 작성 시 체크리스트

### 컴포넌트 작성
- [ ] ShadCN 컴포넌트 우선 사용
- [ ] TypeScript 타입 정의 완료
- [ ] 인터페이스에 'I' 접두사 적용
- [ ] 에러 바운더리 설정

### 데이터베이스 작업
- [ ] Drizzle ORM만 사용
- [ ] 사용자 ID 기반 데이터 격리
- [ ] 적절한 인덱스 설정
- [ ] 마이그레이션 스크립트 작성

### 인증 플로우
- [ ] 보호된 라우트에서 인증 검증
- [ ] 적절한 리다이렉트 처리
- [ ] 에러 메시지 사용자 친화적 작성

## 🎯 결론
이 가이드를 따라 구현하면 안전하고 확장 가능한 Remix + Clerk 애플리케이션을 만들 수 있습니다. 각 단계를 차근차근 따라하되, 보안과 타입 안전성을 절대 타협하지 마세요. 