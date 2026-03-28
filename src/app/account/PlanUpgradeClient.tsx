"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PLANS } from "@/lib/plans";
import type { Plan } from "@/lib/plans";

interface Props {
  currentPlan: Plan;
  showDowngrade?: boolean;
  stripeCustomerId?: string | null;
  subscriptionStatus?: string | null;
}

export default function PlanUpgradeClient({
  currentPlan,
  showDowngrade,
  stripeCustomerId,
  subscriptionStatus,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<Plan | "portal" | null>(null);
  const [error, setError] = useState("");

  const isStripeActive = !!stripeCustomerId && currentPlan !== "free";

  const upgradePlans: Plan[] = showDowngrade
    ? currentPlan === "max" ? ["pro", "free"] : ["free"]
    : currentPlan === "free" ? ["pro", "max"] : ["max"];

  async function openBillingPortal() {
    setLoading("portal");
    setError("");
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error(data.error || "Could not open billing portal");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(null);
    }
  }

  async function handleUpgrade(plan: Plan) {
    setLoading(plan);
    setError("");
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");

      // Stripe checkout URL → redirect
      if (data.url) {
        window.location.href = data.url;
        return;
      }

      // Demo/dev mode: direct plan change
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update plan");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-400">{error}</p>}

      {/* Billing portal for active paid subscribers */}
      {isStripeActive && !showDowngrade && (
        <div className="rounded-xl border border-border-subtle bg-surface-3 p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white">Manage Billing</p>
            <p className="text-xs text-white/40 mt-0.5">
              Update payment method, view invoices, change plan
              {subscriptionStatus === "past_due" && (
                <span className="ml-2 text-amber-400 font-medium">⚠ Payment past due</span>
              )}
            </p>
          </div>
          <button
            onClick={openBillingPortal}
            disabled={loading !== null}
            className="rounded-lg border border-border-subtle px-4 py-2 text-xs font-semibold text-white/70 hover:text-white hover:border-border-default transition-all disabled:opacity-50"
          >
            {loading === "portal" ? (
              <span className="flex items-center gap-1.5">
                <svg className="animate-spin" width="11" height="11" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
                  <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
                Opening…
              </span>
            ) : "Stripe Portal →"}
          </button>
        </div>
      )}

      {/* Plan selection cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        {upgradePlans.map((plan) => {
          const config = PLANS[plan];
          const isDowngrade = config.price < PLANS[currentPlan].price;
          return (
            <div
              key={plan}
              className={`rounded-xl border p-4 space-y-3 ${
                plan === "max"
                  ? "border-purple-500/30 bg-purple-500/[0.08]"
                  : isDowngrade
                  ? "border-border-subtle bg-surface-3"
                  : "border-brand-500/30 bg-brand-500/[0.08]"
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">{config.label}</p>
                  <p className="text-sm font-bold text-white">
                    {config.price === 0 ? "Free" : `$${config.price}/mo`}
                  </p>
                </div>
                <p className="text-xs text-white/40 mt-1">{config.description}</p>
              </div>

              <ul className="space-y-1">
                {[
                  `${config.chatsPerDay >= 10000 ? "10,000" : config.chatsPerDay} chats/day`,
                  `${config.maxBots === Infinity ? "Unlimited" : config.maxBots} bots`,
                  config.fileUploads ? "File uploads (PDF, DOCX, TXT)" : "Web crawl only",
                  config.customization ? "Full customization + lead capture" : null,
                ]
                  .filter(Boolean)
                  .map((feat) => (
                    <li key={feat} className="flex items-center gap-2 text-xs text-white/50">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-400 flex-shrink-0">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      {feat}
                    </li>
                  ))}
              </ul>

              <button
                onClick={() => handleUpgrade(plan)}
                disabled={loading !== null}
                className={`w-full rounded-lg py-2 text-xs font-semibold transition-all disabled:opacity-60 disabled:cursor-wait ${
                  isDowngrade
                    ? "border border-border-subtle text-white/50 hover:text-white hover:border-border-default"
                    : "bg-gradient-brand text-white shadow-glow-sm hover:shadow-glow"
                }`}
              >
                {loading === plan ? (
                  <span className="flex items-center justify-center gap-1.5">
                    <svg className="animate-spin" width="11" height="11" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
                      <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    {isDowngrade ? "Downgrading…" : "Redirecting to checkout…"}
                  </span>
                ) : isDowngrade ? `Downgrade to ${config.label}` : `Upgrade to ${config.label} →`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
