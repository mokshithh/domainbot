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

function toPgVector(values: number[]): string {
  return `[${values.join(",")}]`;
}

/** Generate embeddings for all chunks of a page and store them in Supabase */
export async function embedAndStorePage(
  botId: string,
  pageId: string,
  text: string
): Promise<number> {
  const db = getServiceSupabase();
  const chunks = chunkText(text);

  if (chunks.length === 0) {
    throw new Error("No valid chunks generated from page text.");
  }

  // Delete old chunks for this page
  const { error: deleteErr } = await db.from("chunks").delete().eq("page_id", pageId);
  if (deleteErr) {
    throw new Error(`Failed deleting old chunks: ${deleteErr.message}`);
  }

  let insertedCount = 0;

  for (const chunk_text of chunks) {
    try {
      const embedding = await getEmbedding(chunk_text);

      const row = {
        bot_id: botId,
        page_id: pageId,
        chunk_text,
        embedding: toPgVector(embedding), // important for pgvector
      };

      const { error: insertErr } = await db.from("chunks").insert(row);

      if (insertErr) {
        throw new Error(`Chunk insert failed: ${insertErr.message}`);
      }

      insertedCount++;

      // slow down for Jina free tier
      await sleep(900);
    } catch (error) {
      console.error("Embedding/chunk insert error:", error);
      throw error;
    }
  }

  if (insertedCount === 0) {
    throw new Error("No chunks were inserted for this page.");
  }

  return insertedCount;
}
