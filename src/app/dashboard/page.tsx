import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServiceSupabase, getAuthUser } from "@/lib/supabase";
import { PLANS } from "@/lib/plans";
import type { Plan } from "@/lib/plans";
import BotCard from "@/components/BotCard";
import type { Bot } from "@/lib/types";
import { Bot as BotIcon, CheckCircle2, FileText, MessageSquare, Plus, ArrowRight, Users, Lock } from "lucide-react";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const user = await getAuthUser(cookieStore);
  if (!user) redirect("/login");

  const db = getServiceSupabase();
  const [{ data: profile }, { data: botsData }, { count: leadCount }] = await Promise.all([
    db.from("user_profiles").select("plan, daily_chat_count, subscription_status").eq("id", user.id).single(),
    db.from("bots").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(6),
    db.from("leads").select("id", { count: "exact", head: true }).eq("user_id", user.id),
  ]);

  const plan = (profile?.plan ?? "free") as Plan;
  const planConfig = PLANS[plan];
  const bots = (botsData as Bot[]) || [];
  const dailyCount = profile?.daily_chat_count ?? 0;
  const usagePct = Math.min((dailyCount / (planConfig.chatsPerDay || 1)) * 100, 100);

  const stats = [
    { label: "Total Bots", value: bots.length, icon: BotIcon, color: "text-brand-400 bg-brand-400/10" },
    { label: "Ready", value: bots.filter((b) => b.status === "ready").length, icon: CheckCircle2, color: "text-emerald-400 bg-emerald-400/10" },
    { label: "Pages Indexed", value: bots.reduce((a, b) => a + (b.total_pages ?? 0), 0), icon: FileText, color: "text-purple-400 bg-purple-400/10" },
    { label: "Chats Today", value: dailyCount, icon: MessageSquare, color: "text-amber-400 bg-amber-400/10" },
  ];

  const isAtBotLimit = !PLANS[plan].maxBots || (planConfig.maxBots !== Infinity && bots.length >= planConfig.maxBots);

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-white/40">
            {planConfig.label} plan
            {profile?.subscription_status === "past_due" && (
              <span className="ml-2 text-amber-400">⚠ Payment past due</span>
            )}
          </p>
        </div>
        {isAtBotLimit ? (
          <Link
            href="/account"
            className="flex items-center gap-2 rounded-xl border border-border-subtle px-4 py-2 text-sm font-semibold text-white/50 hover:text-white hover:border-border-default transition-all"
          >
            <Lock size={14} />
            Bot limit reached · Upgrade
          </Link>
        ) : (
          <Link
            href="/bots/new"
            className="flex items-center gap-2 rounded-xl bg-gradient-brand px-4 py-2 text-sm font-semibold text-white shadow-glow-sm hover:shadow-glow transition-shadow"
          >
            <Plus size={14} />
            New Bot
          </Link>
        )}
      </div>

      {/* Daily usage bar */}
      <div className="rounded-2xl border border-border-subtle bg-surface-2 p-5 shadow-card">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-medium text-white">Daily Chat Usage</p>
            <p className="text-xs text-white/35 mt-0.5">
              {planConfig.label} plan · {planConfig.chatsPerDay >= 10000 ? "10,000" : planConfig.chatsPerDay} chats/day
            </p>
          </div>
          <div className="text-right">
            <p className={`text-lg font-bold tabular-nums ${
              usagePct >= 90 ? "text-red-400" : usagePct >= 70 ? "text-amber-400" : "text-white"
            }`} style={{ fontFamily: "var(--font-display)" }}>
              {dailyCount}
            </p>
            <p className="text-xs text-white/30">used today</p>
          </div>
        </div>
        <div className="h-2 w-full rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              usagePct >= 90 ? "bg-red-500" : usagePct >= 70 ? "bg-amber-400" : "bg-emerald-400"
            }`}
            style={{ width: `${usagePct}%` }}
          />
        </div>
        <div className="flex justify-between mt-2">
          <p className="text-xs text-white/25">{Math.round(usagePct)}% used</p>
          {plan !== "max" && usagePct >= 70 && (
            <Link href="/account" className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
              Upgrade for more →
            </Link>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-2xl border border-border-subtle bg-surface-2 p-5 shadow-card">
              <div className={`mb-3 inline-flex h-8 w-8 items-center justify-center rounded-lg ${s.color}`}>
                <Icon size={15} />
              </div>
              <p className="text-2xl font-bold text-white tabular-nums" style={{ fontFamily: "var(--font-display)" }}>
                {s.value}
              </p>
              <p className="mt-0.5 text-xs text-white/35">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Plan upgrade CTA for free users */}
      {plan === "free" && (
        <div className="rounded-2xl border border-brand-500/20 bg-brand-500/[0.06] p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">Unlock more with Pro</p>
            <p className="text-xs text-white/40 mt-1">
              500 chats/day, 10 bots, file uploads (PDF, DOCX, TXT), and more.
            </p>
          </div>
          <Link
            href="/account"
            className="flex-shrink-0 rounded-xl bg-gradient-brand px-5 py-2.5 text-sm font-semibold text-white shadow-glow-sm hover:shadow-glow transition-all text-center"
          >
            Upgrade to Pro →
          </Link>
        </div>
      )}

      {/* Leads quick view (Pro/Max) */}
      {(plan === "pro" || plan === "max") && (leadCount ?? 0) > 0 && (
        <div className="rounded-2xl border border-border-subtle bg-surface-2 p-5 shadow-card flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-400/10">
              <Users size={15} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{leadCount} Leads Captured</p>
              <p className="text-xs text-white/40">from lead capture forms</p>
            </div>
          </div>
          <a
            href="/api/leads?export=1"
            className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
          >
            Export CSV →
          </a>
        </div>
      )}

      {/* Recent bots */}
      <div>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-white">Recent Bots</h2>
          <Link href="/bots" className="flex items-center gap-1 text-sm text-brand-400 hover:text-brand-300 transition-colors">
            View all <ArrowRight size={13} />
          </Link>
        </div>

        {bots.length === 0 ? <EmptyState /> : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
            {bots.map((bot) => <BotCard key={bot.id} bot={bot} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border-subtle bg-surface-1 py-20 px-6 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-brand-500/20 bg-brand-500/8">
        <BotIcon size={24} className="text-brand-400" />
      </div>
      <h3 className="text-[15px] font-semibold text-white">No bots yet</h3>
      <p className="mt-2 max-w-sm text-sm text-white/40 leading-relaxed">
        Create your first chatbot by entering a website domain.
      </p>
      <Link
        href="/bots/new"
        className="mt-6 flex items-center gap-2 rounded-xl bg-gradient-brand px-5 py-2.5 text-sm font-semibold text-white shadow-glow-sm hover:shadow-glow transition-shadow"
      >
        <Plus size={14} />
        Create your first bot
      </Link>
    </div>
  );
}
