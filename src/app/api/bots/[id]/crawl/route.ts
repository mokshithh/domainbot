import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServiceSupabase, getAuthUser } from "@/lib/supabase";
import { crawlDomain } from "@/lib/crawler";
import { embedAndStorePage } from "@/lib/embeddings";
import { setProgress, clearProgress } from "@/lib/crawlProgress";
import { PLANS } from "@/lib/plans";

// Allow up to 300 seconds (Vercel Pro) — reduce to 60 for Hobby tier
export const maxDuration = 300;

/** POST /api/bots/[id]/crawl — trigger crawl + embedding */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Auth check
  const cookieStore = await cookies();
  const user = await getAuthUser(cookieStore);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getServiceSupabase();

  // Fetch bot and verify ownership
  const { data: bot, error: botErr } = await db
    .from("bots")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (botErr || !bot) {
    return NextResponse.json({ error: "Bot not found" }, { status: 404 });
  }

  // Look up owner's plan to enforce page limit
  const { data: profile } = await db
    .from("user_profiles")
    .select("plan")
    .eq("id", bot.user_id)
    .single();
  const plan = (profile?.plan ?? "free") as "free" | "pro" | "max";
  const maxPages = PLANS[plan].maxPages;

  // Mark as crawling
  await db.from("bots").update({ status: "crawling" }).eq("id", id);

  // Initialize progress
  setProgress(id, {
    pagesFound: 0,
    pagesCrawled: 0,
    pageFailed: 0,
    currentUrl: "Starting crawl...",
    status: "crawling",
  });

  try {
    // 1. Crawl with progress tracking (capped to plan's page limit)
    const pages = await crawlDomain(bot.allowed_domain, (progress) => {
      setProgress(id, {
        pagesFound: progress.pagesFound,
        pagesCrawled: progress.pagesCrawled,
        pageFailed: progress.pageFailed,
        currentUrl: progress.currentUrl,
        status: "crawling",
      });
    }, maxPages);

    if (pages.length === 0) {
      setProgress(id, {
        pagesFound: 0,
        pagesCrawled: 0,
        pageFailed: 0,
        currentUrl: "",
        status: "error",
      });
      await db.from("bots").update({ status: "error", total_pages: 0 }).eq("id", id);
      setTimeout(() => clearProgress(id), 5000);
      return NextResponse.json(
        { error: "No pages could be crawled from this domain." },
        { status: 422 }
      );
    }

    // 2. Delete old data for this bot
    await db.from("pages").delete().eq("bot_id", id);

    // 3. Store pages + generate embeddings
    let stored = 0;
    for (const page of pages) {
      setProgress(id, {
        pagesFound: pages.length,
        pagesCrawled: stored,
        pageFailed: 0,
        currentUrl: `Indexing: ${page.url}`,
        status: "crawling",
      });

      const { data: inserted, error: pageErr } = await db
        .from("pages")
        .insert({
          bot_id: id,
          url: page.url,
          title: page.title,
          raw_html: page.rawHtml.slice(0, 500000), // cap raw html at 500KB
          cleaned_text: page.cleanedText,
          content_hash: page.contentHash,
        })
        .select("id")
        .single();

      if (pageErr || !inserted) continue;

      // Generate + store embeddings
      await embedAndStorePage(id, inserted.id, page.cleanedText);
      stored++;
    }

    // 4. Update bot status — use a fresh client in case the original
    //    connection has timed out after a long crawl (JWT/idle timeout).
    const dbFinal = getServiceSupabase();
    for (let attempt = 0; attempt < 3; attempt++) {
      const { error: updateErr } = await dbFinal
        .from("bots")
        .update({ status: "ready", total_pages: stored })
        .eq("id", id);
      if (!updateErr) break;
      console.error(`Bot status update attempt ${attempt + 1} failed:`, updateErr);
      await new Promise((r) => setTimeout(r, 1000));
    }

    setProgress(id, {
      pagesFound: pages.length,
      pagesCrawled: stored,
      pageFailed: 0,
      currentUrl: "",
      status: "done",
    });
    setTimeout(() => clearProgress(id), 5000);

    return NextResponse.json({ success: true, pages: stored });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    setProgress(id, {
      pagesFound: 0,
      pagesCrawled: 0,
      pageFailed: 0,
      currentUrl: "",
      status: "error",
    });
    const dbErr = getServiceSupabase();
    await dbErr.from("bots").update({ status: "error" }).eq("id", id);
    setTimeout(() => clearProgress(id), 5000);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
