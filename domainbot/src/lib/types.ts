export type BotStatus = "pending" | "crawling" | "ready" | "error";

export interface Bot {
  id: string;
  name: string;
  bot_key: string;
  allowed_domain: string;
  status: BotStatus;
  total_pages: number;
  daily_chat_count: number;
  daily_chat_limit: number;
  created_at: string;
}

export interface Page {
  id: string;
  bot_id: string;
  url: string;
  title: string | null;
  raw_html: string | null;
  cleaned_text: string | null;
  content_hash: string | null;
  created_at: string;
}

export interface Chunk {
  id: string;
  bot_id: string;
  page_id: string;
  chunk_text: string;
  embedding: number[] | null;
  created_at: string;
}

export interface ChatSession {
  id: string;
  bot_id: string;
  session_id: string;
  created_at: string;
}

export interface Message {
  id: string;
  chat_session_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface MatchedChunk {
  id: string;
  bot_id: string;
  page_id: string;
  chunk_text: string;
  similarity: number;
}
