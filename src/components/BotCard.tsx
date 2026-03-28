import Link from "next/link";
import { formatDomain, relativeTime } from "@/lib/utils";
import StatusBadge from "./StatusBadge";
import type { Bot } from "@/lib/types";
import { FileText, MessageSquare, Clock, ArrowRight } from "lucide-react";

export default function BotCard({ bot }: { bot: Bot }) {
  const maskedKey = bot.bot_key
    ? `${bot.bot_key.slice(0, 8)}${"•".repeat(12)}${bot.bot_key.slice(-4)}`
    : "—";

  return (
    <Link
      href={`/bots/${bot.id}`}
      className="group relative flex flex-col gap-4 rounded-2xl border border-border-subtle bg-surface-2 p-5 shadow-card transition-all hover:border-border-default hover:shadow-card-hover hover:-translate-y-0.5"
    >
      {/* Hover glow */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-brand opacity-0 group-hover:opacity-[0.03] transition-opacity" />

      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-white leading-tight">
            {bot.name}
          </p>
          <p className="mt-0.5 text-xs text-white/35 truncate">{formatDomain(bot.allowed_domain)}</p>
        </div>
        <StatusBadge status={bot.status} />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        <StatChip icon={FileText} label="Pages" value={bot.total_pages.toString()} />
        <StatChip
          icon={MessageSquare}
          label="Today"
          value={bot.daily_chat_count.toString()}
        />
        <StatChip icon={Clock} label="Created" value={relativeTime(bot.created_at)} />
      </div>

      {/* Masked key + arrow */}
      <div className="flex items-center justify-between">
        <div className="rounded-lg bg-surface-1 border border-border-subtle px-2.5 py-1.5 font-mono text-[11px] text-white/25 truncate max-w-[180px]">
          {maskedKey}
        </div>
        <ArrowRight
          size={14}
          className="text-white/20 group-hover:text-brand-400 group-hover:translate-x-0.5 transition-all shrink-0"
        />
      </div>
    </Link>
  );
}

function StatChip({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-surface-1 border border-border-subtle px-2.5 py-2">
      <div className="flex items-center gap-1 mb-0.5">
        <Icon size={10} className="text-white/20" />
        <p className="text-[10px] text-white/30 uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-xs font-semibold text-white/70 truncate">{value}</p>
    </div>
  );
}
