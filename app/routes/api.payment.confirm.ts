import { json, ActionFunctionArgs } from "@remix-run/node";
import { getAuth } from "@clerk/remix/ssr.server";
import { nanoid } from "nanoid";
import { db } from "~/db";
import { subscriptionPlans, payments, subscriptions, userProfiles } from "~/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { ITossPaymentConfirm, ITossPaymentResponse, IPaymentApiResponse } from "types";

// 🔒 결제 승인 처리 중인 orderId를 추적하는 간단한 인메모리 락
const processingPayments = new Set<string>();

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

    const { paymentKey, orderId, amount } = await request.json();

    if (!paymentKey || !orderId || !amount) {
      return json({ 
        success: false, 
        error: "Missing required payment parameters" 
      } as IPaymentApiResponse, { status: 400 });
    }

    console.log('🎯 [Payment Confirm] 결제 승인 요청:', {
      userId,
      paymentKey,
      orderId,
      amount,
      timestamp: new Date().toISOString()
    });

    // 🔒 동일한 orderId에 대한 동시 처리 방지
    if (processingPayments.has(orderId)) {
      console.warn('⚠️ [Payment Confirm] 동일한 주문이 이미 처리 중 - 대기:', {
        orderId,
        currentProcessing: Array.from(processingPayments)
      });
      
      // 최대 5초 대기하면서 처리 완료를 기다림
      for (let i = 0; i < 50; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
        if (!processingPayments.has(orderId)) {
          break;
        }
      }
      
      // 대기 후에도 여전히 처리 중이면 에러 반환
      if (processingPayments.has(orderId)) {
        return json({ 
          success: false, 
          error: "Another payment confirmation is in progress for this order",
          retryable: true
        } as IPaymentApiResponse, { status: 429 });
      }
    }

    // 🔐 현재 orderId를 처리 중 목록에 추가
    processingPayments.add(orderId);

    try {
      // 🔒 중복 요청 방지: 기존 결제 기록 조회 (모든 상태 포함)
    const [existingPayment] = await db
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.tossOrderId, orderId),
          eq(payments.userId, userId)
        )
      )
      .limit(1);

    if (!existingPayment) {
      return json({ 
        success: false, 
        error: "Payment record not found" 
      } as IPaymentApiResponse, { status: 404 });
    }

    // 🚫 이미 처리된 결제인지 확인
    if (existingPayment.status === 'confirmed') {
      console.log('⚠️ [Payment Confirm] 이미 승인된 결제 - 성공 응답 반환:', {
        paymentId: existingPayment.id,
        status: existingPayment.status,
        paymentKey: existingPayment.tossPaymentKey
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
          paymentKey: existingPayment.tossPaymentKey,
          orderId: existingPayment.tossOrderId,
          paymentStatus: 'DONE',
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
      console.error('❌ [Payment Confirm] 금액 불일치:', {
        expected: existingPayment.amount,
        received: amount
      });
      return json({ 
        success: false, 
        error: "Payment amount mismatch" 
      } as IPaymentApiResponse, { status: 400 });
    }

    // 토스페이먼츠 결제 승인 API 호출
    const tossConfirmRequest: ITossPaymentConfirm = {
      paymentKey,
      orderId,
      amount: Number(amount)
    };

    const tossSecretKey = process.env.TOSS_SECRET_KEY;
    if (!tossSecretKey) {
      throw new Error("TOSS_SECRET_KEY is not configured");
    }

    const tossResponse = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(tossSecretKey + ':').toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tossConfirmRequest)
    });

    const tossResult: ITossPaymentResponse = await tossResponse.json();

    if (!tossResponse.ok) {
      console.error('❌ [Toss Payment Error]', tossResult);
      
      // 🔍 일시적 시스템 에러 vs 실제 결제 실패 구분
      const errorCode = tossResult.failure?.code;
      const isTemporaryError = errorCode && [
        'FAILED_PAYMENT_INTERNAL_SYSTEM_PROCESSING',  // 시스템 처리 중
        'PROVIDER_ERROR',                             // 결제사 에러
        'TIMEOUT',                                    // 타임아웃
      ].includes(errorCode);

      if (isTemporaryError) {
        console.warn('⚠️ [Toss Payment] 일시적 시스템 에러 - 결제 상태 유지:', {
          errorCode,
          message: tossResult.failure?.message
        });
        
        // 일시적 에러의 경우 결제 상태를 유지하고 에러만 반환
        return json({ 
          success: false, 
          error: `일시적 시스템 오류입니다. 잠시 후 다시 시도해주세요. (${tossResult.failure?.message})`,
          retryable: true,
          errorCode: errorCode
        } as IPaymentApiResponse, { status: 503 });
      }
      
      // 실제 결제 실패인 경우에만 failed 상태로 변경
      await db
        .update(payments)
        .set({
          status: 'failed',
          metadata: {
            ...(existingPayment.metadata as Record<string, any> || {}),
            tossError: tossResult.failure,
            failedAt: new Date().toISOString()
          },
          updatedAt: new Date()
        })
        .where(eq(payments.id, existingPayment.id));

      return json({ 
        success: false, 
        error: `Payment failed: ${tossResult.failure?.message || 'Unknown error'}` 
      } as IPaymentApiResponse, { status: 400 });
    }

    console.log('✅ [Toss Payment Success]', {
      paymentKey: tossResult.paymentKey,
      orderId: tossResult.orderId,
      status: tossResult.status,
      method: tossResult.method,
      totalAmount: tossResult.totalAmount
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
        tossPaymentKey: tossResult.paymentKey,
        method: tossResult.method,
        status: 'confirmed',
        paidAt: new Date(tossResult.approvedAt || tossResult.requestedAt),
        metadata: {
          ...(existingPayment.metadata as Record<string, any> || {}),
          tossResponse: tossResult
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
        paymentKey: tossResult.paymentKey,
        orderId: tossResult.orderId
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

    console.log('🎉 [Payment Success] 결제 완료 및 구독 활성화:', {
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
        paymentKey: tossResult.paymentKey,
        orderId: tossResult.orderId,
        paymentStatus: tossResult.status,
        subscriptionId,
        membershipTier: plan.membershipTier,
        planName: plan.name,
        startDate: now.toISOString(),
        endDate: endDate.toISOString(),
        receipt: tossResult.receipt
      }
    } as IPaymentApiResponse);

    } catch (error) {
      console.error("❌ [Payment Confirm Error]", error);
      return json({ 
        success: false, 
        error: "Failed to confirm payment" 
      } as IPaymentApiResponse, { status: 500 });
    } finally {
      // 🔓 처리 완료 후 락 해제
      processingPayments.delete(orderId);
      console.log('🔓 [Payment Confirm] 락 해제:', {
        orderId,
        remainingProcessing: Array.from(processingPayments)
      });
    }

  } catch (error) {
    // 🚨 최상위 에러 처리 (인증, 파라미터 검증 등)
    console.error("❌ [Payment Confirm Critical Error]", error);
    return json({ 
      success: false, 
      error: "Critical error during payment confirmation" 
    } as IPaymentApiResponse, { status: 500 });
  }
}; 