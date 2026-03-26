-- Drop existing embedding column (Jina 1024-dim, incompatible with Gemini 768-dim)
ALTER TABLE chunks DROP COLUMN IF EXISTS embedding;
ALTER TABLE chunks ADD COLUMN embedding vector(768);

-- Recreate the similarity search function with correct dimensions
DROP FUNCTION IF EXISTS match_chunks;
CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding vector(768),
  match_bot_id uuid,
  match_count int DEFAULT 8
)
RETURNS TABLE (
  id uuid,
  bot_id uuid,
  page_id uuid,
  chunk_text text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id, c.bot_id, c.page_id, c.chunk_text,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM chunks c
  WHERE c.bot_id = match_bot_id
    AND c.embedding IS NOT NULL
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
