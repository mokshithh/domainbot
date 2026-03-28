"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PLANS } from "@/lib/plans";
import type { Plan } from "@/lib/plans";
import FileUploadTab from "@/components/FileUploadTab";
import { Lock, Upload, Globe, ArrowRight, CheckCircle2 } from "lucide-react";

interface Props {
  plan: Plan;
}

type Step = "details" | "files";

export default function NewBotClient({ plan }: Props) {
  const router = useRouter();
  const planConfig = PLANS[plan];

  // Step state
  const [step, setStep] = useState<Step>("details");

  // Step 1: bot details
  const [form, setForm] = useState({ name: "", allowed_domain: "" });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  // Step 2: created bot (for file upload)
  const [createdBotId, setCreatedBotId] = useState<string | null>(null);

  function set(key: string, value: string) {
    setForm((p) => ({ ...p, [key]: value }));
    setError("");
  }

  async function handleCreateBot(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.allowed_domain.trim()) {
      setError("Bot name and domain are required.");
      return;
    }

    setCreating(true);
    setError("");

    try {
      const res = await fetch("/api/bots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, allowed_domain: form.allowed_domain }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || "Failed to create bot.");
        return;
      }

      setCreatedBotId(data.bot.id);
      // Pro/Max: show file upload step. Free: go straight to bot page.
      if (planConfig.fileUploads) {
        setStep("files");
      } else {
        router.push(`/bots/${data.bot.id}`);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  function handleFinish() {
    router.push(`/bots/${createdBotId}`);
  }

  // ── Step indicators ──────────────────────────────────────────────────────
  const steps = planConfig.fileUploads
    ? [
        { id: "details", label: "Bot Details" },
        { id: "files", label: "Knowledge Files" },
      ]
    : [{ id: "details", label: "Bot Details" }];

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

      <div>
        <h1
          className="text-2xl font-bold text-white"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Create a new bot
        </h1>
        <p className="mt-2 text-sm text-white/45 leading-relaxed">
          {step === "details"
            ? "Enter your website domain and we'll crawl it to build a chatbot knowledge base."
            : "Upload documents to give your bot additional knowledge beyond the crawled website."}
        </p>
      </div>

      {/* Step progress — only show when there are multiple steps */}
      {steps.length > 1 && (
        <div className="flex items-center gap-3">
          {steps.map((s, i) => {
            const isActive = s.id === step;
            const isDone =
              s.id === "details" && step === "files";
            return (
              <div key={s.id} className="flex items-center gap-2">
                {i > 0 && (
                  <div
                    className={`h-px w-8 transition-colors ${
                      isDone || step === "files" ? "bg-brand-500/50" : "bg-white/10"
                    }`}
                  />
                )}
                <div className="flex items-center gap-2">
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold transition-all ${
                      isDone
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : isActive
                        ? "bg-brand-500/20 text-brand-400 border border-brand-500/40"
                        : "bg-white/[0.06] text-white/30 border border-white/10"
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle2 size={12} />
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span
                    className={`text-xs font-medium transition-colors ${
                      isActive ? "text-white" : isDone ? "text-emerald-400" : "text-white/30"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Step 1: Bot Details ── */}
      {step === "details" && (
        <form onSubmit={handleCreateBot} className="space-y-5">
          <div className="rounded-2xl border border-border-subtle bg-surface-2 p-6 shadow-card space-y-5">
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
                disabled={creating}
                required
              />
              <p className="text-xs text-white/30">Shown to visitors in the chat widget</p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-white/70">
                Website Domain <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Globe size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="text"
                  placeholder="example.com or https://example.com"
                  value={form.allowed_domain}
                  onChange={(e) => set("allowed_domain", e.target.value)}
                  className="w-full rounded-xl border border-border-subtle bg-surface-3 pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-brand-500/50 transition-colors"
                  disabled={creating}
                  required
                />
              </div>
              <p className="text-xs text-white/30">
                We'll crawl this domain (up to{" "}
                {planConfig.maxPages} pages on {planConfig.label} plan).
              </p>
            </div>
          </div>

          {/* File upload teaser for Free users */}
          {!planConfig.fileUploads && (
            <div className="rounded-2xl border border-border-subtle bg-surface-1 p-5 flex items-start gap-4">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-surface-3 border border-border-subtle">
                <Lock size={14} className="text-white/25" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white/60">
                  File Uploads — Pro Feature
                </p>
                <p className="text-xs text-white/35 mt-1">
                  Upload PDFs, DOCX, and TXT files as additional knowledge.{" "}
                  <Link href="/account" className="text-brand-400 hover:text-brand-300 transition-colors">
                    Upgrade to Pro →
                  </Link>
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/8 px-4 py-3 text-sm text-red-400">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="flex-shrink-0 mt-0.5"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
              {error}
            </div>
          )}

          <div className="rounded-xl border border-border-subtle bg-surface-1 p-4 space-y-2">
            <p className="text-xs font-medium text-white/50 uppercase tracking-wide">
              What happens next
            </p>
            {(planConfig.fileUploads
              ? [
                  "Bot created with a unique key",
                  "Upload knowledge files (PDF, DOCX, TXT)",
                  "Go to the bot page and click Crawl Website",
                  "Test your bot and copy the embed snippet",
                ]
              : [
                  "Your bot is created with a unique key",
                  "Go to the bot page and click Crawl Website",
                  "We index your content and generate embeddings",
                  "Test your bot and copy the embed snippet",
                ]
            ).map((s, i) => (
              <div key={i} className="flex items-start gap-2.5 text-sm text-white/40">
                <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-brand-500/20 text-[10px] font-bold text-brand-400 mt-0.5">
                  {i + 1}
                </span>
                {s}
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
              disabled={creating}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-brand py-2.5 text-sm font-semibold text-white shadow-glow-sm hover:shadow-glow transition-all disabled:opacity-60 disabled:cursor-wait"
            >
              {creating ? (
                <>
                  <svg
                    className="animate-spin"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeOpacity="0.3"
                    />
                    <path
                      d="M12 2a10 10 0 0110 10"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </svg>
                  Creating…
                </>
              ) : planConfig.fileUploads ? (
                <>
                  Next: Upload Files
                  <ArrowRight size={14} />
                </>
              ) : (
                "Create Bot →"
              )}
            </button>
          </div>
        </form>
      )}

      {/* ── Step 2: Knowledge Files (Pro/Max only) ── */}
      {step === "files" && createdBotId && (
        <div className="space-y-5">
          {/* Header card */}
          <div className="rounded-2xl border border-border-subtle bg-surface-2 p-5 flex items-start gap-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-brand-500/10 border border-brand-500/20">
              <Upload size={18} className="text-brand-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                Upload Knowledge Files{" "}
                <span className="text-xs font-normal text-white/40 ml-1">optional</span>
              </p>
              <p className="text-xs text-white/40 mt-1 leading-relaxed">
                PDFs, DOCX, and TXT files become part of your bot's knowledge base alongside the crawled website content.
                You can also add or remove files later from the bot dashboard.
              </p>
            </div>
          </div>

          {/* Reuse the same FileUploadTab used on the bot detail page */}
          <FileUploadTab botId={createdBotId} plan={plan} />

          {/* Navigation */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleFinish}
              className="flex-1 rounded-xl border border-border-subtle py-2.5 text-sm font-medium text-white/50 hover:text-white hover:border-border-default transition-colors"
            >
              Skip for now
            </button>
            <button
              onClick={handleFinish}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-brand py-2.5 text-sm font-semibold text-white shadow-glow-sm hover:shadow-glow transition-all"
            >
              Go to Bot Dashboard
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
