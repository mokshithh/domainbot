import { getServiceSupabase } from "@/lib/supabase";
import { getEmbedding, openai, CHAT_MODEL } from "@/lib/openai";
import { PLANS } from "@/lib/plans";
import type { MatchedChunk } from "@/lib/types";

// In-memory rate limit: 30 req/min per bot_key (resets on cold start — acceptable for MVP)
const chatRateMap = new Map<string, { count: number; resetAt: number }>();
function isRateLimited(key: string, limit = 30, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = chatRateMap.get(key);
  if (!entry || now > entry.resetAt) {
    chatRateMap.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  if (entry.count >= limit) return true;
  entry.count++;
  return false;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

/** OPTIONS /api/chat — CORS preflight for cross-origin widget embeds */
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

/** POST /api/chat — streaming chat response via SSE */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { bot_key, message, session_id, response_length, tone_override } = body;

    if (!bot_key || !message) {
      return new Response(
        JSON.stringify({ error: "bot_key and message are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...CORS } }
      );
    }

    if (isRateLimited(bot_key)) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please slow down." }),
        { status: 429, headers: { "Content-Type": "application/json", ...CORS } }
      );
    }

    if (session_id && !UUID_RE.test(session_id)) {
      return new Response(
        JSON.stringify({ error: "Invalid session_id" }),
        { status: 400, headers: { "Content-Type": "application/json", ...CORS } }
      );
    }

    if (typeof message !== "string" || message.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Message must be a non-empty string" }),
        { status: 400, headers: { "Content-Type": "application/json", ...CORS } }
      );
    }

    if (message.length > 2000) {
      return new Response(
        JSON.stringify({ error: "Message exceeds 2000 character limit" }),
        { status: 400, headers: { "Content-Type": "application/json", ...CORS } }
      );
    }

    const db = getServiceSupabase();

    // 1. Resolve bot + its owner's profile
    const { data: bot, error: botErr } = await db
      .from("bots")
      .select("*")
      .eq("bot_key", bot_key)
      .single();

    if (botErr || !bot) {
      return new Response(JSON.stringify({ error: "Invalid bot_key" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...CORS },
      });
    }

    if (bot.status !== "ready") {
      return new Response(
        JSON.stringify({ error: "Bot is not ready yet. Please crawl the website first." }),
        { status: 422, headers: { "Content-Type": "application/json", ...CORS } }
      );
    }

    // 2. Per-user daily limit check
    const { data: profile } = await db
      .from("user_profiles")
      .select("plan, daily_chat_count, daily_chat_reset_at")
      .eq("id", bot.user_id)
      .single();

    const plan = (profile?.plan ?? "free") as "free" | "pro" | "max";
    const planConfig = PLANS[plan];
    let dailyCount = profile?.daily_chat_count ?? 0;
    const resetAt = profile?.daily_chat_reset_at ? new Date(profile.daily_chat_reset_at) : null;

    // Auto-reset if past reset time (fallback if pg_cron not set up)
    if (resetAt && resetAt <= new Date()) {
      await db
        .from("user_profiles")
        .update({
          daily_chat_count: 0,
          daily_chat_reset_at: new Date(
            Date.UTC(
              new Date().getUTCFullYear(),
              new Date().getUTCMonth(),
              new Date().getUTCDate() + 1
            )
          ).toISOString(),
        })
        .eq("id", bot.user_id);
      dailyCount = 0;
    }

    if (dailyCount >= planConfig.chatsPerDay) {
      return new Response(
        JSON.stringify({
          error: `Daily chat limit reached (${planConfig.chatsPerDay}/day on ${planConfig.label} plan). Upgrade for more.`,
          code: "DAILY_LIMIT_REACHED",
          plan,
          limit: planConfig.chatsPerDay,
        }),
        { status: 429, headers: { "Content-Type": "application/json", ...CORS } }
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
          headers: { "Content-Type": "application/json", ...CORS },
        });
      }
      sessionDbId = newSession.id;
    }

    // 4. Fetch last 8 messages for conversation history
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

    const contextText = chunkErr || !chunks || chunks.length === 0
      ? ""
      : chunks.map((c, i) => `[${i + 1}] ${c.chunk_text}`).join("\n\n");

    // 8. Build system prompt — use custom one for Max plan if set
    const domainDisplay = bot.allowed_domain.replace(/^https?:\/\//, "");
    const customSystemPrompt = planConfig.customization && bot.system_prompt
      ? bot.system_prompt
      : null;

    const personalityMap: Record<string, string> = {
      professional: "professional and helpful",
      friendly: "warm, friendly, and conversational",
      casual: "casual and approachable",
      formal: "formal and precise",
    };
    const personality = personalityMap[bot.bot_personality ?? "professional"] ?? "helpful";

    // Response length → max_tokens
    const maxTokens = response_length === "short" ? 150 : response_length === "detailed" ? 800 : 500;

    // Build system prompt
    const toneAppend = tone_override && typeof tone_override === "string" && tone_override.trim()
      ? `\n\nAdditional instructions: ${tone_override.trim()}`
      : "";

    const systemPrompt = customSystemPrompt
      ? `${customSystemPrompt}${toneAppend}\n\nWEBSITE CONTENT:\n${contextText || "No content available for this query."}`
      : `You are the ${personality} assistant for ${domainDisplay}. You help visitors get clear, helpful answers.

Speak as part of the team — use "we", "our", and "us" naturally. You represent this business directly.

RESPONSE STRUCTURE — always follow this format:

## Summary
- 1–3 bullet points that briefly answer the user's question or request.

## Details
- Use short paragraphs (2–4 sentences each).
- Break information into clear subsections using headings like:
  ### Explanation
  ### Steps
  ### Examples
- Use **numbered lists** for step-by-step instructions.
- Use **bullet lists** for unordered information (pros/cons, options, key points).
- Wrap all code, commands, or config in fenced code blocks:
  \`\`\`language
  // code here
  \`\`\`

End with either:
## Next Steps
- Bullet list of what the user should do next

OR (when more appropriate):
## Key Takeaways
- Bullet list of the most important points.

CLARITY RULES:
- NEVER write a wall-of-text paragraph. No single paragraph longer than 4 sentences.
- Prefer several small sections over one long block.
- Use **bold** sparingly — only for important terms, warnings, or key facts.
- Simple factual answers (e.g. "What are your hours?") → use just ## Summary with 1–2 bullets. Skip ## Details.
- Complex or multi-part questions → full structure with ## Summary + ## Details + ## Next Steps.

CONTENT RULES:
- Never say "based on the website", "it appears", "according to the content", "as an AI", or similar phrases
- Do not reveal that you crawled or analyzed any content — just answer naturally
- Never invent pricing, policies, or facts not in the content below
- If you don't have the answer: respond naturally and guide to the next step (e.g. "That's best answered by our team directly — feel free to reach out.")
- Encourage contact or next-step actions where appropriate, without being pushy
${bot.bot_name_display ? `- Your name is "${bot.bot_name_display}"` : ""}
${response_length === "short" ? "- Keep responses very concise — ## Summary only, 1–2 bullets max" : response_length === "detailed" ? "- Provide thorough, detailed explanations — use full ## Summary + ## Details + ## Next Steps structure" : ""}

WEBSITE CONTENT:
${contextText || "No content available for this query."}${toneAppend}`;

    // 9. Stream response
    const encoder = new TextEncoder();
    const llmMessages = [
      { role: "system" as const, content: systemPrompt },
      ...conversationHistory,
      { role: "user" as const, content: message },
    ];

    async function saveAndFinish(controller: ReadableStreamDefaultController, fullAnswer: string) {
      await db.from("messages").insert([
        { chat_session_id: sessionDbId, role: "user", content: message },
        { chat_session_id: sessionDbId, role: "assistant", content: fullAnswer },
      ]);
      const [botRpc, userRpc] = await Promise.all([
        db.rpc("increment_bot_chat_count", { bot_id_input: bot.id }),
        db.rpc("increment_user_chat_count", { user_id_input: bot.user_id }),
      ]);
      if (botRpc.error) await db.from("bots").update({ daily_chat_count: bot.daily_chat_count + 1 }).eq("id", bot.id);
      if (userRpc.error) await db.from("user_profiles").update({ daily_chat_count: dailyCount + 1 }).eq("id", bot.user_id);
      if (citations.length > 0) {
        for (const citation of citations) {
          try { await db.rpc("increment_citation_count", { page_id_input: citation.pageId }); } catch { /* skip */ }
        }
      }
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, session_id: sid, citations: citations.map(({ url, title }) => ({ url, title })) })}\n\n`));
    }

    async function streamGroq(controller: ReadableStreamDefaultController): Promise<string> {
      const completion = await openai.chat.completions.create({
        model: CHAT_MODEL,
        messages: llmMessages,
        max_tokens: maxTokens,
        temperature: 0.3,
        stream: true,
      });
      let fullAnswer = "";
      for await (const chunk of completion) {
        const text = chunk.choices[0]?.delta?.content || "";
        if (text) {
          fullAnswer += text;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk: text })}\n\n`));
        }
      }
      return fullAnswer;
    }

    async function streamGemini(controller: ReadableStreamDefaultController): Promise<string> {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY not configured");
      const contents = [
        ...conversationHistory.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
        { role: "user", parts: [{ text: message }] },
      ];
      const body = JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { maxOutputTokens: 600, temperature: 0.3 },
      });
      // Try Gemini models in order; retry once per model on 429
      const models = ["gemini-2.0-flash", "gemini-1.5-flash"];
      for (const model of models) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
        for (let attempt = 0; attempt < 2; attempt++) {
          const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body });
          if (res.status === 429) {
            if (attempt === 0) { await new Promise((r) => setTimeout(r, 3000)); continue; }
            break; // try next model
          }
          if (!res.ok) break;
          const reader = res.body!.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          let fullAnswer = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";
            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const json = line.slice(6).trim();
              if (!json) continue;
              try {
                const data = JSON.parse(json);
                const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
                if (text) {
                  fullAnswer += text;
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk: text })}\n\n`));
                }
              } catch { /* ignore parse errors */ }
            }
          }
          return fullAnswer;
        }
      }
      // Last resort: OpenAI gpt-4o-mini (paid, ~$0.001/conversation)
      const oaiKey = process.env.OPENAI_API_KEY;
      if (oaiKey) {
        const oaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${oaiKey}` },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: llmMessages,
            max_tokens: maxTokens,
            temperature: 0.3,
            stream: true,
          }),
        });
        if (oaiRes.ok) {
          const reader = oaiRes.body!.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          let fullAnswer = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";
            for (const line of lines) {
              if (!line.startsWith("data: ") || line.includes("[DONE]")) continue;
              const json = line.slice(6).trim();
              if (!json) continue;
              try {
                const data = JSON.parse(json);
                const text: string = data.choices?.[0]?.delta?.content || "";
                if (text) {
                  fullAnswer += text;
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk: text })}\n\n`));
                }
              } catch { /* ignore parse errors */ }
            }
          }
          return fullAnswer;
        }
      }
      throw new Error("All AI providers are temporarily busy. Please try again in a moment.");
    }

    const stream = new ReadableStream({
      async start(controller) {
        try {
          let fullAnswer: string;
          try {
            fullAnswer = await streamGroq(controller);
          } catch (groqErr) {
            const msg = groqErr instanceof Error ? groqErr.message : "";
            const isRateLimit = msg.includes("429") || msg.toLowerCase().includes("rate limit") || msg.toLowerCase().includes("tokens per day") || msg.toLowerCase().includes("quota") || msg.toLowerCase().includes("exceeded");
            if (!isRateLimit || !process.env.GEMINI_API_KEY) throw groqErr;
            // Silent fallback — user sees no interruption
            fullAnswer = await streamGemini(controller);
          }
          await saveAndFinish(controller, fullAnswer);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
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
        ...CORS,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...CORS },
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
        { status: 400, headers: { "Content-Type": "application/json", ...CORS } }
      );
    }

    if (!UUID_RE.test(session_id)) {
      return new Response(
        JSON.stringify({ error: "Invalid session_id" }),
        { status: 400, headers: { "Content-Type": "application/json", ...CORS } }
      );
    }

    const db = getServiceSupabase();

    const { data: bot } = await db
      .from("bots")
      .select("id")
      .eq("bot_key", bot_key)
      .single();

    if (!bot) return Response.json({ messages: [] }, { headers: CORS });

    const { data: session } = await db
      .from("chat_sessions")
      .select("id")
      .eq("bot_id", bot.id)
      .eq("session_id", session_id)
      .single();

    if (!session) return Response.json({ messages: [] }, { headers: CORS });

    const { data: messages } = await db
      .from("messages")
      .select("role, content, created_at")
      .eq("chat_session_id", session.id)
      .order("created_at", { ascending: true });

    return Response.json({ messages: messages || [] }, { headers: CORS });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...CORS },
    });
  }
}
