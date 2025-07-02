import { json, LoaderFunctionArgs } from "@remix-run/node";
import { db } from "~/db";
import { subscriptionPlans } from "~/db/schema";
import { eq } from "drizzle-orm";
import { IPaymentApiResponse, ISubscriptionPlan } from "types";

export const loader = async (args: LoaderFunctionArgs) => {
  try {
    // 활성화된 구독 계획 목록 조회
    const plans = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.isActive, true))
      .orderBy(subscriptionPlans.price);

    // 클라이언트에 반환할 형태로 변환
    const formattedPlans: ISubscriptionPlan[] = plans.map(plan => ({
      id: plan.id,
      name: plan.name,
      membershipTier: plan.membershipTier,
      price: Number(plan.price),
      billingPeriod: plan.billingPeriod,
      dailyQuestionLimit: plan.dailyQuestionLimit,
      weeklyQuestionLimit: plan.weeklyQuestionLimit,
      monthlyQuestionLimit: plan.monthlyQuestionLimit,
      features: plan.features as string[],
      isActive: plan.isActive,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt
    }));

    console.log('📋 [Subscription Plans] 구독 계획 목록 조회:', {
      totalPlans: formattedPlans.length,
      plans: formattedPlans.map(p => ({ id: p.id, name: p.name, price: p.price }))
    });

    return json({ 
      success: true, 
      data: formattedPlans 
    } as IPaymentApiResponse<ISubscriptionPlan[]>);

  } catch (error) {
    console.error("❌ [Subscription Plans Error]", error);
    return json({ 
      success: false, 
      error: "Failed to fetch subscription plans" 
    } as IPaymentApiResponse, { status: 500 });
  }
}; 