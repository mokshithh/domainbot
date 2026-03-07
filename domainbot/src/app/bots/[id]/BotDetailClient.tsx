"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { BotStatus } from "@/lib/types";

interface Props {
  botId: string;
  currentStatus: BotStatus;
}

export default function BotDetailClient({ botId, currentStatus }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<BotStatus>(currentStatus);
  const [crawling, setCrawling] = useState(false);
  const [error, setError] = useState("");

  // Poll while crawling
  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/bots/${botId}`);
      const data = await res.json();
      if (data.bot?.status) {
        setStatus(data.bot.status);
        if (data.bot.status !== "crawling") {
          setCrawling(false);
          router.refresh();
        }
      }
    } catch {
      /* ignore */
    }
  }, [botId, router]);

  useEffect(() => {
    if (status !== "crawling") return;
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [status, poll]);

  async function startCrawl() {
    setCrawling(true);
    setError("");
    setStatus("crawling");

    try {
      const res = await fetch(`/api/bots/${botId}/crawl`, { method: "POST" });
      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || "Crawl failed. Please try again.");
        setStatus("error");
        setCrawling(false);
        return;
      }

      setStatus("ready");
      setCrawling(false);
      router.refresh();
    } catch {
      setError("Network error during crawl.");
      setStatus("error");
      setCrawling(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={startCrawl}
        disabled={crawling}
        className="flex items-center gap-2 rounded-xl border border-brand-500/30 bg-brand-500/10 px-4 py-2 text-sm font-semibold text-brand-400 hover:bg-brand-500/20 hover:border-brand-500/50 transition-all disabled:opacity-60 disabled:cursor-wait"
      >
        {crawling ? (
          <>
            <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
              <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
            Crawling…
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
            </svg>
            {status === "ready" ? "Re-crawl" : "Crawl Website"}
          </>
        )}
      </button>

      {error && (
        <p className="text-xs text-red-400 max-w-xs text-right">{error}</p>
      )}
    </div>
  );
}
