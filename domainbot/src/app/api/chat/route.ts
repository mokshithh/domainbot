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

    // 4. Detect intent
    const lowerMessage = String(message).toLowerCase();

    let answerMode: "general" | "location" | "pricing" | "services" | "contact" = "general";

    if (
      lowerMessage.includes("where") ||
      lowerMessage.includes("location") ||
      lowerMessage.includes("available") ||
      lowerMessage.includes("region") ||
      lowerMessage.includes("city") ||
      lowerMessage.includes("state") ||
      lowerMessage.includes("area") ||
      lowerMessage.includes("areas")
    ) {
      answerMode = "location";
    } else if (
      lowerMessage.includes("package") ||
      lowerMessage.includes("packages") ||
      lowerMessage.includes("price") ||
      lowerMessage.includes("pricing") ||
      lowerMessage.includes("cost") ||
      lowerMessage.includes("plan") ||
      lowerMessage.includes("plans")
    ) {
      answerMode = "pricing";
    } else if (
      lowerMessage.includes("service") ||
      lowerMessage.includes("services") ||
      lowerMessage.includes("support") ||
      lowerMessage.includes("offer") ||
      lowerMessage.includes("offers") ||
      lowerMessage.includes("provide") ||
      lowerMessage.includes("provides") ||
      lowerMessage.includes("do")
    ) {
      answerMode = "services";
    } else if (
      lowerMessage.includes("contact") ||
      lowerMessage.includes("phone") ||
      lowerMessage.includes("email") ||
      lowerMessage.includes("call") ||
      lowerMessage.includes("reach") ||
      lowerMessage.includes("number")
    ) {
      answerMode = "contact";
    }

    // 5. Embed the question
    const queryEmbedding = await getEmbedding(message);

    // 6. Retrieve top-k chunks via pgvector
    const { data: chunks, error: chunkErr } = (await db.rpc("match_chunks", {
      query_embedding: queryEmbedding,
      match_bot_id: bot.id,
      match_count: 8,
    })) as { data: MatchedChunk[] | null; error: unknown };

    if (chunkErr || !chunks || chunks.length === 0) {
      const reply = "I don't know based on the website content.";
      await saveMessages(db, sessionDbId, message, reply);

      return NextResponse.json({
        answer: reply,
        session_id: sid,
        citations: [],
      });
    }

    // 7. Build context string
    const contextText = chunks
      .map((c, i) => `[${i + 1}] ${c.chunk_text}`)
      .join("\n\n");

    // 8. Get page URLs for citations
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
      .filter((v, i, arr) => arr.findIndex((x) => x?.url === v?.url) === i);

    // 9. Better system prompt
    const systemPrompt = `You are a helpful AI assistant for the website ${bot.allowed_domain}.

Current question type: ${answerMode}

Your job is to answer the user's question using ONLY the retrieved website content.

Important rules:
1. Answer ONLY the question asked.
2. Do not include unrelated extra details unless they directly help answer the question.
3. You may combine facts from multiple retrieved chunks if needed.
4. Do NOT invent or assume information.
5. If the answer truly cannot be found in the website content, say exactly:
"I don't know based on the website content."
6. Prefer exact factual details from the website such as:
   - services
   - locations
   - cities
   - states
   - packages
   - contact info
   - support types
7. If the website implies something but does not state it directly, say:
"Based on the website content..."
and do not present it as a guaranteed fact.

Question handling rules:
- If question type is "location", answer only with service areas, cities, states, or regions.
- If question type is "pricing", answer only with pricing/packages/plans info. If packages are not explicitly listed, say so clearly.
- If question type is "services", answer only with services/support/offerings.
- If question type is "contact", answer only with contact details.
- If question type is "general", answer directly and concisely.

Response style:
- Be clear, direct, and structured
- For lists like services, locations, packages, or contact details, use bullet points
- Avoid long dense paragraphs
- Keep answers concise unless more detail is necessary
- Do not repeat the question
- Do not add marketing fluff

WEBSITE CONTENT:
${contextText}`;

    const completion = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `User question: ${message}

Answer this question directly and do not include unrelated details.`,
        },
      ],
      max_tokens: 500,
      temperature: 0.1,
    });

    const answer =
      completion.choices[0]?.message?.content?.trim() ||
      "I don't know based on the website content.";

    // 10. Save messages
    await saveMessages(db, sessionDbId, message, answer);

    // 11. Increment daily chat count
    await db
      .from("bots")
      .update({ daily_chat_count: bot.daily_chat_count + 1 })
      .eq("id", bot.id);

    return NextResponse.json({
      answer,
      session_id: sid,
      citations,
    });
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
