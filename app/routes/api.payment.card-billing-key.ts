import { json, type ActionFunctionArgs } from "@remix-run/node";
import { getAuth } from "@clerk/remix/ssr.server";
import type { 
  INicePayCardBillingKeyRequest, 
  INicePayCardBillingKeyResult,
  ICardForm 
} from "types";

// 환경변수 검증
const requiredEnvVars = {
  PORTONE_STORE_ID: process.env.PORTONE_STORE_ID,
  PORTONE_CHANNEL_KEY: process.env.PORTONE_CHANNEL_KEY,
  PORTONE_API_SECRET: process.env.PORTONE_API_SECRET,
};

for (const [key, value] of Object.entries(requiredEnvVars)) {
  if (!value) {
    console.error(`❌ 환경변수 ${key}가 설정되지 않았습니다.`);
    throw new Error(`환경변수 ${key}가 필요합니다.`);
  }
}

// 고객 ID 생성 (Clerk userId -> 20자 이내 ID로 변환)
async function generateCustomerId(userId: string): Promise<string> {
  const crypto = await import('crypto');
  return crypto.createHash('md5').update(userId).digest('hex').substring(0, 16);
}

// Issue ID 생성 (영문 대소문자, 숫자만 40자 이내)
async function generateIssueId(): Promise<string> {
  const crypto = await import('crypto');
  const timestamp = Date.now().toString();
  const randomBytes = crypto.randomBytes(4).toString('hex');
  return `billing_${timestamp}_${randomBytes}`.substring(0, 40);
}

