import { getServiceSupabase } from "./supabase";
import { getEmbedding } from "./openai";

const CHUNK_SIZE = 500; // characters
const CHUNK_OVERLAP = 50;

/** Split text into overlapping chunks */
export function chunkText(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    const chunk = text.slice(start, end).trim();
    if (chunk.length > 50) {
      chunks.push(chunk);
    }
    start += CHUNK_SIZE - CHUNK_OVERLAP;
  }

  return chunks;
}

/** Generate embeddings for all chunks of a page and store them in Supabase */
export async function embedAndStorePage(
  botId: string,
  pageId: string,
  text: string
): Promise<void> {
  const db = getServiceSupabase();
  const chunks = chunkText(text);

  // Delete existing chunks for this page
  await db.from("chunks").delete().eq("page_id", pageId);

  // Process chunks sequentially with a delay to stay within Gemini's 100 RPM
  // free-tier limit (700 ms ≈ 85 RPM, safely under the cap).
  for (const chunk_text of chunks) {
    const embedding = await getEmbedding(chunk_text);
    const { error } = await db
      .from("chunks")
      .insert({ bot_id: botId, page_id: pageId, chunk_text, embedding });
    if (error) {
      console.error("Error inserting chunk:", error);
    }
    await new Promise((r) => setTimeout(r, 700));
  }
}
