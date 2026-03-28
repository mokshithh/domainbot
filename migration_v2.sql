-- ============================================================
-- DomainBot v2 Migration — Subscriptions + Auth
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Wipe all existing data (clean slate for auth-gated system)
TRUNCATE TABLE messages CASCADE;
TRUNCATE TABLE chat_sessions CASCADE;
TRUNCATE TABLE chunks CASCADE;
TRUNCATE TABLE pages CASCADE;
TRUNCATE TABLE bots CASCADE;

-- 2. Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id             uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email          text NOT NULL,
  plan           text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'max')),
  stripe_customer_id     text,
  stripe_subscription_id text,
  subscription_status    text DEFAULT 'active',
  subscription_end_date  timestamptz,
  daily_chat_count       int NOT NULL DEFAULT 0,
  daily_chat_reset_at    timestamptz DEFAULT (date_trunc('day', now() AT TIME ZONE 'UTC') + interval '1 day'),
  created_at     timestamptz DEFAULT now()
);

-- 3. Update bots table
ALTER TABLE bots ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE;
ALTER TABLE bots DROP COLUMN IF EXISTS daily_chat_limit;

-- 4. Add Max-plan customization columns to bots
ALTER TABLE bots ADD COLUMN IF NOT EXISTS system_prompt    text;
ALTER TABLE bots ADD COLUMN IF NOT EXISTS avatar_url       text;
ALTER TABLE bots ADD COLUMN IF NOT EXISTS remove_branding  boolean DEFAULT false;
ALTER TABLE bots ADD COLUMN IF NOT EXISTS custom_css       text;
ALTER TABLE bots ADD COLUMN IF NOT EXISTS bot_personality  text DEFAULT 'professional';

-- 5. Uploaded files table (Pro+ feature)
CREATE TABLE IF NOT EXISTS uploaded_files (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  bot_id       uuid REFERENCES bots(id) ON DELETE CASCADE NOT NULL,
  user_id      uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  file_name    text NOT NULL,
  file_type    text NOT NULL,       -- 'pdf' | 'docx' | 'txt'
  storage_path text,
  file_size    bigint,
  status       text DEFAULT 'ready',
  created_at   timestamptz DEFAULT now()
);

-- 6. Auto-create user_profiles row when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, plan)
  VALUES (NEW.id, NEW.email, 'free')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. RLS policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read/update their own profile
DROP POLICY IF EXISTS "users_select_own" ON user_profiles;
CREATE POLICY "users_select_own" ON user_profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "users_update_own" ON user_profiles;
CREATE POLICY "users_update_own" ON user_profiles FOR UPDATE USING (auth.uid() = id);

-- Service role bypasses RLS automatically, so no extra policy needed for that

ALTER TABLE bots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bots_user_crud" ON bots;
CREATE POLICY "bots_user_crud" ON bots USING (auth.uid() = user_id);

-- Allow public read for widget (by bot_key)
DROP POLICY IF EXISTS "bots_public_read_by_key" ON bots;
CREATE POLICY "bots_public_read_by_key" ON bots FOR SELECT USING (true);

ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "uploads_user_crud" ON uploaded_files;
CREATE POLICY "uploads_user_crud" ON uploaded_files USING (auth.uid() = user_id);

-- 8. Daily chat count reset (pg_cron — enable pg_cron extension in Supabase dashboard first)
-- Then run:
-- SELECT cron.schedule('reset-daily-chat-counts', '0 0 * * *', $$
--   UPDATE public.user_profiles
--   SET daily_chat_count = 0,
--       daily_chat_reset_at = date_trunc('day', now() AT TIME ZONE 'UTC') + interval '1 day'
--   WHERE daily_chat_reset_at <= now();
-- $$);

-- 9. Index for performance
CREATE INDEX IF NOT EXISTS idx_bots_user_id ON bots(user_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_bot_id ON uploaded_files(bot_id);
