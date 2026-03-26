import { notFound } from "next/navigation";
import { getServiceSupabase } from "@/lib/supabase";
import StatusBadge from "@/components/StatusBadge";
import ChatPanel from "@/components/ChatPanel";
import EmbedSnippet from "@/components/EmbedSnippet";
import AnalyticsTab from "@/components/AnalyticsTab";
import BotDetailClient from "./BotDetailClient";
import { formatDate, formatDomain } from "@/lib/utils";
import type { Bot, Page } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Globe, FileText, Key, MessageSquare, BarChart2, Code2 } from "lucide-react";

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
          <div className="flex items-center gap-3 flex-wrap">
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

        <BotDetailClient botId={bot.id} currentStatus={bot.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Left sidebar ── */}
        <div className="space-y-5 lg:col-span-1">
          {/* Bot info */}
          <div className="rounded-2xl border border-border-subtle bg-surface-2 p-5 shadow-card space-y-4">
            <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest">Bot Info</h2>

            <InfoRow label="Status">
              <StatusBadge status={bot.status} />
            </InfoRow>

            <InfoRow label="Domain">
              <a
                href={bot.allowed_domain.startsWith("http") ? bot.allowed_domain : `https://${bot.allowed_domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-brand-400 hover:text-brand-300 transition-colors"
              >
                <Globe size={12} />
                {formatDomain(bot.allowed_domain)}
              </a>
            </InfoRow>

            <InfoRow label="Pages Indexed">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
                <FileText size={12} className="text-white/30" />
                {bot.total_pages}
              </span>
            </InfoRow>

            <InfoRow label="Chats Today">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
                <MessageSquare size={12} className="text-white/30" />
                {bot.daily_chat_count} / {bot.daily_chat_limit}
              </span>
            </InfoRow>
          </div>

          {/* Bot key */}
          <div className="rounded-2xl border border-border-subtle bg-surface-2 p-5 shadow-card space-y-3">
            <h2 className="flex items-center gap-1.5 text-xs font-semibold text-white/40 uppercase tracking-widest">
              <Key size={11} />
              Bot Key
            </h2>
            <div className="rounded-xl bg-surface-1 px-3 py-2.5 font-mono text-xs text-white/50 break-all select-all border border-border-subtle">
              {bot.bot_key}
            </div>
            <p className="text-xs text-white/25">
              Keep private. Used to authenticate chat requests.
            </p>
          </div>

          {/* Pages list */}
          <div className="rounded-2xl border border-border-subtle bg-surface-2 p-5 shadow-card space-y-3">
            <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest">
              Indexed Pages ({pages.length})
            </h2>
            {pages.length === 0 ? (
              <p className="text-xs text-white/25 italic">
                No pages yet. Click &ldquo;Crawl Website&rdquo; to start.
              </p>
            ) : (
              <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
                {pages.map((page) => (
                  <a
                    key={page.id}
                    href={page.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-2 rounded-lg px-2 py-1.5 text-xs text-white/45 hover:text-white/80 hover:bg-surface-3 transition-colors group"
                  >
                    <Globe
                      size={10}
                      className="flex-shrink-0 mt-0.5 text-white/20 group-hover:text-brand-400 transition-colors"
                    />
                    <span className="truncate">{page.title || page.url}</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Right content ── */}
        <div className="space-y-5 lg:col-span-2">
          {bot.status === "ready" ? (
            <Tabs defaultValue="chat" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-surface-2 border border-border-subtle rounded-xl p-1 h-auto mb-5">
                <TabsTrigger
                  value="chat"
                  className="flex items-center gap-1.5 rounded-lg py-2 text-xs font-medium data-[state=active]:bg-surface-4 data-[state=active]:text-white data-[state=inactive]:text-white/40 transition-all"
                >
                  <MessageSquare size={13} />
                  Test Chat
                </TabsTrigger>
                <TabsTrigger
                  value="analytics"
                  className="flex items-center gap-1.5 rounded-lg py-2 text-xs font-medium data-[state=active]:bg-surface-4 data-[state=active]:text-white data-[state=inactive]:text-white/40 transition-all"
                >
                  <BarChart2 size={13} />
                  Analytics
                </TabsTrigger>
                <TabsTrigger
                  value="embed"
                  className="flex items-center gap-1.5 rounded-lg py-2 text-xs font-medium data-[state=active]:bg-surface-4 data-[state=active]:text-white data-[state=inactive]:text-white/40 transition-all"
                >
                  <Code2 size={13} />
                  Embed
                </TabsTrigger>
              </TabsList>

              <TabsContent value="chat" className="mt-0">
                <ChatPanel botKey={bot.bot_key} />
              </TabsContent>

              <TabsContent value="analytics" className="mt-0">
                <AnalyticsTab botId={bot.id} />
              </TabsContent>

              <TabsContent value="embed" className="mt-0">
                {appUrl ? (
                  <EmbedSnippet botKey={bot.bot_key} appUrl={appUrl} />
                ) : (
                  <div className="rounded-2xl border border-border-subtle bg-surface-1 p-5">
                    <p className="text-sm text-white/40">
                      Set <code className="text-brand-400">NEXT_PUBLIC_APP_URL</code> in your environment to generate the embed snippet.
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          ) : (
            <>
              {/* Not-ready placeholder */}
              <div className="flex h-[520px] flex-col items-center justify-center rounded-2xl border border-dashed border-border-subtle bg-surface-1 text-center px-6">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-3 border border-border-subtle">
                  {bot.status === "crawling" ? (
                    <Globe size={28} className="text-brand-400 animate-spin-slow" />
                  ) : (
                    <Globe size={28} className="text-white/20" />
                  )}
                </div>
                <h3 className="text-base font-semibold text-white">
                  {bot.status === "crawling"
                    ? "Crawling in progress…"
                    : bot.status === "error"
                    ? "Crawl failed"
                    : "Bot not ready yet"}
                </h3>
                <p className="mt-2 text-sm text-white/35 max-w-xs leading-relaxed">
                  {bot.status === "crawling"
                    ? "We're indexing your website. This may take up to a minute."
                    : bot.status === "error"
                    ? "There was a problem crawling your website. Try again using the Crawl button."
                    : "Click \"Crawl Website\" to index your content and activate this chatbot."}
                </p>
              </div>

              {/* Embed snippet still shown if appUrl available */}
              {bot.status !== "crawling" && appUrl && (
                <EmbedSnippet botKey={bot.bot_key} appUrl={appUrl} />
              )}
            </>
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
      <span className="text-xs text-white/30 flex-shrink-0">{label}</span>
      {children}
    </div>
  );
}
