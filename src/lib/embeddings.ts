import { getServiceSupabase } from "./supabase";

const CHUNK_SIZE = 1500; // characters — larger = fewer API calls = faster crawl
const CHUNK_OVERLAP = 100;

// Gemini free tier: 100 req/min. We send one batch request per page,
// then wait long enough that (chunks_in_batch / 100) * 60s have "elapsed".
// Floor at 700ms so single-chunk pages still stay well under the cap.
const MS_PER_REQUEST = 600; // 100 RPM = 1 req per 600ms

/** Split text into overlapping chunks */
export function chunkText(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    const chunk = text.slice(start, end).trim();
    if (chunk.length > 100) {
      chunks.push(chunk);
    }
    start += CHUNK_SIZE - CHUNK_OVERLAP;
  }

  return chunks;
}

/** Embed multiple texts in a single Gemini batchEmbedContents call */
async function batchGetEmbeddings(texts: string[]): Promise<number[][]> {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: texts.map((text) => ({
        model: "models/gemini-embedding-001",
        content: { parts: [{ text: text.replace(/\n/g, " ") }] },
        outputDimensionality: 768,
      })),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini embedding error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data.embeddings as any[]).map((e) => e.values);
}

/** Generate embeddings for all chunks of a page and store them in Supabase */
export async function embedAndStorePage(
  botId: string,
  pageId: string,
  text: string
): Promise<void> {
  const db = getServiceSupabase();
  const chunks = chunkText(text);
  if (chunks.length === 0) return;

  // Delete existing chunks for this page
  await db.from("chunks").delete().eq("page_id", pageId);

  // Send all chunks for this page in one batch request, then wait
  // proportionally so the overall rate stays ≤ 100 RPM.
  const embeddings = await batchGetEmbeddings(chunks);

  const rows = chunks.map((chunk_text, i) => ({
    bot_id: botId,
    page_id: pageId,
    chunk_text,
    embedding: embeddings[i],
  }));

  const { error } = await db.from("chunks").insert(rows);
  if (error) {
    console.error("Error inserting chunks:", error);
  }

  // Throttle: wait (chunks × 600ms) so we don't exceed 100 RPM across pages
  await new Promise((r) => setTimeout(r, chunks.length * MS_PER_REQUEST));
}
