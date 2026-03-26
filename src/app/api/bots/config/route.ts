import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";

/** GET /api/bots/config?bot_key=xxx — public endpoint for widget config */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bot_key = searchParams.get("bot_key");

    if (!bot_key) {
      return NextResponse.json({ error: "bot_key required" }, { status: 400 });
    }

    const db = getServiceSupabase();

    const { data: bot } = await db
      .from("bots")
      .select("bot_name_display, primary_color, welcome_message, allowed_domain, status")
      .eq("bot_key", bot_key)
      .single();

    if (!bot) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      bot_name_display: bot.bot_name_display || null,
      primary_color: bot.primary_color || "#06b6d4",
      welcome_message: bot.welcome_message || null,
      allowed_domain: bot.allowed_domain,
      status: bot.status,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
