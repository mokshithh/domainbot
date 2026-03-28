import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServiceSupabase, getAuthUser } from "@/lib/supabase";
import type { Plan } from "@/lib/plans";
import Link from "next/link";
import LeadsClient from "./LeadsClient";

export default async function LeadsPage() {
  const cookieStore = await cookies();
  const user = await getAuthUser(cookieStore);
  if (!user) redirect("/login");

  const db = getServiceSupabase();
  const [{ data: profile }, { data: botsData }] = await Promise.all([
    db.from("user_profiles").select("plan").eq("id", user.id).single(),
    db.from("bots").select("id, name").eq("user_id", user.id).order("name"),
  ]);

  const plan = (profile?.plan ?? "free") as Plan;

  if (plan !== "pro" && plan !== "max") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-5 px-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-2 border border-border-subtle">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/20">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Leads Dashboard</h1>
          <p className="mt-2 text-sm text-white/40 max-w-sm">
            Capture and manage leads from your chatbot conversations. Available on Pro and Max plans.
          </p>
        </div>
        <Link
          href="/account"
          className="rounded-xl bg-gradient-brand px-6 py-3 text-sm font-semibold text-white shadow-glow-sm hover:shadow-glow transition-all"
        >
          Upgrade to Pro →
        </Link>
      </div>
    );
  }

  const bots = botsData || [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
            Leads
          </h1>
          <p className="mt-1 text-sm text-white/40">
            Contacts captured from your chatbot conversations
          </p>
        </div>
        <a
          href="/api/leads?export=1"
          className="rounded-xl border border-border-subtle px-4 py-2 text-sm font-semibold text-white/60 hover:text-white hover:border-border-default transition-all"
        >
          Export CSV
        </a>
      </div>

      <LeadsClient bots={bots} />
    </div>
  );
}
