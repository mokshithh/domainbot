import { getServiceSupabase } from "@/lib/supabase";
import { getProgress } from "@/lib/crawlProgress";

/** GET /api/bots/[id]/crawl/progress — SSE stream for real-time crawl progress */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getServiceSupabase();

  // Verify bot exists
  const { data: bot } = await db
    .from("bots")
    .select("status")
    .eq("id", id)
    .single();

  if (!bot) {
    return new Response("Bot not found", { status: 404 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Poll for progress updates
      let ticks = 0;
      const maxTicks = 300; // 5 minutes max

      const interval = setInterval(async () => {
        ticks++;

        // Check in-memory progress first
        const progress = getProgress(id);

        if (progress) {
          send(progress);
          if (progress.status === "done" || progress.status === "error") {
            clearInterval(interval);
            controller.close();
            return;
          }
        } else {
          // Fallback: check bot status from DB
          const { data: freshBot } = await db
            .from("bots")
            .select("status, total_pages")
            .eq("id", id)
            .single();

          if (freshBot?.status === "ready") {
            send({
              pagesFound: freshBot.total_pages,
              pagesCrawled: freshBot.total_pages,
              pageFailed: 0,
              currentUrl: "",
              status: "done",
            });
            clearInterval(interval);
            controller.close();
            return;
          }

          if (freshBot?.status === "error") {
            send({ pagesFound: 0, pagesCrawled: 0, pageFailed: 0, currentUrl: "", status: "error" });
            clearInterval(interval);
            controller.close();
            return;
          }

          // Still crawling — send heartbeat
          send({ pagesFound: 0, pagesCrawled: 0, pageFailed: 0, currentUrl: "Initializing...", status: "crawling" });
        }

        if (ticks >= maxTicks) {
          clearInterval(interval);
          controller.close();
        }
      }, 1000);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
