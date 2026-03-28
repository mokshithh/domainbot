-- ============================================================
-- DomainBot v3 Migration — Max Plan Features + Lead Capture
-- Run this in Supabase SQL Editor (after migration_v2.sql)
-- ============================================================

-- 1. Leads table (Max plan — pre-chat / in-chat lead capture)
CREATE TABLE IF NOT EXISTS leads (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  bot_id       uuid REFERENCES bots(id) ON DELETE CASCADE NOT NULL,
  user_id      uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  name         text,
  email        text,
  phone        text,
  session_id   text,
  source       text DEFAULT 'chat',      -- 'pre_chat' | 'chat' | 'in_widget'
  notes        text,                     -- first message or extra context
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_bot_id ON leads(bot_id);
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "leads_user_crud" ON leads;
CREATE POLICY "leads_user_crud" ON leads USING (auth.uid() = user_id);

-- 2. Bot settings table (business hours, handoff config, lead capture config, etc.)
CREATE TABLE IF NOT EXISTS bot_settings (
  id                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  bot_id                uuid REFERENCES bots(id) ON DELETE CASCADE NOT NULL UNIQUE,
  user_id               uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,

  -- Lead capture
  lead_capture_enabled  boolean DEFAULT false,
  lead_fields           jsonb DEFAULT '["name","email"]'::jsonb,
  lead_capture_title    text DEFAULT 'Before we chat…',
  lead_capture_subtitle text DEFAULT 'Share your details and we''ll get right back to you.',

  -- Business hours & away message
  business_hours_enabled boolean DEFAULT false,
  business_hours         jsonb DEFAULT '{
    "timezone": "UTC",
    "monday": {"open": "09:00", "close": "17:00", "enabled": true},
    "tuesday": {"open": "09:00", "close": "17:00", "enabled": true},
    "wednesday": {"open": "09:00", "close": "17:00", "enabled": true},
    "thursday": {"open": "09:00", "close": "17:00", "enabled": true},
    "friday": {"open": "09:00", "close": "17:00", "enabled": true},
    "saturday": {"open": "10:00", "close": "14:00", "enabled": false},
    "sunday": {"open": "10:00", "close": "14:00", "enabled": false}
  }'::jsonb,
  away_message          text DEFAULT 'We''re currently offline. Leave your email and we''ll get back to you!',

  -- Human handoff
  handoff_enabled       boolean DEFAULT false,
  handoff_trigger       text DEFAULT 'I want to speak to a human',
  handoff_message       text DEFAULT 'Happy to connect you! You can reach our team at:',
  handoff_email         text,
  handoff_phone         text,
  handoff_url           text,

  -- Suggested questions
  suggested_questions   jsonb DEFAULT '[]'::jsonb,

  -- Tone / response style
  response_length       text DEFAULT 'medium',      -- 'short' | 'medium' | 'detailed'
  tone_override         text,                       -- freeform extra instruction

  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bot_settings_bot_id ON bot_settings(bot_id);

ALTER TABLE bot_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bot_settings_user_crud" ON bot_settings;
CREATE POLICY "bot_settings_user_crud" ON bot_settings USING (auth.uid() = user_id);

-- 3. Chat events table for premium analytics
CREATE TABLE IF NOT EXISTS chat_events (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  bot_id       uuid REFERENCES bots(id) ON DELETE CASCADE NOT NULL,
  session_id   text NOT NULL,
  event_type   text NOT NULL,   -- 'message' | 'lead_captured' | 'handoff_requested' | 'widget_opened'
  metadata     jsonb DEFAULT '{}'::jsonb,
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_events_bot_id ON chat_events(bot_id);
CREATE INDEX IF NOT EXISTS idx_chat_events_created_at ON chat_events(created_at DESC);

ALTER TABLE chat_events ENABLE ROW LEVEL SECURITY;
-- Public insert (widget can fire events)
DROP POLICY IF EXISTS "chat_events_public_insert" ON chat_events;
CREATE POLICY "chat_events_public_insert" ON chat_events FOR INSERT WITH CHECK (true);
-- Only bot owner can read
DROP POLICY IF EXISTS "chat_events_owner_read" ON chat_events;
CREATE POLICY "chat_events_owner_read" ON chat_events FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM bots WHERE bots.id = chat_events.bot_id AND bots.user_id = auth.uid()
  ));

-- 4. Add storage_path to uploaded_files if not present (use Supabase Storage)
ALTER TABLE uploaded_files ADD COLUMN IF NOT EXISTS page_id uuid REFERENCES pages(id) ON DELETE SET NULL;

-- 5. Helper function: upsert bot_settings
CREATE OR REPLACE FUNCTION ensure_bot_settings(p_bot_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO bot_settings (bot_id, user_id)
  VALUES (p_bot_id, p_user_id)
  ON CONFLICT (bot_id) DO NOTHING;
END;
$$;

-- 6. Trigger to auto-create bot_settings when a bot is created
-- (optional — can also be done in the API)

-- 7. Index for uploaded_files by user
CREATE INDEX IF NOT EXISTS idx_uploaded_files_user_id ON uploaded_files(user_id);
