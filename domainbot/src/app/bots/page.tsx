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
      .order("created_at", { ascending: false });
    return (data as Bot[]) || [];
  } catch {
    return [];
  }
}

export default async function BotsPage() {
  const bots = await getBots();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold text-white"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Your Bots
          </h1>
          <p className="mt-1 text-sm text-white/40">
            {bots.length} bot{bots.length !== 1 ? "s" : ""} created
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

      {bots.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border-subtle bg-surface-1 py-24 text-center">
          <div className="mb-4 text-5xl">🤖</div>
          <h3 className="text-lg font-semibold text-white">No bots yet</h3>
          <p className="mt-2 max-w-xs text-sm text-white/40 leading-relaxed">
            Your bots will appear here. Create one by entering a website domain.
          </p>
          <Link
            href="/bots/new"
            className="mt-6 rounded-xl bg-gradient-brand px-5 py-2.5 text-sm font-semibold text-white shadow-glow-sm hover:shadow-glow transition-shadow"
          >
            Create first bot
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
          {bots.map((bot) => (
            <BotCard key={bot.id} bot={bot} />
          ))}
        </div>
      )}
    </div>
  );
}
