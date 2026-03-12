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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

  const rows: Array<{
    bot_id: string;
    page_id: string;
    chunk_text: string;
    embedding: number[];
  }> = [];

  for (const chunk_text of chunks) {
    try {
      const embedding = await getEmbedding(chunk_text);
      rows.push({ bot_id: botId, page_id: pageId, chunk_text, embedding });

      // small delay to avoid Jina free-tier rate/concurrency limits
      await sleep(700);
    } catch (error) {
      console.error("Error generating embedding for chunk:", error);
    }
  }

  if (rows.length > 0) {
    const { error } = await db.from("chunks").insert(rows);
    if (error) {
      console.error("Error inserting chunks:", error);
    }
  }
}
