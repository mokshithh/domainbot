import { Suspense } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getServiceSupabase, getAuthUser } from "@/lib/supabase";
import { PLANS } from "@/lib/plans";
import type { Plan } from "@/lib/plans";
import Link from "next/link";

async function getActivePlan(userId: string) {
  const db = getServiceSupabase();
  const { data } = await db
    .from("user_profiles")
    .select("plan, subscription_status")
    .eq("id", userId)
    .single();
  return data;
}

async function BillingSuccessContent({ sessionId }: { sessionId: string | null }) {
  const cookieStore = await cookies();
  const user = await getAuthUser(cookieStore);
  if (!user) redirect("/login");

  // If Stripe is configured and we have a session ID, wait a moment for webhook to land
  // (the page itself will show the correct plan from DB)
  let profile = await getActivePlan(user.id);

  // If the plan is still 'free' and we have a session_id, the webhook may be in flight.
  // We show a "processing" state and the user can refresh or go to account.
  const isProcessing = profile?.plan === "free" && sessionId && sessionId !== "demo";

  const plan = (profile?.plan ?? "free") as Plan;
  const planConfig = PLANS[plan];

  const planFeatures: Record<Plan, string[]> = {
    free: ["50 chats/day", "2 bots", "Website crawl"],
    pro: [
      "500 chats/day",
      "10 bots",
      "File uploads (PDF, DOCX, TXT)",
      "Website crawl",
    ],
    max: [
      "10,000 chats/day",
      "Unlimited bots",
      "File uploads",
      "Full bot customization",
      "Custom system prompts",
      "Lead capture forms",
      "Advanced analytics",
      "Remove DomainBot branding",
    ],
  };

  if (isProcessing) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/15 border border-amber-500/30 mx-auto">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-400 animate-spin">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Processing your subscription…</h1>
            <p className="mt-2 text-sm text-white/50">
              Payment received. Your plan is being activated — this takes a few seconds.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/account"
              className="rounded-xl bg-gradient-brand px-6 py-3 text-sm font-semibold text-white shadow-glow-sm hover:shadow-glow transition-all"
            >
              Go to Account
            </Link>
            <Link
              href="/dashboard"
              className="rounded-xl border border-border-subtle px-6 py-3 text-sm font-semibold text-white/60 hover:text-white hover:border-border-default transition-all"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        {/* Success icon */}
        <div className="text-center space-y-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/30 mx-auto">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-400">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">
              {plan === "free" ? "You're all set!" : `Welcome to ${planConfig.label}!`}
            </h1>
            <p className="mt-2 text-sm text-white/50">
              {plan === "free"
                ? "Your account is ready to use."
                : `Your ${planConfig.label} plan is now active. Here's what you unlocked:`}
            </p>
          </div>
        </div>

        {/* Plan card */}
        <div className={`rounded-2xl border p-6 space-y-4 ${
          plan === "max"
            ? "border-purple-500/30 bg-purple-500/8"
            : plan === "pro"
            ? "border-brand-500/30 bg-brand-500/8"
            : "border-border-subtle bg-surface-2"
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-white">{planConfig.label} Plan</span>
            <span className="text-sm font-bold text-white">
              {planConfig.price === 0 ? "Free" : `$${planConfig.price}/mo`}
            </span>
          </div>
          <ul className="space-y-2">
            {planFeatures[plan].map((feat) => (
              <li key={feat} className="flex items-center gap-2 text-sm text-white/70">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-400 flex-shrink-0">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {feat}
              </li>
            ))}
          </ul>
        </div>

        {/* Next steps */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-white/30 uppercase tracking-widest text-center">Next steps</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Link
              href="/bots/new"
              className="rounded-xl bg-gradient-brand px-4 py-3 text-sm font-semibold text-white shadow-glow-sm hover:shadow-glow transition-all text-center"
            >
              Create a Bot
            </Link>
            <Link
              href="/dashboard"
              className="rounded-xl border border-border-subtle px-4 py-3 text-sm font-semibold text-white/60 hover:text-white hover:border-border-default transition-all text-center"
            >
              Go to Dashboard
            </Link>
          </div>
          <Link
            href="/account"
            className="block text-center text-xs text-white/30 hover:text-white/50 transition-colors"
          >
            View account & billing →
          </Link>
        </div>
      </div>
    </div>
  );
}

export default async function BillingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" />
      </div>
    }>
      <BillingSuccessContent sessionId={session_id ?? null} />
    </Suspense>
  );
}
