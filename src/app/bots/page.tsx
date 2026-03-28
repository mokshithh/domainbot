import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getServiceSupabase, getAuthUser } from "@/lib/supabase";
import BotCard from "@/components/BotCard";
import type { Bot } from "@/lib/types";
import { Bot as BotIcon, Plus } from "lucide-react";

async function getBots(userId: string): Promise<Bot[]> {
  try {
    const db = getServiceSupabase();
    const { data } = await db
      .from("bots")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    return (data as Bot[]) || [];
  } catch {
    return [];
  }
}

export default async function BotsPage() {
  const cookieStore = await cookies();
  const user = await getAuthUser(cookieStore);
  if (!user) redirect("/login");

  const bots = await getBots(user.id);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
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
          <Plus size={14} />
          New Bot
        </Link>
      </div>

      {bots.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border-subtle bg-surface-1 py-24 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border-subtle bg-surface-2">
            <BotIcon size={24} className="text-white/20" />
          </div>
          <h3 className="text-[15px] font-semibold text-white">No bots yet</h3>
          <p className="mt-2 max-w-xs text-sm text-white/40 leading-relaxed">
            Your bots will appear here. Create one by entering a website domain.
          </p>
          <Link
            href="/bots/new"
            className="mt-6 flex items-center gap-2 rounded-xl bg-gradient-brand px-5 py-2.5 text-sm font-semibold text-white shadow-glow-sm hover:shadow-glow transition-shadow"
          >
            <Plus size={14} />
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
