import type { Plan } from "./plans";

export type BotStatus = "pending" | "crawling" | "ready" | "error";

export interface Bot {
  id: string;
  name: string;
  bot_key: string;
  allowed_domain: string;
  status: BotStatus;
  total_pages: number;
  daily_chat_count: number;
  user_id: string;
  created_at: string;
  welcome_message?: string | null;
  primary_color?: string | null;
  bot_name_display?: string | null;
  // Max plan customization
  system_prompt?: string | null;
  avatar_url?: string | null;
  remove_branding?: boolean | null;
  custom_css?: string | null;
  bot_personality?: string | null;
}

export interface UserProfile {
  id: string;
  email: string;
  plan: Plan;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  subscription_status?: string | null;
  subscription_end_date?: string | null;
  daily_chat_count: number;
  daily_chat_reset_at: string;
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
  citation_count?: number;
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

export interface CrawlProgressState {
  pagesFound: number;
  pagesCrawled: number;
  pageFailed: number;
  currentUrl: string;
  status: "crawling" | "done" | "error";
}

export interface AnalyticsData {
  messages_today: number;
  total_messages: number;
  total_sessions: number;
  top_pages: Array<{ url: string; title: string | null; citation_count: number }>;
  messages_per_day: Array<{ date: string; count: number }>;
}

export interface UploadedFile {
  id: string;
  bot_id: string;
  user_id: string;
  file_name: string;
  file_type: string;
  storage_path: string | null;
  file_size: number | null;
  status: string;
  created_at: string;
}
