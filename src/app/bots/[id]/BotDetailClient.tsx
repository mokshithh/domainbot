"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { BotStatus } from "@/lib/types";
import CrawlProgressBar from "@/components/CrawlProgressBar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { RefreshCw, Globe } from "lucide-react";

interface Props {
  botId: string;
  currentStatus: BotStatus;
}

export default function BotDetailClient({ botId, currentStatus }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<BotStatus>(currentStatus);
  const [crawling, setCrawling] = useState(currentStatus === "crawling");
  const [error, setError] = useState("");

  const handleComplete = useCallback(() => {
    setCrawling(false);
    router.refresh();
  }, [router]);

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

  const CrawlButton = (
    <Button
      onClick={status === "ready" ? undefined : startCrawl}
      disabled={crawling}
      variant="outline"
      size="sm"
      className="border-brand-500/30 bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 hover:border-brand-500/50 hover:text-brand-300"
    >
      {crawling ? (
        <>
          <RefreshCw size={13} className="animate-spin mr-1.5" />
          Crawling…
        </>
      ) : (
        <>
          {status === "ready" ? <RefreshCw size={13} className="mr-1.5" /> : <Globe size={13} className="mr-1.5" />}
          {status === "ready" ? "Re-crawl" : "Crawl Website"}
        </>
      )}
    </Button>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-end">
        {status === "ready" ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>{CrawlButton}</AlertDialogTrigger>
            <AlertDialogContent className="border-white/[0.08] bg-surface-2">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-white">Re-crawl this website?</AlertDialogTitle>
                <AlertDialogDescription className="text-white/50">
                  This will delete all existing indexed pages and embeddings, then crawl from scratch. Any ongoing conversations may be affected.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-white/10 bg-white/5 text-white/70 hover:bg-white/10">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={startCrawl}
                  className="bg-gradient-brand text-white hover:opacity-90"
                >
                  Yes, re-crawl
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          CrawlButton
        )}
      </div>

      {crawling && (
        <CrawlProgressBar botId={botId} onComplete={handleComplete} />
      )}

      {error && (
        <p className="text-xs text-red-400 text-right">{error}</p>
      )}
    </div>
  );
}
