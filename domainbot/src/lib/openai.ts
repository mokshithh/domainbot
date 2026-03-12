import OpenAI from "openai";

if (!process.env.GROQ_API_KEY) {
  throw new Error("Missing GROQ_API_KEY environment variable.");
}

if (!process.env.JINA_API_KEY) {
  throw new Error("Missing JINA_API_KEY environment variable.");
}

export const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

export const CHAT_MODEL =
  process.env.GROQ_CHAT_MODEL || "llama-3.3-70b-versatile";

export const EMBEDDING_MODEL =
  process.env.JINA_EMBEDDING_MODEL || "jina-embeddings-v3";

/** Generate an embedding vector for a piece of text using Jina */
export async function getEmbedding(text: string): Promise<number[]> {
  const response = await fetch("https://api.jina.ai/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.JINA_API_KEY}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: [text.replace(/\n/g, " ")],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Jina embedding error: ${response.status} ${errorText}`
    );
  }

  const data = await response.json();

  if (!data?.data?.[0]?.embedding) {
    throw new Error("Jina embedding response missing embedding data.");
  }

  return data.data[0].embedding;
}
