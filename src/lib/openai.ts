import OpenAI from "openai";

if (!process.env.GROQ_API_KEY) {
  throw new Error("Missing GROQ_API_KEY environment variable.");
}

if (!process.env.GEMINI_API_KEY) {
  throw new Error("Missing GEMINI_API_KEY environment variable.");
}

export const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

export const CHAT_MODEL =
  process.env.GROQ_CHAT_MODEL || "llama-3.3-70b-versatile";

/**
 * Generate an embedding vector using Google Gemini text-embedding-004.
 * We use outputDimensionality: 1024 to stay compatible with existing
 * Supabase pgvector columns (no schema migration needed).
 */
export async function getEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: { parts: [{ text: text.replace(/\n/g, " ") }] },
      outputDimensionality: 768,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini embedding error: ${response.status} ${errorText}`);
  }

  const data = await response.json();

  if (!data?.embedding?.values) {
    throw new Error("Gemini embedding response missing values.");
  }

  return data.embedding.values;
}