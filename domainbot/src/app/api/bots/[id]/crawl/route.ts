import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { crawlDomain } from "@/lib/crawler";
import { embedAndStorePage } from "@/lib/embeddings";

export const maxDuration = 60;

/** POST /api/bots/[id]/crawl — trigger crawl + embedding */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getServiceSupabase();

  const { data: bot, error: botErr } = await db
    .from("bots")
    .select("*")
    .eq("id", id)
    .single();

  if (botErr || !bot) {
    return NextResponse.json({ error: "Bot not found" }, { status: 404 });
  }

  await db.from("bots").update({ status: "crawling" }).eq("id", id);

  try {
    const pages = await crawlDomain(bot.allowed_domain);

    if (pages.length === 0) {
      await db.from("bots").update({ status: "error", total_pages: 0 }).eq("id", id);
      return NextResponse.json(
        { error: "No pages could be crawled from this domain." },
        { status: 422 }
      );
    }

    // delete old data
    await db.from("chunks").delete().eq("bot_id", id);
    await db.from("pages").delete().eq("bot_id", id);

    let storedPages = 0;
    let totalChunks = 0;

    for (const page of pages) {
      const { data: inserted, error: pageErr } = await db
        .from("pages")
        .insert({
          bot_id: id,
          url: page.url,
          title: page.title,
          raw_html: page.rawHtml.slice(0, 500000),
          cleaned_text: page.cleanedText,
          content_hash: page.contentHash,
        })
        .select("id")
        .single();

      if (pageErr || !inserted) {
        console.error("Page insert failed:", pageErr);
        continue;
      }

      const chunkCount = await embedAndStorePage(id, inserted.id, page.cleanedText);

      if (chunkCount > 0) {
        storedPages++;
        totalChunks += chunkCount;
      }
    }

    if (storedPages === 0 || totalChunks === 0) {
      await db.from("bots").update({ status: "error", total_pages: 0 }).eq("id", id);

      return NextResponse.json(
        {
          error: "Pages were crawled, but no chunks/embeddings were stored.",
          pages: storedPages,
          chunks: totalChunks,
        },
        { status: 500 }
      );
    }

    await db
      .from("bots")
      .update({ status: "ready", total_pages: storedPages })
      .eq("id", id);

    return NextResponse.json({
      success: true,
      pages: storedPages,
      chunks: totalChunks,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("Crawl route error:", err);

    await db.from("bots").update({ status: "error" }).eq("id", id);

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
