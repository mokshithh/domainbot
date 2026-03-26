import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { crawlDomain } from "@/lib/crawler";
import { embedAndStorePage } from "@/lib/embeddings";
import { setProgress, clearProgress } from "@/lib/crawlProgress";

// Allow up to 300 seconds (Vercel Pro) — reduce to 60 for Hobby tier
export const maxDuration = 300;

/** POST /api/bots/[id]/crawl — trigger crawl + embedding */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getServiceSupabase();

  // Fetch bot
  const { data: bot, error: botErr } = await db
    .from("bots")
    .select("*")
    .eq("id", id)
    .single();

  if (botErr || !bot) {
    return NextResponse.json({ error: "Bot not found" }, { status: 404 });
  }

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
    // 1. Crawl with progress tracking
    const pages = await crawlDomain(bot.allowed_domain, (progress) => {
      setProgress(id, {
        pagesFound: progress.pagesFound,
        pagesCrawled: progress.pagesCrawled,
        pageFailed: progress.pageFailed,
        currentUrl: progress.currentUrl,
        status: "crawling",
      });
    });

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
