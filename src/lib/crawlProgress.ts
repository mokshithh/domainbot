import type { CrawlProgressState } from "./types";

// In-memory progress store (works for single-instance deployments)
// For multi-instance production, use a Supabase column update instead
const progressMap = new Map<string, CrawlProgressState>();

export function setProgress(botId: string, state: CrawlProgressState): void {
  progressMap.set(botId, state);
}

export function getProgress(botId: string): CrawlProgressState | undefined {
  return progressMap.get(botId);
}

export function clearProgress(botId: string): void {
  progressMap.delete(botId);
}
