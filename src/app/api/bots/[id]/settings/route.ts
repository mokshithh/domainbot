import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServiceSupabase, getAuthUser } from "@/lib/supabase";
import { hasCustomization } from "@/lib/plans";
import type { Plan } from "@/lib/plans";

/**
 * GET /api/bots/[id]/settings
 * Returns the bot_settings row for this bot (creates default row if missing).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: botId } = await params;
    const cookieStore = await cookies();
    const user = await getAuthUser(cookieStore);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = getServiceSupabase();

    // Verify ownership
    const { data: bot } = await db
      .from("bots")
      .select("id, user_id")
      .eq("id", botId)
      .eq("user_id", user.id)
      .single();

    if (!bot) return NextResponse.json({ error: "Bot not found" }, { status: 404 });

    // Get or create settings
    const { data: existing } = await db
      .from("bot_settings")
      .select("*")
      .eq("bot_id", botId)
      .maybeSingle();

    if (existing) return NextResponse.json({ settings: existing });

    // Auto-create default settings
    const { data: created } = await db
      .from("bot_settings")
      .insert({ bot_id: botId, user_id: user.id })
      .select("*")
      .single();

    return NextResponse.json({ settings: created });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * PATCH /api/bots/[id]/settings
 * Update bot settings (Max plan required for most fields).
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: botId } = await params;
    const cookieStore = await cookies();
    const user = await getAuthUser(cookieStore);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = getServiceSupabase();

    // Check plan
    const { data: profile } = await db
      .from("user_profiles")
      .select("plan")
      .eq("id", user.id)
      .single();

    const plan = (profile?.plan ?? "free") as Plan;
    if (!hasCustomization(plan)) {
      return NextResponse.json(
        { error: "Bot settings require Max plan", code: "PLAN_REQUIRED" },
        { status: 403 }
      );
    }

    // Verify ownership
    const { data: bot } = await db
      .from("bots")
      .select("id")
      .eq("id", botId)
      .eq("user_id", user.id)
      .single();

    if (!bot) return NextResponse.json({ error: "Bot not found" }, { status: 404 });

    const updates = await request.json();

    // Allowlist of fields that can be updated
    const allowed = [
      "lead_capture_enabled",
      "lead_fields",
      "lead_capture_title",
      "lead_capture_subtitle",
      "business_hours_enabled",
      "business_hours",
      "away_message",
      "handoff_enabled",
      "handoff_trigger",
      "handoff_message",
      "handoff_email",
      "handoff_phone",
      "handoff_url",
      "suggested_questions",
      "response_length",
      "tone_override",
    ];

    const safeUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const key of allowed) {
      if (key in updates) safeUpdates[key] = updates[key];
    }

    // Upsert
    const { data, error } = await db
      .from("bot_settings")
      .upsert(
        { bot_id: botId, user_id: user.id, ...safeUpdates },
        { onConflict: "bot_id" }
      )
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ settings: data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
