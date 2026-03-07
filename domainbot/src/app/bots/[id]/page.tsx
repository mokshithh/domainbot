import { notFound } from "next/navigation";
import { getServiceSupabase } from "@/lib/supabase";
import StatusBadge from "@/components/StatusBadge";
import ChatPanel from "@/components/ChatPanel";
import EmbedSnippet from "@/components/EmbedSnippet";
import BotDetailClient from "./BotDetailClient";
import { formatDate, formatDomain } from "@/lib/utils";
import type { Bot, Page } from "@/lib/types";

interface Props {
  params: Promise<{ id: string }>;
}

async function getBotData(id: string): Promise<{ bot: Bot; pages: Page[] } | null> {
  try {
    const db = getServiceSupabase();
    const { data: bot, error } = await db
      .from("bots")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !bot) return null;

    const { data: pages } = await db
      .from("pages")
      .select("id, bot_id, url, title, content_hash, created_at")
      .eq("bot_id", id)
      .order("created_at", { ascending: true });

    return { bot: bot as Bot, pages: (pages as Page[]) || [] };
  } catch {
    return null;
  }
}

export default async function BotDetailPage({ params }: Props) {
  const { id } = await params;
  const result = await getBotData(id);

  if (!result) notFound();

  const { bot, pages } = result;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1
              className="text-2xl font-bold text-white"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {bot.name}
            </h1>
            <StatusBadge status={bot.status} />
          </div>
          <p className="mt-1 text-sm text-white/40">
            {formatDomain(bot.allowed_domain)} · Created {formatDate(bot.created_at)}
          </p>
        </div>

        {/* Crawl button (client side) */}
        <BotDetailClient botId={bot.id} currentStatus={bot.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-5 lg:col-span-1">
          {/* Bot info card */}
          <div className="rounded-2xl border border-border-subtle bg-surface-2 p-5 shadow-card space-y-4">
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wide">
              Bot Info
            </h2>

            <InfoRow label="Status">
              <StatusBadge status={bot.status} />
            </InfoRow>
            <InfoRow label="Domain">
              <a
                href={
                  bot.allowed_domain.startsWith("http")
                    ? bot.allowed_domain
                    : `https://${bot.allowed_domain}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-brand-400 hover:text-brand-300 transition-colors"
              >
                {formatDomain(bot.allowed_domain)}
              </a>
            </InfoRow>
            <InfoRow label="Pages Indexed">
              <span className="text-sm font-semibold text-white">{bot.total_pages}</span>
            </InfoRow>
            <InfoRow label="Chats Today">
              <span className="text-sm font-semibold text-white">
                {bot.daily_chat_count} / {bot.daily_chat_limit}
              </span>
            </InfoRow>
          </div>

          {/* Bot key */}
          <div className="rounded-2xl border border-border-subtle bg-surface-2 p-5 shadow-card space-y-3">
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wide">
              Bot Key
            </h2>
            <div className="rounded-xl bg-surface-1 px-3 py-2.5 font-mono text-xs text-white/50 break-all select-all border border-border-subtle">
              {bot.bot_key}
            </div>
            <p className="text-xs text-white/30">
              Keep this key private. Used to authenticate chat requests.
            </p>
          </div>

          {/* Pages crawled */}
          <div className="rounded-2xl border border-border-subtle bg-surface-2 p-5 shadow-card space-y-3">
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wide">
              Indexed Pages ({pages.length})
            </h2>
            {pages.length === 0 ? (
              <p className="text-xs text-white/30 italic">
                No pages yet. Click &ldquo;Crawl Website&rdquo; to start.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {pages.map((page) => (
                  <a
                    key={page.id}
                    href={page.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-2 rounded-lg px-2 py-1.5 text-xs text-white/50 hover:text-white/80 hover:bg-surface-3 transition-colors group"
                  >
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="flex-shrink-0 mt-0.5 text-white/25 group-hover:text-brand-400"
                    >
                      <path d="M19 19H5V5h7V3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z" />
                    </svg>
                    <span className="truncate">{page.title || page.url}</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5 lg:col-span-2">
          {/* Test panel */}
          {bot.status === "ready" ? (
            <ChatPanel botKey={bot.bot_key} />
          ) : (
            <div className="flex h-[520px] flex-col items-center justify-center rounded-2xl border border-dashed border-border-subtle bg-surface-1 text-center px-6">
              <div className="mb-4 text-4xl">
                {bot.status === "crawling" ? "🕷️" : "⏳"}
              </div>
              <h3 className="text-base font-semibold text-white">
                {bot.status === "crawling"
                  ? "Crawling in progress…"
                  : bot.status === "error"
                  ? "Crawl failed"
                  : "Bot not ready yet"}
              </h3>
              <p className="mt-2 text-sm text-white/40 max-w-xs leading-relaxed">
                {bot.status === "crawling"
                  ? "We're indexing your website. This may take up to a minute."
                  : bot.status === "error"
                  ? "There was a problem crawling your website. Try again using the Crawl button."
                  : "Click \"Crawl Website\" to index your content and activate this chatbot."}
              </p>
            </div>
          )}

          {/* Embed snippet */}
          {bot.status === "ready" && appUrl && (
            <EmbedSnippet botKey={bot.bot_key} appUrl={appUrl} />
          )}
          {bot.status === "ready" && !appUrl && (
            <div className="rounded-2xl border border-border-subtle bg-surface-1 p-5">
              <p className="text-sm text-white/40">
                Set <code className="text-brand-400">NEXT_PUBLIC_APP_URL</code> in your environment to generate the embed snippet.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs text-white/35 flex-shrink-0">{label}</span>
      {children}
    </div>
  );
}
