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

    // 단건결제 플랜만 허용
    if (planId !== 'premium-onetime') {
      return json({ 
        success: false, 
        error: "This endpoint only supports one-time payment plans" 
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

    // 단건결제인지 재검증
    if (plan.billingPeriod !== 'one_time') {
      return json({ 
        success: false, 
        error: "Plan is not a one-time payment plan" 
      } as IPaymentApiResponse, { status: 400 });
    }

    // 고유한 결제 ID 생성 (포트원 V2 형식)
    const paymentId = `onetime-${Date.now()}-${nanoid(8)}`;
    const orderId = `order-onetime-${Date.now()}-${nanoid(8)}`;

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
        billingPeriod: plan.billingPeriod, // 'one_time'
        paymentType: 'one_time', // 단건결제 식별자
        customerEmail,
        customerName
      }
    });

    // 포트원 V2 결제 요청 데이터 생성
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://premom.care' 
      : 'http://localhost:5173';

    // 포트원 환경변수 확인 - 단건결제용 채널키 사용
    const storeId = process.env.PORTONE_STORE_ID;
    const channelKey = process.env.PORTONE_ONETIME_CHANNEL_KEY; // 단건결제용 채널키

    // 🔍 채널키 정보 로그 출력
    console.log('🔑 [One-Time Payment] 채널키 정보:', {
      storeId: storeId || 'undefined',
      channelKey: channelKey || 'undefined',
      PORTONE_ONETIME_CHANNEL_KEY: process.env.PORTONE_ONETIME_CHANNEL_KEY,
      allChannelKeys: {
        subscription: process.env.PORTONE_CHANNEL_KEY,
        oneTime: process.env.PORTONE_ONETIME_CHANNEL_KEY
      }
    });

    if (!storeId || !channelKey) {
      throw new Error("PortOne configuration is missing. Please set PORTONE_STORE_ID and PORTONE_ONETIME_CHANNEL_KEY in environment variables.");
    }

    const paymentRequest: IPortOnePaymentRequest = {
      storeId,
      channelKey,
      paymentId,
      orderName: `${plan.name} (이용권)`, // 이용권 명시
      totalAmount: Number(plan.price),
      currency: 'CURRENCY_KRW', // PortOne V2에서는 CURRENCY_ 접두사 필요
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
        paymentType: 'one_time', // 단건결제 구분자
        orderId,
      },
      redirectUrl: `${baseUrl}/payment/success?paymentId=${paymentId}&orderId=${orderId}&amount=${plan.price}`,
      noticeUrls: [`${baseUrl}/api/payment/webhook`],
    };

    // 상세 로그 출력 (항상)
    console.log('💰 [One-Time Payment] 단건결제 요청 생성:', {
      userId,
      planName: plan.name,
      amount: plan.price,
      paymentId,
      paymentType: 'one_time',
      storeId,
      channelKey,
      orderName: paymentRequest.orderName,
      totalAmount: paymentRequest.totalAmount,
      currency: paymentRequest.currency
    });
    
    console.log('📋 [One-Time Payment] 전체 결제 요청 데이터:', paymentRequest);

    return json({ 
      success: true, 
      data: {
        ...paymentRequest,
        planDetails: {
          name: plan.name,
          membershipTier: plan.membershipTier,
          billingPeriod: plan.billingPeriod,
          features: plan.features,
          paymentType: 'one_time'
        },
        // 추가 응답 데이터
        successUrl: `${baseUrl}/payment/success?paymentId=${paymentId}&orderId=${orderId}&amount=${plan.price}`,
        failUrl: `${baseUrl}/payment/fail?paymentId=${paymentId}&orderId=${orderId}&amount=${plan.price}`,
      }
    } as IPaymentApiResponse);

  } catch (error) {
    console.error("❌ [One-Time Payment Error]", error);
    return json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to create one-time payment request" 
    } as IPaymentApiResponse, { status: 500 });
  }
}; 