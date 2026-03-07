import Link from "next/link";
import { formatDomain, relativeTime } from "@/lib/utils";
import StatusBadge from "./StatusBadge";
import type { Bot } from "@/lib/types";

export default function BotCard({ bot }: { bot: Bot }) {
  return (
    <Link
      href={`/bots/${bot.id}`}
      className="group relative flex flex-col gap-4 rounded-2xl border border-border-subtle bg-surface-2 p-5 shadow-card transition-all hover:border-border-default hover:shadow-card-hover hover:-translate-y-0.5"
    >
      {/* Accent gradient on hover */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-brand opacity-0 group-hover:opacity-[0.03] transition-opacity" />

      {/* Top row */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[15px] font-semibold text-white leading-tight">
            {bot.name}
          </p>
          <p className="mt-0.5 text-xs text-white/40">{formatDomain(bot.allowed_domain)}</p>
        </div>
        <StatusBadge status={bot.status} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Pages" value={bot.total_pages.toString()} />
        <Stat
          label="Chats today"
          value={`${bot.daily_chat_count}/${bot.daily_chat_limit}`}
        />
        <Stat label="Created" value={relativeTime(bot.created_at)} />
      </div>

      {/* Key preview */}
      <div className="rounded-lg bg-surface-1 px-3 py-2 font-mono text-[11px] text-white/30 truncate">
        {bot.bot_key}
      </div>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-white/35 uppercase tracking-wide">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-white/80">{value}</p>
    </div>
  );
}
