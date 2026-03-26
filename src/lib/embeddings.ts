import { getServiceSupabase } from "./supabase";

// Embed the first 2000 chars of each page — 1 API call per page,
// preserves the most relevant content, well within free-tier limits.
const MAX_EMBED_CHARS = 2000;

/**
 * Get a 768-dim embedding.
 * Primary: Jina AI (no daily limit, just concurrency ≤2 — sequential calls handle it).
 * Fallback: Gemini gemini-embedding-001 with auto-retry on 429.
 */
async function getEmbedding(text: string): Promise<number[]> {
  const clean = text.replace(/\n/g, " ").trim();

  // ── Jina (primary) ────────────────────────────────────────────────────────
  if (process.env.JINA_API_KEY) {
    const res = await fetch("https://api.jina.ai/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.JINA_API_KEY}`,
      },
      body: JSON.stringify({
        input: [clean],
        model: "jina-embeddings-v3",
        dimensions: 768,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return data.data[0].embedding;
    }

    const errText = await res.text();
    console.warn(`Jina embedding failed (${res.status}), falling back to Gemini: ${errText.slice(0, 120)}`);
  }

  // ── Gemini (fallback) ─────────────────────────────────────────────────────
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("No embedding API key configured (JINA_API_KEY or GEMINI_API_KEY)");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`;

  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: { parts: [{ text: clean }] },
        outputDimensionality: 768,
      }),
    });

    if (res.status === 429) {
      if (attempt === 3) throw new Error(`Gemini embedding error: 429 quota exhausted`);
      let waitMs = 35_000;
      try {
        const errData = await res.json();
        const retryInfo = (errData.error?.details ?? []).find(
          (d: { "@type"?: string }) => d["@type"]?.includes("RetryInfo")
        );
        if (retryInfo?.retryDelay) {
          waitMs = Math.ceil(parseFloat(retryInfo.retryDelay) * 1000) + 2000;
        }
      } catch { /* use default */ }
      console.log(`Gemini 429 — waiting ${waitMs / 1000}s (attempt ${attempt + 1}/3)`);
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini embedding error: ${res.status} ${errText}`);
    }

    const data = await res.json();
    if (!data?.embedding?.values) throw new Error("Gemini embedding response missing values.");
    return data.embedding.values;
  }

  throw new Error("Embedding failed after all retries");
}

/** Generate one embedding per page and store it */
export async function embedAndStorePage(
  botId: string,
  pageId: string,
  text: string
): Promise<void> {
  const db = getServiceSupabase();

  await db.from("chunks").delete().eq("page_id", pageId);

  const snippet = text.slice(0, MAX_EMBED_CHARS).trim();
  if (snippet.length < 50) return;

  const embedding = await getEmbedding(snippet);

  const { error } = await db.from("chunks").insert({
    bot_id: botId,
    page_id: pageId,
    chunk_text: snippet,
    embedding,
  });
  if (error) console.error("Error inserting chunk:", error);

  // 700ms gap keeps Jina under concurrency=2 and Gemini under 100 RPM
  await new Promise((r) => setTimeout(r, 700));
}
