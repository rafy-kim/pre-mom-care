import { type LoaderFunctionArgs, redirect } from "@remix-run/node";
import { getAuth } from "@clerk/remix/ssr.server";
import { db, userProfiles } from "~/db";
import { eq } from "drizzle-orm";
import { calculatePregnancyWeek } from "~/utils/pregnancy";

export const loader = async (args: LoaderFunctionArgs) => {
  const { userId } = await getAuth(args);
  
  let currentWeek: number = 1; // 기본값은 1주차
  
  if (userId) {
    const userProfile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.id, userId),
    });
    
    if (userProfile?.dueDate) {
      const calculatedWeek = calculatePregnancyWeek(userProfile.dueDate);
      if (calculatedWeek && calculatedWeek >= 1 && calculatedWeek <= 40) {
        currentWeek = calculatedWeek;
      }
    }
  }
  
  // 현재 주차 페이지로 리다이렉트
  return redirect(`/pregnancy-info/${currentWeek}`);
};

// 컴포넌트는 필요 없지만 Remix에서 요구하므로 빈 컴포넌트 반환
export default function PregnancyInfoIndex() {
  return null;
}