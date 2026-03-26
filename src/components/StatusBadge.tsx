import { cn } from "@/lib/utils";
import type { BotStatus } from "@/lib/types";

interface StatusBadgeProps {
  status: BotStatus;
  className?: string;
}

const STATUS_CONFIG: Record<
  BotStatus,
  { label: string; dot: string; bg: string; text: string }
> = {
  pending: {
    label: "Pending",
    dot: "bg-yellow-400",
    bg: "bg-yellow-400/10",
    text: "text-yellow-400",
  },
  crawling: {
    label: "Crawling…",
    dot: "bg-brand-400 animate-pulse",
    bg: "bg-brand-400/10",
    text: "text-brand-400",
  },
  ready: {
    label: "Ready",
    dot: "bg-emerald-400",
    bg: "bg-emerald-400/10",
    text: "text-emerald-400",
  },
  error: {
    label: "Error",
    dot: "bg-red-400",
    bg: "bg-red-400/10",
    text: "text-red-400",
  },
};

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        cfg.bg,
        cfg.text,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
      {cfg.label}
    </span>
  );
}
