import { getServiceSupabase } from "@/lib/supabase";
import { getEmbedding, openai, CHAT_MODEL } from "@/lib/openai";
import type { MatchedChunk } from "@/lib/types";

/** POST /api/chat — streaming chat response via SSE */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { bot_key, message, session_id } = body;

    if (!bot_key || !message) {
      return new Response(
        JSON.stringify({ error: "bot_key and message are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const db = getServiceSupabase();

    // 1. Resolve bot
    const { data: bot, error: botErr } = await db
      .from("bots")
      .select("*")
      .eq("bot_key", bot_key)
      .single();

    if (botErr || !bot) {
      return new Response(JSON.stringify({ error: "Invalid bot_key" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (bot.status !== "ready") {
      return new Response(
        JSON.stringify({ error: "Bot is not ready yet. Please crawl the website first." }),
        { status: 422, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. Daily limit check
    if (bot.daily_chat_count >= bot.daily_chat_limit) {
      return new Response(
        JSON.stringify({ error: "Daily chat limit reached." }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Get / create session
    let sessionDbId: string;
    const sid = session_id || crypto.randomUUID();

    const { data: existing } = await db
      .from("chat_sessions")
      .select("id")
      .eq("bot_id", bot.id)
      .eq("session_id", sid)
      .single();

    if (existing) {
      sessionDbId = existing.id;
    } else {
      const { data: newSession, error: sessionErr } = await db
        .from("chat_sessions")
        .insert({ bot_id: bot.id, session_id: sid })
        .select("id")
        .single();

      if (sessionErr || !newSession) {
        return new Response(JSON.stringify({ error: "Session error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
      sessionDbId = newSession.id;
    }

    // 4. Fetch last 8 messages (4 turns) for conversation history
    const { data: recentMessages } = await db
      .from("messages")
      .select("role, content")
      .eq("chat_session_id", sessionDbId)
      .order("created_at", { ascending: false })
      .limit(8);

    const conversationHistory = (recentMessages || []).reverse().map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    // 5. Embed the question
    const queryEmbedding = await getEmbedding(message);

    // 6. Retrieve top-8 chunks via pgvector
    const { data: chunks, error: chunkErr } = await db.rpc("match_chunks", {
      query_embedding: queryEmbedding,
      match_bot_id: bot.id,
      match_count: 8,
    }) as { data: MatchedChunk[] | null; error: unknown };

    // 7. Get page URLs for citations
    const pageIds = [...new Set((chunks || []).map((c) => c.page_id))];
    const { data: pageRows } = pageIds.length > 0
      ? await db.from("pages").select("id, url, title").in("id", pageIds)
      : { data: [] };

    const pageMap = new Map((pageRows || []).map((p) => [p.id, p]));
    const citations = (chunks || [])
      .map((c) => {
        const p = pageMap.get(c.page_id);
        return p ? { url: p.url, title: p.title || p.url, pageId: p.id } : null;
      })
      .filter(Boolean)
      .filter((v, i, arr) => arr.findIndex((x) => x?.url === v?.url) === i) as Array<{
        url: string;
        title: string;
        pageId: string;
      }>;

    // Build context string (even if empty — LLM will say it doesn't know)
    const contextText = chunkErr || !chunks || chunks.length === 0
      ? ""
      : chunks.map((c, i) => `[${i + 1}] ${c.chunk_text}`).join("\n\n");

    // 8. Build system prompt
    const domainDisplay = bot.allowed_domain.replace(/^https?:\/\//, "");
    const systemPrompt = `You are a helpful, friendly assistant for ${domainDisplay}.
Your job is to answer customer questions based ONLY on the website content provided below.

Guidelines:
- Be concise and conversational — answer in 2-4 sentences when possible
- If the answer is in the content, answer confidently and naturally
- If the answer cannot be found in the content, say: "I'm not sure about that based on the website content. You might want to contact the team directly."
- Never make up information not in the content
- Use the customer's language and tone
${bot.bot_name_display ? `- You are "${bot.bot_name_display}"` : ""}

WEBSITE CONTENT:
${contextText || "No relevant content found."}`;

    // 9. Stream response
    const encoder = new TextEncoder();
    let fullAnswer = "";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const completion = await openai.chat.completions.create({
            model: CHAT_MODEL,
            messages: [
              { role: "system", content: systemPrompt },
              ...conversationHistory,
              { role: "user", content: message },
            ],
            max_tokens: 600,
            temperature: 0.3,
            stream: true,
          });

          for await (const chunk of completion) {
            const text = chunk.choices[0]?.delta?.content || "";
            if (text) {
              fullAnswer += text;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ chunk: text })}\n\n`)
              );
            }
          }

          // Save messages to DB
          await db.from("messages").insert([
            { chat_session_id: sessionDbId, role: "user", content: message },
            { chat_session_id: sessionDbId, role: "assistant", content: fullAnswer },
          ]);

          // Increment daily chat count
          await db
            .from("bots")
            .update({ daily_chat_count: bot.daily_chat_count + 1 })
            .eq("id", bot.id);

          // Increment citation counts on cited pages
          if (citations.length > 0) {
            for (const citation of citations) {
              try {
                await db.rpc("increment_citation_count", { page_id_input: citation.pageId });
              } catch {
                // RPC not available; skip citation count
              }
            }
          }

          // Send final event with metadata
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                done: true,
                session_id: sid,
                citations: citations.map(({ url, title }) => ({ url, title })),
              })}\n\n`
            )
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`)
          );
        } finally {
          controller.close();
        }
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
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/** GET /api/chat?bot_key=xxx&session_id=yyy — retrieve session history */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bot_key = searchParams.get("bot_key");
    const session_id = searchParams.get("session_id");

    if (!bot_key || !session_id) {
      return new Response(
        JSON.stringify({ error: "bot_key and session_id required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const db = getServiceSupabase();

    const { data: bot } = await db
      .from("bots")
      .select("id")
      .eq("bot_key", bot_key)
      .single();

    if (!bot) return Response.json({ messages: [] });

    const { data: session } = await db
      .from("chat_sessions")
      .select("id")
      .eq("bot_id", bot.id)
      .eq("session_id", session_id)
      .single();

    if (!session) return Response.json({ messages: [] });

    const { data: messages } = await db
      .from("messages")
      .select("role, content, created_at")
      .eq("chat_session_id", session.id)
      .order("created_at", { ascending: true });

    return Response.json({ messages: messages || [] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
