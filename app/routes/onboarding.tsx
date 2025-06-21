import { type LoaderFunctionArgs, redirect } from "@remix-run/node";
import { getAuth } from "@clerk/remix/ssr.server";
import { OnboardingForm } from "~/components/onboarding/OnboardingForm";
import { db, userProfiles } from "~/db";
import { eq } from "drizzle-orm";

export const loader = async (args: LoaderFunctionArgs) => {
  const { userId } = await getAuth(args);

  if (userId) {
    const userProfile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.id, userId),
    });

    if (userProfile) {
      return redirect("/chat");
    }
  }
  
  return {};
};

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-light-gray flex items-center justify-center p-4">
      <OnboardingForm />
    </div>
  );
} 