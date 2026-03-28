import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { getServiceSupabase, getAuthUser } from "@/lib/supabase";
import type { Plan } from "@/lib/plans";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const user = await getAuthUser(cookieStore);
  if (!user) redirect("/login");

  const db = getServiceSupabase();
  const { data: profile } = await db
    .from("user_profiles")
    .select("plan, daily_chat_count")
    .eq("id", user.id)
    .single();

  return (
    <AppShell
      userEmail={user.email}
      plan={(profile?.plan ?? "free") as Plan}
      dailyChatCount={profile?.daily_chat_count ?? 0}
    >
      {children}
    </AppShell>
  );
}
