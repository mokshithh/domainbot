"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { PLANS } from "@/lib/plans";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // Sign in immediately (email confirmation disabled by default in Supabase dev)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });

    if (signInError) {
      // Email confirmation required
      setDone(true);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  if (done) {
    return (
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 border border-emerald-500/30">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        </div>
        <h2 className="text-xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
          Check your email
        </h2>
        <p className="text-sm text-white/45">
          We sent a confirmation link to <span className="text-white">{form.email}</span>.
          Click it to activate your account.
        </p>
        <Link href="/login" className="inline-block text-sm text-brand-400 hover:text-brand-300 transition-colors">
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex justify-center mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-brand shadow-glow">
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
              <path d="M2 3a1 1 0 011-1h10a1 1 0 011 1v7a1 1 0 01-1 1H6l-4 3V3z" fill="white" />
            </svg>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
          Create an account
        </h1>
        <p className="text-sm text-white/40">Start free — no credit card needed</p>
      </div>

      {/* Plan preview pills */}
      <div className="grid grid-cols-3 gap-2">
        {(["free", "pro", "max"] as const).map((plan) => (
          <div
            key={plan}
            className={`rounded-xl border p-2.5 text-center ${
              plan === "free"
                ? "border-brand-500/40 bg-brand-500/8"
                : "border-border-subtle bg-surface-2"
            }`}
          >
            <p className="text-[11px] font-semibold text-white/60 uppercase tracking-wide">
              {PLANS[plan].label}
            </p>
            <p className="text-sm font-bold text-white mt-0.5">
              {PLANS[plan].price === 0 ? "Free" : `$${PLANS[plan].price}/mo`}
            </p>
            <p className="text-[10px] text-white/30 mt-0.5">
              {plan === "max" ? "10k" : PLANS[plan].chatsPerDay} chats/day
            </p>
          </div>
        ))}
      </div>

      {/* Form */}
      <div className="rounded-2xl border border-border-subtle bg-surface-2 p-6 shadow-card">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-white/60">Email</label>
            <input
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              required
              disabled={loading}
              className="w-full rounded-xl border border-border-subtle bg-surface-3 px-4 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-brand-500/50 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-white/60">Password</label>
            <input
              type="password"
              autoComplete="new-password"
              placeholder="Min. 8 characters"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              required
              disabled={loading}
              className="w-full rounded-xl border border-border-subtle bg-surface-3 px-4 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-brand-500/50 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-white/60">Confirm Password</label>
            <input
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={form.confirmPassword}
              onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))}
              required
              disabled={loading}
              className="w-full rounded-xl border border-border-subtle bg-surface-3 px-4 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-brand-500/50 transition-colors"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/8 px-3 py-2.5 text-sm text-red-400">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0 mt-0.5">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-brand py-2.5 text-sm font-semibold text-white shadow-glow-sm hover:shadow-glow transition-all disabled:opacity-60 disabled:cursor-wait"
          >
            {loading ? (
              <>
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
                  <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
                Creating account…
              </>
            ) : "Create free account →"}
          </button>

          <p className="text-center text-xs text-white/25">
            By signing up you agree to our terms of service.
          </p>
        </form>
      </div>

      <p className="text-center text-sm text-white/35">
        Already have an account?{" "}
        <Link href="/login" className="text-brand-400 hover:text-brand-300 transition-colors font-medium">
          Sign in
        </Link>
      </p>
    </div>
  );
}
