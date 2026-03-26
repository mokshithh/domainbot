"use client";

import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { CrawlProgressState } from "@/lib/types";

interface Props {
  botId: string;
  onComplete?: () => void;
}

export default function CrawlProgressBar({ botId, onComplete }: Props) {
  const [progress, setProgress] = useState<CrawlProgressState>({
    pagesFound: 0,
    pagesCrawled: 0,
    pageFailed: 0,
    currentUrl: "Initializing...",
    status: "crawling",
  });

  useEffect(() => {
    const es = new EventSource(`/api/bots/${botId}/crawl/progress`);

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as CrawlProgressState;
        setProgress(data);
        if (data.status === "done" || data.status === "error") {
          es.close();
          onComplete?.();
        }
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      es.close();
    };

    return () => es.close();
  }, [botId, onComplete]);

  const pct =
    progress.pagesFound > 0
      ? Math.round((progress.pagesCrawled / Math.max(progress.pagesFound, 1)) * 100)
      : progress.status === "crawling" ? 5 : 100;

  return (
    <div className="rounded-xl border border-white/[0.08] bg-surface-2 p-4 space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-white">
          {progress.status === "crawling" ? "Crawling your website..." : progress.status === "done" ? "Crawl complete!" : "Crawl failed"}
        </span>
        <span className="text-white/40">{pct}%</span>
      </div>

      <Progress value={pct} className="h-1.5" />

      <div className="flex items-center justify-between text-xs text-white/40">
        <div className="flex items-center gap-3">
          <span>{progress.pagesCrawled} indexed</span>
          {progress.pageFailed > 0 && (
            <span className="text-amber-400/70">{progress.pageFailed} failed</span>
          )}
        </div>
        {progress.pagesFound > 0 && (
          <span>{progress.pagesFound} found</span>
        )}
      </div>

      {progress.currentUrl && progress.status === "crawling" && (
        <p className={cn("truncate text-xs text-white/30 font-mono")}>
          {progress.currentUrl}
        </p>
      )}
    </div>
  );
}
