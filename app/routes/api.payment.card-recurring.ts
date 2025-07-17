import { json, type ActionFunctionArgs } from "@remix-run/node";
import { getAuth } from "@clerk/remix/ssr.server";
import type { INicePayCardRecurringPaymentRequest, INicePayCardRecurringPaymentResult } from "types";

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

// 결제 ID 생성 (영문 대소문자, 숫자만)
async function generatePaymentId(): Promise<string> {
  const crypto = await import('crypto');
  const timestamp = Date.now().toString();
  const randomBytes = crypto.randomBytes(4).toString('hex');
  return `payment_${timestamp}_${randomBytes}`;
}

// 프리미엄 플랜 정보 (데이터베이스 ID와 일치시킴)
const PREMIUM_PLANS = {
  'premium-monthly': {
    name: '프리미엄 월간 구독',
    amount: 2000, // 2,000원 (데이터베이스와 일치)
    currency: 'KRW',
  },
  'premium-yearly': {
    name: '프리미엄 연간 구독',
    amount: 20000, // 20,000원 (데이터베이스와 일치)
    currency: 'KRW',
  }
};

// 카드 정기결제 실행 함수
async function processCardRecurringPayment(request: INicePayCardRecurringPaymentRequest): Promise<INicePayCardRecurringPaymentResult> {
  // 포트원 V2 빌링키 결제는 /payments/{paymentId}/billing-key 엔드포인트 사용
  const url = `https://api.portone.io/payments/${encodeURIComponent(request.paymentId)}/billing-key`;
  
  // 포트원 V2 빌링키 결제 API 규격에 맞는 요청 구조
  const requestBody: any = {
    billingKey: request.billingKey,
    orderName: request.orderName,
    amount: {
      total: request.amount,
    },
    currency: request.currency,
  };

  // customer 정보가 있는 경우에만 추가
  if (request.customer) {
    requestBody.customer = {
      id: request.customer.customerId,
      name: {
        full: request.customer.fullName
      },
      phoneNumber: "010-0000-0000", // 임시 전화번호 (실제로는 사용자 정보에서 가져와야 함)
      email: request.customer.email
    };
  }

  console.log('🔄 포트원 정기결제 요청:', {
    url,
    paymentId: request.paymentId,
    amount: request.amount,
    currency: request.currency,
    billingKey: `${request.billingKey.substring(0, 8)}...`,
    fullRequestBody: requestBody,
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `PortOne ${requiredEnvVars.PORTONE_API_SECRET}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  // 응답 타입 확인
  const contentType = response.headers.get('content-type');
  console.log('📋 포트원 정기결제 응답 정보:', {
    status: response.status,
    contentType: contentType,
    ok: response.ok,
  });

  let result;
  try {
    if (contentType && contentType.includes('application/json')) {
      result = await response.json();
    } else {
      // JSON이 아닌 경우 텍스트로 읽기
      const textResponse = await response.text();
      console.log('📋 포트원 API 텍스트 응답:', textResponse.substring(0, 500));
      
      // JSON 파싱 시도
      try {
        result = JSON.parse(textResponse);
      } catch (parseError) {
        // JSON 파싱 실패시 텍스트 응답 사용
        const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
        result = { error: textResponse, originalError: errorMessage };
      }
    }
  } catch (error) {
    console.error('❌ 응답 파싱 오류:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`응답 파싱 실패: ${errorMessage}`);
  }

  // 응답 전체를 로깅하여 구조 확인
  console.log('📋 포트원 정기결제 API 전체 응답:', {
    status: response.status,
    responseBody: result,
  });

  if (!response.ok) {
    console.error('❌ 포트원 정기결제 실패:', {
      status: response.status,
      error: result,
      requestBody: requestBody,
    });
    
    throw new Error(result.message || result.error || `포트원 정기결제 API 오류: ${response.status}`);
  }

  // 포트원 V2 API 응답 구조에 맞게 파싱
  const payment = result.payment;
  const paymentData = {
    paymentId: request.paymentId, // 요청에서 사용한 paymentId
    txId: payment.pgTxId,
    amount: request.amount, // 요청 금액 사용
    status: 'PAID', // 200 응답이면 결제 성공
    paidAt: payment.paidAt,
  };

  console.log('✅ 포트원 정기결제 성공:', paymentData);

  return {
    code: '0000',
    message: '정기결제 성공',
    ...paymentData,
  };
}

// 결제 기록 저장 및 프리미엄 상태 업데이트 함수
async function savePaymentRecord(userId: string, paymentResult: INicePayCardRecurringPaymentResult, planId: string) {
  const { db } = await import('~/db');
  const { subscriptions, payments, userProfiles, subscriptionPlans } = await import('~/db/schema');
  const { eq, and } = await import('drizzle-orm');
  const crypto = await import('crypto');

  try {
    console.log('💾 결제 기록 저장 및 프리미엄 상태 업데이트 시작...');

    // 필수 필드 검증
    if (!paymentResult.paymentId || !paymentResult.txId || !paymentResult.amount || !paymentResult.paidAt) {
      throw new Error('결제 결과 데이터가 불완전합니다.');
    }

    // 1. 결제 기록 저장
    const paymentRecord = {
      id: crypto.randomUUID(),
      userId,
      planId,
      portonePaymentKey: paymentResult.paymentId,
      portoneOrderId: paymentResult.txId,
      amount: paymentResult.amount.toString(),
      method: 'card_recurring',
      status: 'confirmed' as const,
      paidAt: new Date(paymentResult.paidAt).toISOString(),
      metadata: { 
        billingType: 'card_recurring',
        planId,
        processedAt: new Date().toISOString()
      },
    };

    await db.insert(payments).values(paymentRecord);
    console.log('✅ 결제 기록 저장 완료:', paymentRecord.id);

    // 2. 기존 활성 구독 조회 및 남은 기간 계산
    console.log('🔍 [Card Recurring] 기존 활성 구독 조회 중...');
    
    const existingSubscriptions = await db
      .select()
      .from(subscriptions)
      .where(and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.status, 'active')
      ));

    let totalRemainingDays = 0;
    const now = new Date();

    // 기존 구독들의 남은 기간 계산 및 종료 처리
    if (existingSubscriptions.length > 0) {
      console.log(`📊 [Card Recurring] ${existingSubscriptions.length}개의 기존 활성 구독 발견`);
      
      for (const existingSub of existingSubscriptions) {
        const endDate = new Date(existingSub.endDate);
        const remainingDays = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        
        console.log(`⏰ [Card Recurring] 기존 구독 남은 기간:`, {
          subscriptionId: existingSub.id,
          planId: existingSub.planId,
          endDate: existingSub.endDate,
          remainingDays: remainingDays
        });
        
        totalRemainingDays += remainingDays;
        
        // 기존 구독을 'replaced' 상태로 변경
        await db
          .update(subscriptions)
          .set({
            status: 'replaced',
            updatedAt: now.toISOString(),
            metadata: {
              ...(existingSub.metadata as Record<string, any> || {}),
              replacedAt: now.toISOString(),
              replacedBy: 'card_recurring_payment',
              preservedDays: remainingDays
            }
          })
          .where(eq(subscriptions.id, existingSub.id));
        
        console.log(`✅ [Card Recurring] 기존 구독 종료 처리 완료: ${existingSub.id}`);
      }
    }

    // 새 구독의 기간 계산 (기본 기간 + 기존 구독 남은 기간)
    const baseDays = planId.includes('monthly') ? 30 : 365;
    const totalDays = baseDays + totalRemainingDays;
    const endDate = new Date(now.getTime() + totalDays * 24 * 60 * 60 * 1000);

    console.log(`📅 [Card Recurring] 새 구독 기간 계산:`, {
      baseDays,
      totalRemainingDays,
      totalDays,
      startDate: now.toISOString(),
      endDate: endDate.toISOString()
    });

    // 3. 새로운 구독 생성 (항상 새로 생성)
    const newSubscription = {
      id: crypto.randomUUID(),
      userId,
      planId,
      status: 'active' as const,
      startDate: now.toISOString(),
      endDate: endDate.toISOString(),
      autoRenew: true, // 빌링키 결제는 항상 자동갱신
      metadata: {
        createdBy: 'card_recurring_payment',
        paymentType: 'recurring',
        initialPaymentId: paymentRecord.id,
        preservedDaysFromPreviousSubscriptions: totalRemainingDays,
        baseDays,
        totalDays
      },
    };

    await db.insert(subscriptions).values(newSubscription);
    console.log('✅ 새 구독 생성 완료:', {
      subscriptionId: newSubscription.id,
      preservedDays: totalRemainingDays,
      totalDays: totalDays
    });

    // 3. 사용자 프리미엄 상태 업데이트
    await db
      .update(userProfiles)
      .set({ 
        membershipTier: 'premium',
        updatedAt: new Date().toISOString(),
      })
      .where(eq(userProfiles.id, userId));
    console.log('✅ 사용자 프리미엄 상태 업데이트 완료');

    console.log('🎉 모든 DB 업데이트 완료!');
    
  } catch (error) {
    console.error('❌ DB 저장 중 오류:', error);
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
    const { billingKey, planId }: { billingKey: string; planId: keyof typeof PREMIUM_PLANS } = await request.json();

    // 입력 검증
    if (!billingKey) {
      return json({
        success: false,
        error: '빌링키가 필요합니다.',
      }, { status: 400 });
    }

    if (!planId || !PREMIUM_PLANS[planId]) {
      return json({
        success: false,
        error: '유효하지 않은 플랜입니다.',
      }, { status: 400 });
    }

    const plan = PREMIUM_PLANS[planId];
    
    // 고객 ID 및 결제 ID 생성
    const customerId = await generateCustomerId(userId);
    const paymentId = await generatePaymentId();

    // 정기결제 요청 구성
    const recurringPaymentRequest: INicePayCardRecurringPaymentRequest = {
      storeId: requiredEnvVars.PORTONE_STORE_ID!,
      channelKey: requiredEnvVars.PORTONE_CHANNEL_KEY!,
      paymentId,
      billingKey,
      orderName: plan.name,
      amount: plan.amount,
      currency: plan.currency,
      customer: {
        customerId,
        fullName: '프리미엄 사용자', // 실제로는 Clerk에서 사용자 정보 가져와야 함
        email: `${userId}@temp.com`, // 실제로는 Clerk에서 이메일 가져와야 함
      },
      customData: {
        userId,
        planId,
        billingType: 'card_recurring',
        subscribedAt: new Date().toISOString(),
      },
    };

    // 포트원 정기결제 실행
    const paymentResult = await processCardRecurringPayment(recurringPaymentRequest);

    // 결제 기록 저장
    await savePaymentRecord(userId, paymentResult, planId);

    return json({
      success: true,
      data: {
        paymentId: paymentResult.paymentId,
        txId: paymentResult.txId,
        amount: paymentResult.amount,
        status: paymentResult.status,
        paidAt: paymentResult.paidAt,
        plan: {
          id: planId,
          name: plan.name,
          amount: plan.amount,
        },
      },
    });

  } catch (error) {
    console.error('❌ 카드 정기결제 중 오류:', error);

    return json({
      success: false,
      error: error instanceof Error ? error.message : '정기결제 처리 중 오류가 발생했습니다.',
    }, { status: 500 });
  }
} 