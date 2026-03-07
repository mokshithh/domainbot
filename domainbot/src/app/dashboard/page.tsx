import Link from "next/link";
import { getServiceSupabase } from "@/lib/supabase";
import BotCard from "@/components/BotCard";
import type { Bot } from "@/lib/types";

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

export default async function DashboardPage() {
  const bots = await getBots();

  const stats = {
    total: bots.length,
    ready: bots.filter((b) => b.status === "ready").length,
    totalPages: bots.reduce((a, b) => a + b.total_pages, 0),
    totalChats: bots.reduce((a, b) => a + b.daily_chat_count, 0),
  };

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
          <p className="mt-1 text-sm text-white/40">
            Overview of your chatbots
          </p>
        </div>
        <Link
          href="/bots/new"
          className="flex items-center gap-2 rounded-xl bg-gradient-brand px-4 py-2 text-sm font-semibold text-white shadow-glow-sm hover:shadow-glow transition-shadow"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
          </svg>
          New Bot
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Total Bots", value: stats.total, icon: "🤖" },
          { label: "Ready Bots", value: stats.ready, icon: "✅" },
          { label: "Pages Indexed", value: stats.totalPages, icon: "📄" },
          { label: "Chats Today", value: stats.totalChats, icon: "💬" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-border-subtle bg-surface-2 p-5 shadow-card"
          >
            <div className="mb-3 text-xl">{s.icon}</div>
            <p className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
              {s.value}
            </p>
            <p className="mt-0.5 text-xs text-white/40">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Recent bots */}
      <div>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Recent Bots</h2>
          <Link href="/bots" className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
            View all →
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
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-brand/10 border border-brand-500/20">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-brand-400">
          <path d="M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2z" fill="currentColor" fillOpacity="0.3" />
          <path d="M12 8v4m0 4h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-white">No bots yet</h3>
      <p className="mt-2 max-w-sm text-sm text-white/40 leading-relaxed">
        Create your first chatbot by entering a website domain. We&apos;ll crawl it and
        build a knowledge base automatically.
      </p>
      <Link
        href="/bots/new"
        className="mt-6 flex items-center gap-2 rounded-xl bg-gradient-brand px-5 py-2.5 text-sm font-semibold text-white shadow-glow-sm hover:shadow-glow transition-shadow"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
        </svg>
        Create your first bot
      </Link>
    </div>
  );
}
