import { type ActionFunctionArgs, json, redirect } from "@remix-run/node";
import { getAuth } from "@clerk/remix/ssr.server";
import { db, userProfiles } from "~/db";
import { and, eq } from "drizzle-orm";

export const action = async (args: ActionFunctionArgs) => {
  const { userId } = await getAuth(args);

  if (!userId) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await args.request.formData();
  const baby_nickname = formData.get("baby_nickname") as string;
  const dueDate = formData.get("dueDate") as string;
  const gender = formData.get("gender") as string;
  const relation = formData.get("relation") as string;

  if (!baby_nickname || !dueDate || !gender || !relation) {
    return json({ error: "All fields are required" }, { status: 400 });
  }
  
  try {
    await db
      .insert(userProfiles)
      .values({
        id: userId,
        baby_nickname,
        dueDate: new Date(dueDate),
        gender: gender as "boy" | "girl" | "unknown",
        relation: relation as "mother" | "father",
        membershipTier: "basic",
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: userProfiles.id,
        set: {
          baby_nickname,
          dueDate: new Date(dueDate),
          gender: gender as "boy" | "girl" | "unknown",
          relation: relation as "mother" | "father",
          updatedAt: new Date(),
        },
      });

    return redirect("/chat");
  } catch (error) {
    console.error("Onboarding data save error:", error);
    return json(
      { error: "Failed to save onboarding data." },
      { status: 500 }
    );
  }
}; 