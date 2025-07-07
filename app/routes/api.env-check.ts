import { json } from "@remix-run/node";

export const loader = async () => {
  // 프로덕션에서는 보안상 제한적인 정보만 제공
  const envCheck = {
    nodeEnv: process.env.NODE_ENV,
    hasClerkPublishableKey: !!process.env.CLERK_PUBLISHABLE_KEY,
    hasClerkSecretKey: !!process.env.CLERK_SECRET_KEY,
    clerkKeyType: process.env.CLERK_PUBLISHABLE_KEY?.startsWith('pk_test_') ? 'development' : 
                  process.env.CLERK_PUBLISHABLE_KEY?.startsWith('pk_live_') ? 'production' : 'unknown',
    hasGoogleAiKey: !!process.env.GOOGLE_AI_API_KEY,
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    timestamp: new Date().toISOString(),
  };

  return json(envCheck);
}; 