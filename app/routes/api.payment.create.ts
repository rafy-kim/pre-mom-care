import { json, ActionFunctionArgs } from "@remix-run/node";
import { getAuth } from "@clerk/remix/ssr.server";
import { nanoid } from "nanoid";
import { db } from "~/db";
import { subscriptionPlans, payments } from "~/db/schema";
import { eq } from "drizzle-orm";
import { IPortOnePaymentRequest, IPaymentApiResponse } from "types";

export const action = async (args: ActionFunctionArgs) => {
  const { request } = args;
  
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const authResult = await getAuth(args);
    const { userId } = authResult;

    if (!userId) {
      return json({ 
        success: false, 
        error: "Authentication required" 
      } as IPaymentApiResponse, { status: 401 });
    }

    const { planId, customerEmail, customerName } = await request.json();

    if (!planId) {
      return json({ 
        success: false, 
        error: "Plan ID is required" 
      } as IPaymentApiResponse, { status: 400 });
    }

    // 구독 계획 조회
    const [plan] = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, planId))
      .limit(1);

    if (!plan) {
      return json({ 
        success: false, 
        error: "Invalid subscription plan" 
      } as IPaymentApiResponse, { status: 404 });
    }

    if (!plan.isActive) {
      return json({ 
        success: false, 
        error: "This subscription plan is no longer available" 
      } as IPaymentApiResponse, { status: 400 });
    }

    // 고유한 결제 ID 생성 (포트원 V2 형식)
    const paymentId = `payment-${Date.now()}-${nanoid(8)}`;
    const orderId = `order-${Date.now()}-${nanoid(8)}`;

    // 결제 기록 생성 (pending 상태)
    await db.insert(payments).values({
      id: paymentId,
      userId,
      planId,
      portonePaymentKey: '', // 결제 승인 시 업데이트
      portoneOrderId: orderId,
      amount: plan.price,
      method: '', // 결제 승인 시 업데이트
      status: 'pending',
      metadata: {
        planName: plan.name,
        membershipTier: plan.membershipTier,
        billingPeriod: plan.billingPeriod,
        customerEmail,
        customerName
      }
    });

    // 포트원 V2 결제 요청 데이터 생성
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://your-domain.com' 
      : 'http://localhost:5173';

    // 포트원 환경변수 확인
    const storeId = process.env.PORTONE_STORE_ID;
    const channelKey = process.env.PORTONE_CHANNEL_KEY;

    if (!storeId || !channelKey) {
      throw new Error("PortOne configuration is missing. Please set PORTONE_STORE_ID and PORTONE_CHANNEL_KEY in environment variables.");
    }

    const paymentRequest: IPortOnePaymentRequest = {
      storeId,
      channelKey,
      paymentId,
      orderName: plan.name,
      totalAmount: Number(plan.price),
      currency: 'KRW',
      payMethod: 'CARD', // 기본값으로 카드 결제 설정
      customer: {
        customerId: userId,
        fullName: customerName,
        email: customerEmail,
      },
      customData: {
        planId: plan.id,
        planName: plan.name,
        membershipTier: plan.membershipTier,
        billingPeriod: plan.billingPeriod,
        orderId,
      },
      redirectUrl: `${baseUrl}/payment/success?paymentId=${paymentId}&orderId=${orderId}`,
      noticeUrls: [`${baseUrl}/api/payment/webhook`],
    };

    console.log('🎯 [PortOne Payment Create] 결제 요청 생성:', {
      userId,
      planId: plan.id,
      planName: plan.name,
      amount: plan.price,
      paymentId,
      orderId,
      storeId,
      channelKey: channelKey.substring(0, 20) + '...' // 보안을 위해 일부만 로깅
    });

    return json({ 
      success: true, 
      data: {
        ...paymentRequest,
        planDetails: {
          name: plan.name,
          membershipTier: plan.membershipTier,
          features: plan.features
        },
        // 추가 응답 데이터
        successUrl: `${baseUrl}/payment/success?paymentId=${paymentId}&orderId=${orderId}`,
        failUrl: `${baseUrl}/payment/fail?paymentId=${paymentId}&orderId=${orderId}`,
      }
    } as IPaymentApiResponse);

  } catch (error) {
    console.error("❌ [PortOne Payment Create Error]", error);
    return json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to create payment request" 
    } as IPaymentApiResponse, { status: 500 });
  }
}; 