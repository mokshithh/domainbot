import OpenAI from "openai";

if (!process.env.GROQ_API_KEY) {
  throw new Error("Missing GROQ_API_KEY environment variable.");
}

export const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

export const CHAT_MODEL =
  process.env.GROQ_CHAT_MODEL || "llama-3.3-70b-versatile";

/**
 * Get a 768-dim embedding for a query (used at chat time).
 * Primary: Jina AI. Fallback: Gemini with auto-retry on 429.
 */
export async function getEmbedding(text: string): Promise<number[]> {
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
    console.warn(`Jina embedding failed (${res.status}), falling back to Gemini`);
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
