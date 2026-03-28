import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServiceSupabase, getAuthUser } from "@/lib/supabase";
import type { Plan } from "@/lib/plans";
import NewBotClient from "./NewBotClient";

export default async function NewBotPage() {
  const cookieStore = await cookies();
  const user = await getAuthUser(cookieStore);
  if (!user) redirect("/login");

  const db = getServiceSupabase();
  const { data: profile } = await db
    .from("user_profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  const plan = (profile?.plan ?? "free") as Plan;

  return <NewBotClient plan={plan} />;
}
