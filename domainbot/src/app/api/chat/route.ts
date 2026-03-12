import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { getEmbedding, openai, CHAT_MODEL } from "@/lib/openai";
import type { MatchedChunk } from "@/lib/types";

/** POST /api/chat */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { bot_key, message, session_id } = body;

    if (!bot_key || !message) {
      return NextResponse.json(
        { error: "bot_key and message are required" },
        { status: 400 }
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
      return NextResponse.json({ error: "Invalid bot_key" }, { status: 404 });
    }

    if (bot.status !== "ready") {
      return NextResponse.json(
        { error: "Bot is not ready yet. Please crawl the website first." },
        { status: 422 }
      );
    }

    // 2. Daily limit check
    if (bot.daily_chat_count >= bot.daily_chat_limit) {
      return NextResponse.json(
        { error: "Daily chat limit reached." },
        { status: 429 }
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
        return NextResponse.json({ error: "Session error" }, { status: 500 });
      }
      sessionDbId = newSession.id;
    }

    // 4. Embed the question
    const queryEmbedding = await getEmbedding(message);

    // 5. Retrieve top-k chunks via pgvector
    const { data: chunks, error: chunkErr } = await db.rpc("match_chunks", {
      query_embedding: queryEmbedding,
      match_bot_id: bot.id,
      match_count: 8,
    }) as { data: MatchedChunk[] | null; error: unknown };

    if (chunkErr || !chunks || chunks.length === 0) {
      const reply =
        "I don't know based on the website content.";
      await saveMessages(db, sessionDbId, message, reply);
      return NextResponse.json({
        answer: reply,
        session_id: sid,
        citations: [],
      });
    }

    // 6. Build context string
    const contextText = chunks
      .map((c, i) => `[${i + 1}] ${c.chunk_text}`)
      .join("\n\n");

    // 7. Get page URLs for citations
    const pageIds = [...new Set(chunks.map((c) => c.page_id))];
    const { data: pageRows } = await db
      .from("pages")
      .select("id, url, title")
      .in("id", pageIds);

    const pageMap = new Map(pageRows?.map((p) => [p.id, p]) || []);
    const citations = chunks
      .map((c) => {
        const p = pageMap.get(c.page_id);
        return p ? { url: p.url, title: p.title || p.url } : null;
      })
      .filter(Boolean)
      .filter(
        (v, i, arr) => arr.findIndex((x) => x?.url === v?.url) === i
      );

    // 8. Call LLM
    const systemPrompt = `You are a helpful assistant for the website ${bot.allowed_domain}.
Answer questions ONLY based on the provided website content below.
If the answer cannot be found in the content, say exactly: "I don't know based on the website content."
Be concise and helpful. Do not make up information.

WEBSITE CONTENT:
${contextText}`;

    const completion = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      max_tokens: 600,
      temperature: 0.2,
    });

    const answer =
      completion.choices[0]?.message?.content?.trim() ||
      "I don't know based on the website content.";

    // 9. Save messages
    await saveMessages(db, sessionDbId, message, answer);

    // 10. Increment daily chat count
    await db
      .from("bots")
      .update({ daily_chat_count: bot.daily_chat_count + 1 })
      .eq("id", bot.id);

    return NextResponse.json({ answer, session_id: sid, citations });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

async function saveMessages(
  db: ReturnType<typeof getServiceSupabase>,
  sessionId: string,
  userMessage: string,
  assistantMessage: string
) {
  await db.from("messages").insert([
    { chat_session_id: sessionId, role: "user", content: userMessage },
    {
      chat_session_id: sessionId,
      role: "assistant",
      content: assistantMessage,
    },
  ]);
}

/** GET /api/chat?bot_key=xxx&session_id=yyy — retrieve session history */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bot_key = searchParams.get("bot_key");
    const session_id = searchParams.get("session_id");

    if (!bot_key || !session_id) {
      return NextResponse.json(
        { error: "bot_key and session_id required" },
        { status: 400 }
      );
    }

    const db = getServiceSupabase();

    const { data: bot } = await db
      .from("bots")
      .select("id")
      .eq("bot_key", bot_key)
      .single();

    if (!bot) return NextResponse.json({ messages: [] });

    const { data: session } = await db
      .from("chat_sessions")
      .select("id")
      .eq("bot_id", bot.id)
      .eq("session_id", session_id)
      .single();

    if (!session) return NextResponse.json({ messages: [] });

    const { data: messages } = await db
      .from("messages")
      .select("role, content, created_at")
      .eq("chat_session_id", session.id)
      .order("created_at", { ascending: true });

    return NextResponse.json({ messages: messages || [] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
