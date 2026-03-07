import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { crawlDomain } from "@/lib/crawler";
import { embedAndStorePage } from "@/lib/embeddings";

// Allow up to 60 seconds (Vercel Pro) — adjust down to 10 for Hobby
export const maxDuration = 60;

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

  try {
    // 1. Crawl
    const pages = await crawlDomain(bot.allowed_domain);

    if (pages.length === 0) {
      await db.from("bots").update({ status: "error", total_pages: 0 }).eq("id", id);
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

    // 4. Update bot status
    await db
      .from("bots")
      .update({ status: "ready", total_pages: stored })
      .eq("id", id);

    return NextResponse.json({ success: true, pages: stored });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    await db.from("bots").update({ status: "error" }).eq("id", id);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
