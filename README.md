# Welcome to Remix!

- 📖 [Remix docs](https://remix.run/docs)

## 🎯 포트원(PortOne) V2 결제 시스템 설정

이 프로젝트는 포트원 V2를 사용하여 결제 시스템을 구현합니다.

### 환경변수 설정

`.env` 파일에 다음 환경변수를 설정하세요:

```bash
# 포트원 V2 설정
PORTONE_STORE_ID=store-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
PORTONE_CHANNEL_KEY=channel-key-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
PORTONE_API_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 기타 환경변수
DATABASE_URL=postgresql://username:password@localhost:5432/database_name
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GOOGLE_AI_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
FREEMIUM_MOCK_MODE=false
```

### 포트원 설정 방법

1. [포트원 콘솔](https://admin.portone.io)에 로그인
2. 상점 생성 후 `PORTONE_STORE_ID` 확인
3. 결제 수단 설정 후 `PORTONE_CHANNEL_KEY` 확인
4. API Secret 발급 후 `PORTONE_API_SECRET` 설정

### 데이터베이스 마이그레이션

포트원으로 마이그레이션한 후 데이터베이스 스키마를 업데이트하세요:

```bash
npm run db:generate
npm run db:migrate
```

## Development

Run the dev server:

```sh
npm run dev
```

## Deployment

First, build your app for production:

```sh
npm run build
```

Then run the app in production mode:

```sh
npm start
```

Now you'll need to pick a host to deploy it to.

### DIY

If you're familiar with deploying Node applications, the built-in Remix app server is production-ready.

Make sure to deploy the output of `npm run build`

- `build/server`
- `build/client`

## Styling

This template comes with [Tailwind CSS](https://tailwindcss.com/) already configured for a simple default starting experience. You can use whatever css framework you prefer. See the [Vite docs on css](https://vitejs.dev/guide/features.html#css) for more information.
