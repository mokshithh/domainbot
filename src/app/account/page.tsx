import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServiceSupabase, getAuthUser } from "@/lib/supabase";
import { PLANS } from "@/lib/plans";
import type { Plan } from "@/lib/plans";
import PlanUpgradeClient from "./PlanUpgradeClient";

async function getAccountData(userId: string) {
  const db = getServiceSupabase();
  const [profileRes, botCountRes] = await Promise.all([
    db.from("user_profiles").select("*").eq("id", userId).single(),
    db.from("bots").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);
  return {
    profile: profileRes.data,
    botCount: botCountRes.count ?? 0,
  };
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const cookieStore = await cookies();
  const user = await getAuthUser(cookieStore);
  if (!user) redirect("/login");

  const { profile, botCount } = await getAccountData(user.id);
  const plan = (profile?.plan ?? "free") as Plan;
  const planConfig = PLANS[plan];
  const dailyCount = profile?.daily_chat_count ?? 0;
  const pct = Math.min((dailyCount / (planConfig.chatsPerDay || 1)) * 100, 100);
  const subscriptionStatus = profile?.subscription_status ?? null;
  const { success } = await searchParams;

  const statusColor =
    subscriptionStatus === "active" ? "text-emerald-400" :
    subscriptionStatus === "past_due" ? "text-amber-400" :
    subscriptionStatus === "cancelled" ? "text-red-400" :
    "text-white/40";

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
          Account
        </h1>
        <p className="mt-1 text-sm text-white/40">{user.email}</p>
      </div>

      {/* Success banner */}
      {success === "true" && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 flex items-center gap-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-400 flex-shrink-0">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <p className="text-sm text-emerald-300">Plan upgraded successfully! Welcome to {planConfig.label}.</p>
        </div>
      )}

      {/* Payment past due warning */}
      {subscriptionStatus === "past_due" && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 flex items-center gap-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-400 flex-shrink-0">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <p className="text-sm text-amber-300">
            Your payment is past due. Update your payment method to keep your plan active.
          </p>
        </div>
      )}

      {/* Current plan */}
      <div className="rounded-2xl border border-border-subtle bg-surface-2 p-6 shadow-card space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-widest">Current Plan</h2>
          <PlanBadge plan={plan} />
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Plan" value={planConfig.label} />
          <Stat
            label="Price"
            value={planConfig.price === 0 ? "Free" : `$${planConfig.price}/mo`}
          />
          <Stat
            label="Bots"
            value={`${botCount} / ${planConfig.maxBots === Infinity ? "∞" : planConfig.maxBots}`}
          />
          <Stat
            label="Chats/day"
            value={planConfig.chatsPerDay >= 10000 ? "10k" : planConfig.chatsPerDay.toString()}
          />
        </div>

        {/* Subscription status */}
        {plan !== "free" && subscriptionStatus && (
          <div className="flex items-center justify-between rounded-xl bg-surface-3 border border-border-subtle px-3 py-2">
            <span className="text-xs text-white/40">Subscription status</span>
            <span className={`text-xs font-semibold capitalize ${statusColor}`}>
              {subscriptionStatus.replace(/_/g, " ")}
            </span>
          </div>
        )}

        {/* Daily usage */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-white/40">
            <span>Chats used today</span>
            <span className="tabular-nums">
              {dailyCount} / {planConfig.chatsPerDay >= 10000 ? "10,000" : planConfig.chatsPerDay}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-400" : "bg-emerald-400"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-white/25">Resets daily at midnight UTC</p>
        </div>

        {/* Feature list */}
        <div className="grid grid-cols-2 gap-2">
          <Feature label="File uploads" enabled={planConfig.fileUploads} />
          <Feature label="Bot customization" enabled={planConfig.customization} />
          <Feature label="Custom system prompt" enabled={planConfig.customization} />
          <Feature label="Lead capture" enabled={planConfig.customization} />
          <Feature label="Advanced analytics" enabled={planConfig.customization} />
          <Feature label="Remove branding" enabled={planConfig.customization} />
        </div>
      </div>

      {/* Upgrade / plan selection */}
      {plan !== "max" && (
        <div className="rounded-2xl border border-border-subtle bg-surface-2 p-6 shadow-card space-y-4">
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-widest">
            {plan === "free" ? "Upgrade Plan" : "Change Plan"}
          </h2>
          <PlanUpgradeClient
            currentPlan={plan}
            stripeCustomerId={profile?.stripe_customer_id}
            subscriptionStatus={subscriptionStatus}
          />
        </div>
      )}

      {/* Manage billing (for paid users) */}
      {plan !== "free" && (
        <div className="rounded-2xl border border-border-subtle bg-surface-2 p-6 shadow-card space-y-4">
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-widest">Billing</h2>
          <PlanUpgradeClient
            currentPlan={plan}
            stripeCustomerId={profile?.stripe_customer_id}
            subscriptionStatus={subscriptionStatus}
          />
        </div>
      )}

      {/* Downgrade */}
      {plan !== "free" && (
        <div className="rounded-2xl border border-border-subtle bg-surface-2 p-6 shadow-card">
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-widest mb-3">Downgrade</h2>
          <p className="text-sm text-white/40 mb-4">
            Downgrading to Free will limit you to 2 bots and 50 chats/day. Existing bots exceeding
            the limit will be paused until you upgrade again.
          </p>
          <PlanUpgradeClient
            currentPlan={plan}
            showDowngrade
            stripeCustomerId={profile?.stripe_customer_id}
            subscriptionStatus={subscriptionStatus}
          />
        </div>
      )}
    </div>
  );
}

function PlanBadge({ plan }: { plan: Plan }) {
  const colors: Record<Plan, string> = {
    free: "bg-white/10 text-white/60",
    pro: "bg-brand-500/20 text-brand-300 border border-brand-500/30",
    max: "bg-purple-500/20 text-purple-300 border border-purple-500/30",
  };
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${colors[plan]}`}>
      {PLANS[plan].label}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-3 border border-border-subtle px-3 py-3">
      <p className="text-[10px] text-white/30 uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-lg font-bold text-white tabular-nums" style={{ fontFamily: "var(--font-display)" }}>
        {value}
      </p>
    </div>
  );
}

function Feature({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className={`flex items-center gap-2 text-sm ${enabled ? "text-white/70" : "text-white/25"}`}>
      {enabled ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-400 flex-shrink-0">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-white/20 flex-shrink-0">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      )}
      {label}
    </div>
  );
}