// 카드 빌링키 발급 함수
async function issueCardBillingKey(request: INicePayCardBillingKeyRequest): Promise<INicePayCardBillingKeyResult> {
  const url = 'https://api.portone.io/billing-keys';
  
  const requestBody = {
    storeId: request.storeId,
    channelKey: request.channelKey,
    customer: {
      id: request.customer.customerId,
      name: {
        full: request.customer.fullName
      },
      email: request.customer.email
    },
    method: {
      card: {
        credential: {
          number: request.card.number,
          expiryYear: request.card.expiryYear,
          expiryMonth: request.card.expiryMonth,
          birthOrBusinessRegistrationNumber: request.card.birthOrBusinessRegistrationNumber,
          passwordTwoDigits: request.card.passwordTwoDigits,
        }
      }
    }
  };

  console.log('🔄 포트원 빌링키 발급 요청:', {
    url,
    storeId: request.storeId,
    channelKey: request.channelKey,
    customerId: request.customer.customerId,
    cardNumber: `${request.card.number.substring(0, 4)}****`,
    expiryYear: request.card.expiryYear,
    expiryMonth: request.card.expiryMonth,
    expiryYearLength: request.card.expiryYear.length,
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `PortOne ${requiredEnvVars.PORTONE_API_SECRET}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  const result = await response.json();

  // 응답 전체를 로깅하여 구조 확인
  console.log('📋 포트원 API 전체 응답:', {
    status: response.status,
    responseBody: result,
  });

  if (!response.ok) {
    console.error('❌ 포트원 빌링키 발급 실패:', {
      status: response.status,
      error: result,
    });
    
    throw new Error(result.message || `포트원 API 오류: ${response.status}`);
  }

  // 실제 빌링키 정보 추출
  const billingKey = result.billingKeyInfo?.billingKey;
  
  console.log('✅ 포트원 빌링키 발급 성공:', {
    billingKey: billingKey ? `${billingKey.substring(0, 8)}...` : 'N/A',
    fullResult: result,
  });

  return {
    code: '0000',
    message: '빌링키 발급 성공',
    billingKey: billingKey,
    issueId: request.issueId,
    pgTxId: result.pgTxId,
    cardCompany: 'UNKNOWN', // 실제로는 응답에서 파싱해야 함
    maskedCardNumber: `**** **** **** ${request.card.number.slice(-4)}`,
  };
}

// 빌링키 정보 저장 함수
async function saveBillingKeyInfo(userId: string, billingKeyInfo: INicePayCardBillingKeyResult) {
  const { db } = await import('~/db');
  const { cardBillingKeys } = await import('~/db/schema');
  const crypto = await import('crypto');

  try {
    console.log('💾 빌링키 정보 데이터베이스 저장 시작...');

    // 필수 필드 검증
    if (!billingKeyInfo.billingKey || !billingKeyInfo.issueId || !billingKeyInfo.maskedCardNumber) {
      throw new Error('빌링키 필수 정보가 누락되었습니다.');
    }

    const billingKeyRecord = {
      id: crypto.randomUUID(),
      userId,
      issueId: billingKeyInfo.issueId,
      billingKey: billingKeyInfo.billingKey,
      cardCompany: billingKeyInfo.cardCompany || 'UNKNOWN',
      maskedCardNumber: billingKeyInfo.maskedCardNumber,
      status: 'active' as const,
      issuedAt: new Date(),
      metadata: {
        pgTxId: billingKeyInfo.pgTxId,
        issuedBy: 'portone_api',
        processedAt: new Date().toISOString()
      },
    };

    await db.insert(cardBillingKeys).values(billingKeyRecord);
    
    console.log('✅ 빌링키 정보 데이터베이스 저장 완료:', {
      id: billingKeyRecord.id,
      userId,
      billingKey: `${billingKeyInfo.billingKey.substring(0, 8)}...`,
      maskedCardNumber: billingKeyInfo.maskedCardNumber,
    });

  } catch (error) {
    console.error('❌ 빌링키 정보 저장 중 오류:', error);
    throw error;
  }
}

export async function action(args: ActionFunctionArgs) {
  const { request } = args;
  
  if (request.method !== 'POST') {
    return json({ success: false, error: 'Method not allowed' }, { status: 405 });
  }

  try {
    // 사용자 인증 확인
    const { userId } = await getAuth(args);
    if (!userId) {
      return json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 });
    }

    // 요청 본문 파싱
    const { cardForm }: { cardForm: ICardForm } = await request.json();

    // 카드 정보 검증
    if (!cardForm.cardNumber || !cardForm.expiryMonth || !cardForm.expiryYear || 
        !cardForm.cardholderName || !cardForm.birthOrBusinessNumber || !cardForm.passwordTwoDigits) {
      return json({
        success: false,
        error: '필수 카드 정보가 누락되었습니다.',
      }, { status: 400 });
    }

    // 고객 ID 및 Issue ID 생성
    const customerId = await generateCustomerId(userId);
    const issueId = await generateIssueId();

    // 빌링키 발급 요청 구성
    const billingKeyRequest: INicePayCardBillingKeyRequest = {
      storeId: requiredEnvVars.PORTONE_STORE_ID!,
      channelKey: requiredEnvVars.PORTONE_CHANNEL_KEY!,
      billingKeyMethod: 'CARD',
      issueId,
      issueName: '프리미엄 정기결제',
      customer: {
        customerId,
        fullName: cardForm.cardholderName,
        email: `${userId}@temp.com`, // 실제로는 Clerk에서 이메일 가져와야 함
      },
      card: {
        number: cardForm.cardNumber.replace(/\s/g, ''),
        expiryYear: cardForm.expiryYear, // 2자리 연도 그대로 사용
        expiryMonth: cardForm.expiryMonth,
        birthOrBusinessRegistrationNumber: cardForm.birthOrBusinessNumber,
        passwordTwoDigits: cardForm.passwordTwoDigits,
      },
    };

    // 포트원 빌링키 발급
    const billingKeyResult = await issueCardBillingKey(billingKeyRequest);

    // 빌링키 정보 저장
    await saveBillingKeyInfo(userId, billingKeyResult);

    return json({
      success: true,
      data: {
        billingKey: billingKeyResult.billingKey,
        issueId: billingKeyResult.issueId,
        cardCompany: billingKeyResult.cardCompany,
        maskedCardNumber: billingKeyResult.maskedCardNumber,
        issuedAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('❌ 카드 빌링키 발급 중 오류:', error);

    return json({
      success: false,
      error: error instanceof Error ? error.message : '빌링키 발급 중 오류가 발생했습니다.',
    }, { status: 500 });
  }
} 