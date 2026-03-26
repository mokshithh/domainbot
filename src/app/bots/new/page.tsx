"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewBotPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    allowed_domain: "",
    daily_chat_limit: "100",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function set(key: string, value: string) {
    setForm((p) => ({ ...p, [key]: value }));
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.allowed_domain.trim()) {
      setError("Bot name and domain are required.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/bots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          allowed_domain: form.allowed_domain,
          daily_chat_limit: parseInt(form.daily_chat_limit) || 100,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || "Failed to create bot.");
        return;
      }

      router.push(`/bots/${data.bot.id}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-white/35">
        <Link href="/bots" className="hover:text-white/60 transition-colors">
          Bots
        </Link>
        <span>/</span>
        <span className="text-white/60">New Bot</span>
      </div>

      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold text-white"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Create a new bot
        </h1>
        <p className="mt-2 text-sm text-white/45 leading-relaxed">
          Enter your website domain and we&apos;ll crawl it to build a chatbot knowledge
          base automatically.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-2xl border border-border-subtle bg-surface-2 p-6 shadow-card space-y-5">
          {/* Bot name */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white/70">
              Bot Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Acme Support Bot"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className="w-full rounded-xl border border-border-subtle bg-surface-3 px-4 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-brand-500/50 transition-colors"
              disabled={loading}
              required
            />
            <p className="text-xs text-white/30">
              Shown to visitors in the chat widget
            </p>
          </div>

          {/* Domain */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white/70">
              Website Domain <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-white/30">
                🌐
              </span>
              <input
                type="text"
                placeholder="example.com or https://example.com"
                value={form.allowed_domain}
                onChange={(e) => set("allowed_domain", e.target.value)}
                className="w-full rounded-xl border border-border-subtle bg-surface-3 pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-brand-500/50 transition-colors"
                disabled={loading}
                required
              />
            </div>
            <p className="text-xs text-white/30">
              We&apos;ll crawl this domain (up to 25 pages). The widget will only work on this domain.
            </p>
          </div>

          {/* Daily limit */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white/70">
              Daily Chat Limit
            </label>
            <input
              type="number"
              min="1"
              max="10000"
              value={form.daily_chat_limit}
              onChange={(e) => set("daily_chat_limit", e.target.value)}
              className="w-full rounded-xl border border-border-subtle bg-surface-3 px-4 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-brand-500/50 transition-colors"
              disabled={loading}
            />
            <p className="text-xs text-white/30">
              Max conversations per day. Resets every 24 hours.
            </p>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/8 px-4 py-3 text-sm text-red-400">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0 mt-0.5">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
            {error}
          </div>
        )}

        {/* What happens next */}
        <div className="rounded-xl border border-border-subtle bg-surface-1 p-4 space-y-2">
          <p className="text-xs font-medium text-white/50 uppercase tracking-wide">
            What happens next
          </p>
          {[
            "Your bot is created with a unique key",
            "Go to the bot page and click Crawl Website",
            "We index your content and generate embeddings",
            "Test your bot and copy the embed snippet",
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-2.5 text-sm text-white/40">
              <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-brand-500/20 text-[10px] font-bold text-brand-400 mt-0.5">
                {i + 1}
              </span>
              {step}
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <Link
            href="/bots"
            className="flex-1 rounded-xl border border-border-subtle py-2.5 text-center text-sm font-medium text-white/50 hover:text-white hover:border-border-default transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-brand py-2.5 text-sm font-semibold text-white shadow-glow-sm hover:shadow-glow transition-all disabled:opacity-60 disabled:cursor-wait"
          >
            {loading ? (
              <>
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
                  <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
                Creating…
              </>
            ) : (
              "Create Bot →"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
