import { json, ActionFunctionArgs } from "@remix-run/node";
import { getAuth } from "@clerk/remix/ssr.server";
import { nanoid } from "nanoid";
import { db } from "~/db";
import { subscriptionPlans, payments } from "~/db/schema";
import { eq } from "drizzle-orm";
import { ITossPaymentRequest, IPaymentApiResponse } from "types";

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

    // 고유한 주문 ID 생성
    const orderId = `order_${Date.now()}_${nanoid(8)}`;
    const paymentId = `payment_${Date.now()}_${nanoid(8)}`;

    // 결제 기록 생성 (pending 상태)
    await db.insert(payments).values({
      id: paymentId,
      userId,
      planId,
      tossPaymentKey: '', // 결제 승인 시 업데이트
      tossOrderId: orderId,
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

    // 토스페이먼츠 결제 요청 데이터 생성
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://your-domain.com' 
      : 'http://localhost:5173';

    const paymentRequest: ITossPaymentRequest = {
      orderId,
      orderName: plan.name,
      amount: Number(plan.price),
      customerEmail,
      customerName,
      successUrl: `${baseUrl}/payment/success?orderId=${orderId}&paymentId=${paymentId}`,
      failUrl: `${baseUrl}/payment/fail?orderId=${orderId}&paymentId=${paymentId}`
    };

    console.log('🎯 [Payment Create] 결제 요청 생성:', {
      userId,
      planId: plan.id,
      planName: plan.name,
      amount: plan.price,
      orderId,
      paymentId
    });

    return json({ 
      success: true, 
      data: {
        ...paymentRequest,
        paymentId,
        planDetails: {
          name: plan.name,
          membershipTier: plan.membershipTier,
          features: plan.features
        }
      }
    } as IPaymentApiResponse);

  } catch (error) {
    console.error("❌ [Payment Create Error]", error);
    return json({ 
      success: false, 
      error: "Failed to create payment request" 
    } as IPaymentApiResponse, { status: 500 });
  }
}; 