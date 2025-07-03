import { json, ActionFunctionArgs } from "@remix-run/node";
import { getAuth } from "@clerk/remix/ssr.server";
import { nanoid } from "nanoid";
import { db } from "~/db";
import { subscriptionPlans, payments, subscriptions, userProfiles } from "~/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { IPaymentApiResponse } from "types";
// 🔒 결제 승인 처리 중인 paymentId를 추적하는 간단한 인메모리 락
const processingPayments = new Set<string>();

// 포트원 V2 API를 사용한 결제 검증
const verifyPortOnePayment = async (paymentId: string) => {
  const apiSecret = process.env.PORTONE_API_SECRET;
  if (!apiSecret) {
    throw new Error("PORTONE_API_SECRET is not configured");
  }

  console.log('🔍 [PortOne API] 결제 정보 조회 시작:', {
    paymentId,
    apiUrl: `https://api.portone.io/payments/${paymentId}`,
    hasApiSecret: !!apiSecret
  });

  try {
    const response = await fetch(`https://api.portone.io/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `PortOne ${apiSecret}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('📡 [PortOne API] 응답 상태:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (parseError) {
        const textResponse = await response.text();
        console.error('❌ [PortOne API] JSON 파싱 실패:', {
          status: response.status,
          response: textResponse,
          parseError: parseError
        });
        throw new Error(`PortOne API Error (HTTP ${response.status}): ${textResponse || response.statusText}`);
      }
      
      console.error('❌ [PortOne API] 에러 응답:', {
        status: response.status,
        errorData
      });
      
      throw new Error(`PortOne API Error (HTTP ${response.status}): ${errorData.message || JSON.stringify(errorData)}`);
    }

    const paymentData = await response.json();
    console.log('✅ [PortOne API] 결제 정보 조회 성공:', {
      paymentId: paymentData.id,
      status: paymentData.status,
      amount: paymentData.amount?.total,
      customData: paymentData.customData
    });

    return paymentData;
    
  } catch (error) {
    console.error('💥 [PortOne API] 네트워크 에러:', error);
    throw error;
  }
};

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

    const { paymentId, orderId, amount } = await request.json();

    if (!paymentId || !orderId || !amount) {
      return json({ 
        success: false, 
        error: "Missing required payment parameters" 
      } as IPaymentApiResponse, { status: 400 });
    }

    console.log('🎯 [PortOne Payment Confirm] 결제 승인 요청:', {
      userId,
      paymentId,
      orderId,
      amount,
      timestamp: new Date().toISOString()
    });

    // 🔒 동일한 paymentId에 대한 동시 처리 방지
    if (processingPayments.has(paymentId)) {
      console.warn('⚠️ [PortOne Payment Confirm] 동일한 결제가 이미 처리 중 - 대기:', {
        paymentId,
        currentProcessing: Array.from(processingPayments)
      });
      
      // 최대 5초 대기하면서 처리 완료를 기다림
      for (let i = 0; i < 50; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
        if (!processingPayments.has(paymentId)) {
          break;
        }
      }
      
      // 대기 후에도 여전히 처리 중이면 에러 반환
      if (processingPayments.has(paymentId)) {
        return json({ 
          success: false, 
          error: "Another payment confirmation is in progress for this payment",
          retryable: true
        } as IPaymentApiResponse, { status: 429 });
      }
    }

    // 🔐 현재 paymentId를 처리 중 목록에 추가
    processingPayments.add(paymentId);

    try {
      // 🔒 중복 요청 방지: 기존 결제 기록 조회 (모든 상태 포함)
      // orderId로 먼저 검색하고, 없으면 paymentId로 검색 (SDK 방식에서는 paymentId가 포트원에서 생성됨)
      let existingPaymentResult = await db
        .select()
        .from(payments)
        .where(
          and(
            eq(payments.portoneOrderId, orderId),
            eq(payments.userId, userId)
          )
        )
        .limit(1);

      if (existingPaymentResult.length === 0) {
        // orderId로 찾지 못한 경우, 우리가 생성한 paymentId로 검색
        existingPaymentResult = await db
          .select()
          .from(payments)
          .where(
            and(
              eq(payments.id, paymentId),
              eq(payments.userId, userId)
            )
          )
          .limit(1);
      }

      if (existingPaymentResult.length === 0) {
        return json({ 
          success: false, 
          error: "Payment record not found" 
        } as IPaymentApiResponse, { status: 404 });
      }

      const existingPayment = existingPaymentResult[0];

      // 🚫 이미 처리된 결제인지 확인
      if (existingPayment.status === 'confirmed') {
        console.log('⚠️ [PortOne Payment Confirm] 이미 승인된 결제 - 성공 응답 반환:', {
          paymentId: existingPayment.id,
          status: existingPayment.status,
          portonePaymentKey: existingPayment.portonePaymentKey
        });
        
        // 이미 성공한 결제의 경우 구독 정보도 함께 반환
        const [subscription] = await db
          .select({
            id: subscriptions.id,
            planId: subscriptions.planId,
            startDate: subscriptions.startDate,
            endDate: subscriptions.endDate
          })
          .from(subscriptions)
          .where(eq(subscriptions.userId, userId))
          .orderBy(desc(subscriptions.createdAt))
          .limit(1);

        const [plan] = await db
          .select()
          .from(subscriptionPlans)
          .where(eq(subscriptionPlans.id, existingPayment.planId))
          .limit(1);

        return json({ 
          success: true, 
          data: {
            paymentId: existingPayment.id,
            orderId: existingPayment.portoneOrderId,
            paymentStatus: 'PAID',
            subscriptionId: subscription?.id,
            membershipTier: plan?.membershipTier,
            planName: plan?.name,
            startDate: subscription?.startDate.toISOString(),
            endDate: subscription?.endDate.toISOString(),
            alreadyProcessed: true
          }
        } as IPaymentApiResponse);
      }

      if (existingPayment.status === 'failed') {
        return json({ 
          success: false, 
          error: "Payment has already failed" 
        } as IPaymentApiResponse, { status: 400 });
      }

      if (existingPayment.status !== 'pending') {
        return json({ 
          success: false, 
          error: `Payment is in invalid state: ${existingPayment.status}` 
        } as IPaymentApiResponse, { status: 400 });
      }

      // 금액 검증
      if (Number(existingPayment.amount) !== Number(amount)) {
        console.error('❌ [PortOne Payment Confirm] 금액 불일치:', {
          expected: existingPayment.amount,
          received: amount
        });
        return json({ 
          success: false, 
          error: "Payment amount mismatch" 
        } as IPaymentApiResponse, { status: 400 });
      }

      // 포트원 결제 정보 조회 및 검증
      const paymentData = await verifyPortOnePayment(paymentId);

      if (!paymentData) {
        return json({
          success: false,
          error: "Payment not found in PortOne"
        } as IPaymentApiResponse, { status: 404 });
      }

      const payment = paymentData;

      // 결제 상태 검증
      if (payment.status !== 'PAID') {
        console.error('❌ [PortOne Payment] 결제가 완료되지 않음:', {
          paymentId,
          status: payment.status
        });
        
        // 결제 실패인 경우에만 failed 상태로 변경
        if (payment.status === 'FAILED' || payment.status === 'CANCELLED') {
          await db
            .update(payments)
            .set({
              status: 'failed',
              metadata: {
                ...(existingPayment.metadata as Record<string, any> || {}),
                portonePayment: payment,
                failedAt: new Date().toISOString()
              },
              updatedAt: new Date()
            })
            .where(eq(payments.id, existingPayment.id));
        }

        return json({
          success: false,
          error: `Payment not completed. Status: ${payment.status}`
        } as IPaymentApiResponse, { status: 400 });
      }

      // 결제 금액 검증
      if (payment.amount.total !== Number(amount)) {
        return json({
          success: false,
          error: `Payment amount mismatch. Expected: ${amount}, Actual: ${payment.amount.total}`
        } as IPaymentApiResponse, { status: 400 });
      }

      // 상품 정보 검증 (customData에서)
      let customData: Record<string, any>;
      
      // customData가 문자열인 경우 JSON 파싱
      if (typeof payment.customData === 'string') {
        try {
          customData = JSON.parse(payment.customData);
        } catch (error) {
          console.error('❌ [PortOne Payment] customData JSON 파싱 실패:', {
            customData: payment.customData,
            error
          });
          return json({
            success: false,
            error: "Invalid payment custom data format"
          } as IPaymentApiResponse, { status: 400 });
        }
      } else {
        customData = payment.customData as Record<string, any>;
      }
      
      console.log('🔍 [PortOne Payment] 상품 정보 비교:', {
        'PortOne customData': customData,
        'PortOne planId': customData?.planId,
        'DB planId': existingPayment.planId,
        'Match': customData?.planId === existingPayment.planId
      });
      
      if (customData?.planId !== existingPayment.planId) {
        console.error('❌ [PortOne Payment] 상품 정보 불일치:', {
          expected: existingPayment.planId,
          received: customData?.planId,
          fullCustomData: customData
        });
        
        return json({
          success: false,
          error: "Product information mismatch"
        } as IPaymentApiResponse, { status: 400 });
      }

      console.log('✅ [PortOne Payment Success]', {
        paymentId: payment.id,
        orderId: customData?.orderId,
        status: payment.status,
        method: payment.method?.type,
        totalAmount: payment.amount.total
      });

      // 구독 계획 조회
      const [plan] = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.id, existingPayment.planId))
        .limit(1);

      if (!plan) {
        throw new Error("Subscription plan not found");
      }

      // 트랜잭션으로 결제 승인 및 구독 생성 처리
      const now = new Date();
      const subscriptionId = `sub_${Date.now()}_${nanoid(8)}`;
      
      // 구독 종료일 계산
      const endDate = new Date(now);
      if (plan.billingPeriod === 'monthly') {
        endDate.setMonth(endDate.getMonth() + 1);
      } else if (plan.billingPeriod === 'yearly') {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }

      // 1. 결제 기록 업데이트
      await db
        .update(payments)
        .set({
          portonePaymentKey: payment.id,
          method: payment.method?.type || 'UNKNOWN',
          status: 'confirmed',
          paidAt: new Date(payment.paidAt || payment.requestedAt),
          metadata: {
            ...(existingPayment.metadata as Record<string, any> || {}),
            portonePayment: payment
          },
          updatedAt: now
        })
        .where(eq(payments.id, existingPayment.id));

      // 2. 구독 생성
      await db.insert(subscriptions).values({
        id: subscriptionId,
        userId,
        planId: plan.id,
        status: 'active',
        startDate: now,
        endDate,
        autoRenew: true,
        metadata: {
          paymentId: existingPayment.id,
          portonePaymentId: payment.id,
          orderId: customData?.orderId
        }
      });

      // 3. 사용자 등급 업그레이드
      await db
        .update(userProfiles)
        .set({
          membershipTier: plan.membershipTier,
          updatedAt: now
        })
        .where(eq(userProfiles.id, userId));

      console.log('🎉 [PortOne Payment Success] 결제 완료 및 구독 활성화:', {
        userId,
        subscriptionId,
        planName: plan.name,
        membershipTier: plan.membershipTier,
        startDate: now.toISOString(),
        endDate: endDate.toISOString()
      });

      return json({ 
        success: true, 
        data: {
          paymentId: payment.id,
          orderId: customData?.orderId,
          paymentStatus: payment.status,
          subscriptionId,
          membershipTier: plan.membershipTier,
          planName: plan.name,
          startDate: now.toISOString(),
          endDate: endDate.toISOString(),
          receipt: payment.receipt
        }
      } as IPaymentApiResponse);

    } catch (error) {
      console.error("❌ [PortOne Payment Confirm Error]", error);
      return json({ 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to confirm payment" 
      } as IPaymentApiResponse, { status: 500 });
    } finally {
      // 🔓 처리 완료 후 락 해제
      processingPayments.delete(paymentId);
      console.log('🔓 [PortOne Payment Confirm] 락 해제:', {
        paymentId,
        remainingProcessing: Array.from(processingPayments)
      });
    }

  } catch (error) {
    // 🚨 최상위 에러 처리 (인증, 파라미터 검증 등)
    console.error("❌ [PortOne Payment Confirm Critical Error]", error);
    return json({ 
      success: false, 
      error: "Critical error during payment confirmation" 
    } as IPaymentApiResponse, { status: 500 });
  }
}; 