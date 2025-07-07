import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { getAuth } from "@clerk/remix/ssr.server";

export const loader = async (args: LoaderFunctionArgs) => {
  try {
    const authResult = await getAuth(args);
    const { userId, sessionId } = authResult;

    // 환경 변수 체크 (민감한 정보는 마스킹)
    const clerkPublishableKey = process.env.CLERK_PUBLISHABLE_KEY;
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;

    const debugInfo = {
      // 인증 상태
      auth: {
        userId: userId || "null",
        sessionId: sessionId || "null",
        isAuthenticated: !!userId,
      },
      // 환경 변수 상태 (민감한 정보 마스킹)
      environment: {
        clerkPublishableKey: clerkPublishableKey 
          ? `${clerkPublishableKey.substring(0, 7)}...${clerkPublishableKey.substring(clerkPublishableKey.length - 4)}`
          : "NOT_SET",
        clerkSecretKey: clerkSecretKey
          ? `${clerkSecretKey.substring(0, 7)}...${clerkSecretKey.substring(clerkSecretKey.length - 4)}`
          : "NOT_SET",
        clerkPublishableKeyType: clerkPublishableKey?.startsWith('pk_test_') ? 'DEVELOPMENT' 
          : clerkPublishableKey?.startsWith('pk_live_') ? 'PRODUCTION' 
          : 'UNKNOWN',
        clerkSecretKeyType: clerkSecretKey?.startsWith('sk_test_') ? 'DEVELOPMENT'
          : clerkSecretKey?.startsWith('sk_live_') ? 'PRODUCTION'
          : 'UNKNOWN',
      },
      // 요청 정보
      request: {
        url: args.request.url,
        headers: {
          host: args.request.headers.get('host'),
          origin: args.request.headers.get('origin'),
          referer: args.request.headers.get('referer'),
          userAgent: args.request.headers.get('user-agent'),
        },
        cookies: {
          hasClerkCookies: args.request.headers.get('cookie')?.includes('__session') || false,
          cookieCount: args.request.headers.get('cookie')?.split(';').length || 0,
        },
      },
      // 시스템 정보
      system: {
        nodeEnv: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
      },
    };

    return json(debugInfo);
  } catch (error) {
    return json({
      error: "Clerk debug failed",
      message: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
};

// POST 메서드로도 접근 가능하도록
export const action = loader; 