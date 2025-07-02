import { json, LoaderFunctionArgs } from "@remix-run/node";
import { getAuth } from "@clerk/remix/ssr.server";
import { db } from "~/db";
import { subscriptions, subscriptionPlans, userProfiles } from "~/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { IPaymentApiResponse, ISubscription, ISubscriptionPlan, IUserProfile } from "types";

export const loader = async (args: LoaderFunctionArgs) => {
  try {
    const authResult = await getAuth(args);
    const { userId } = authResult;

    if (!userId) {
      return json({ 
        success: false, 
        error: "Authentication required" 
      } as IPaymentApiResponse, { status: 401 });
    }

    // 사용자 프로필 조회
    const [userProfile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.id, userId))
      .limit(1);

    if (!userProfile) {
      return json({ 
        success: false, 
        error: "User profile not found" 
      } as IPaymentApiResponse, { status: 404 });
    }

    // 현재 활성 구독 조회 (가장 최근 구독)
    const activeSubscriptionQuery = await db
      .select({
        subscription: subscriptions,
        plan: subscriptionPlans
      })
      .from(subscriptions)
      .innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
      .where(
        and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.status, 'active')
        )
      )
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);

    const activeSubscription = activeSubscriptionQuery[0];

    // 구독 만료 체크 및 상태 업데이트
    if (activeSubscription) {
      const now = new Date();
      const endDate = new Date(activeSubscription.subscription.endDate);
      
      if (now > endDate) {
        // 구독 만료 - 상태 업데이트
        await db
          .update(subscriptions)
          .set({
            status: 'expired',
            updatedAt: now
          })
          .where(eq(subscriptions.id, activeSubscription.subscription.id));

        // 사용자 등급을 basic으로 다운그레이드
        await db
          .update(userProfiles)
          .set({
            membershipTier: 'basic',
            updatedAt: now
          })
          .where(eq(userProfiles.id, userId));

        console.log('⏰ [Subscription Expired] 구독 만료 처리:', {
          userId,
          subscriptionId: activeSubscription.subscription.id,
          expiredAt: endDate.toISOString()
        });

        // 만료된 경우 activeSubscription을 null로 설정
        const expiredActiveSubscription = null;
        
        return json({ 
          success: true, 
          data: {
            user: {
              id: userProfile.id,
              membershipTier: 'basic', // 만료 후 basic으로 다운그레이드
              baby_nickname: userProfile.baby_nickname,
              dueDate: userProfile.dueDate,
              gender: userProfile.gender,
              relation: userProfile.relation,
              createdAt: userProfile.createdAt,
              updatedAt: now
            } as IUserProfile,
            activeSubscription: expiredActiveSubscription,
            isSubscribed: false,
            subscriptionExpired: true,
            expiredAt: endDate.toISOString()
          }
        } as IPaymentApiResponse);
      }
    }

    // 응답 데이터 구성
    const responseData = {
      user: {
        id: userProfile.id,
        membershipTier: userProfile.membershipTier,
        baby_nickname: userProfile.baby_nickname,
        dueDate: userProfile.dueDate,
        gender: userProfile.gender,
        relation: userProfile.relation,
        createdAt: userProfile.createdAt,
        updatedAt: userProfile.updatedAt
      } as IUserProfile,
      activeSubscription: activeSubscription ? {
        id: activeSubscription.subscription.id,
        userId: activeSubscription.subscription.userId,
        planId: activeSubscription.subscription.planId,
        status: activeSubscription.subscription.status,
        startDate: activeSubscription.subscription.startDate,
        endDate: activeSubscription.subscription.endDate,
        autoRenew: activeSubscription.subscription.autoRenew,
        tossCustomerKey: activeSubscription.subscription.tossCustomerKey,
        tossBillingKey: activeSubscription.subscription.tossBillingKey,
        metadata: activeSubscription.subscription.metadata as Record<string, any>,
        createdAt: activeSubscription.subscription.createdAt,
        updatedAt: activeSubscription.subscription.updatedAt,
        plan: {
          id: activeSubscription.plan.id,
          name: activeSubscription.plan.name,
          membershipTier: activeSubscription.plan.membershipTier,
          price: Number(activeSubscription.plan.price),
          billingPeriod: activeSubscription.plan.billingPeriod,
          dailyQuestionLimit: activeSubscription.plan.dailyQuestionLimit,
          weeklyQuestionLimit: activeSubscription.plan.weeklyQuestionLimit,
          monthlyQuestionLimit: activeSubscription.plan.monthlyQuestionLimit,
          features: activeSubscription.plan.features as string[],
          isActive: activeSubscription.plan.isActive,
          createdAt: activeSubscription.plan.createdAt,
          updatedAt: activeSubscription.plan.updatedAt
        } as ISubscriptionPlan
      } : null,
      isSubscribed: !!activeSubscription && activeSubscription.subscription.status === 'active',
      subscriptionExpired: false
    };

    console.log('📊 [Subscription Status] 구독 상태 조회:', {
      userId,
      membershipTier: responseData.user.membershipTier,
      isSubscribed: responseData.isSubscribed,
      planName: activeSubscription?.plan.name || 'None'
    });

    return json({ 
      success: true, 
      data: responseData 
    } as IPaymentApiResponse);

  } catch (error) {
    console.error("❌ [Subscription Status Error]", error);
    return json({ 
      success: false, 
      error: "Failed to fetch subscription status" 
    } as IPaymentApiResponse, { status: 500 });
  }
}; 