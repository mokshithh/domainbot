import Link from "next/link";
import { getServiceSupabase } from "@/lib/supabase";
import BotCard from "@/components/BotCard";
import type { Bot } from "@/lib/types";
import { Bot as BotIcon, CheckCircle2, FileText, MessageSquare, Plus, ArrowRight } from "lucide-react";

async function getBots(): Promise<Bot[]> {
  try {
    const db = getServiceSupabase();
    const { data } = await db
      .from("bots")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(6);
    return (data as Bot[]) || [];
  } catch {
    return [];
  }
}

const STAT_ICONS = [BotIcon, CheckCircle2, FileText, MessageSquare];
const STAT_COLORS = [
  "text-brand-400 bg-brand-400/10",
  "text-emerald-400 bg-emerald-400/10",
  "text-purple-400 bg-purple-400/10",
  "text-amber-400 bg-amber-400/10",
];

export default async function DashboardPage() {
  const bots = await getBots();

  const stats = [
    { label: "Total Bots", value: bots.length },
    { label: "Ready", value: bots.filter((b) => b.status === "ready").length },
    { label: "Pages Indexed", value: bots.reduce((a, b) => a + b.total_pages, 0) },
    { label: "Chats Today", value: bots.reduce((a, b) => a + b.daily_chat_count, 0) },
  ];

  return (
    <div className="space-y-10">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold text-white"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-white/40">Overview of your chatbots</p>
        </div>
        <Link
          href="/bots/new"
          className="flex items-center gap-2 rounded-xl bg-gradient-brand px-4 py-2 text-sm font-semibold text-white shadow-glow-sm hover:shadow-glow transition-shadow"
        >
          <Plus size={14} />
          New Bot
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s, i) => {
          const Icon = STAT_ICONS[i];
          const colorClass = STAT_COLORS[i];
          return (
            <div
              key={s.label}
              className="rounded-2xl border border-border-subtle bg-surface-2 p-5 shadow-card"
            >
              <div className={`mb-3 inline-flex h-8 w-8 items-center justify-center rounded-lg ${colorClass}`}>
                <Icon size={15} />
              </div>
              <p
                className="text-2xl font-bold text-white tabular-nums"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {s.value}
              </p>
              <p className="mt-0.5 text-xs text-white/35">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Recent bots */}
      <div>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-white">Recent Bots</h2>
          <Link
            href="/bots"
            className="flex items-center gap-1 text-sm text-brand-400 hover:text-brand-300 transition-colors"
          >
            View all <ArrowRight size={13} />
          </Link>
        </div>

        {bots.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
            {bots.map((bot) => (
              <BotCard key={bot.id} bot={bot} />
            ))}
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
        Create your first chatbot by entering a website domain. We&apos;ll crawl it and build a
        knowledge base automatically.
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
