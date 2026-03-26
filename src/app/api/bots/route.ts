import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { generateBotKey } from "@/lib/utils";

/** GET /api/bots — list all bots */
export async function GET() {
  try {
    const db = getServiceSupabase();
    const { data, error } = await db
      .from("bots")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ bots: data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** POST /api/bots — create a new bot */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, allowed_domain, daily_chat_limit } = body;

    if (!name || !allowed_domain) {
      return NextResponse.json(
        { error: "name and allowed_domain are required" },
        { status: 400 }
      );
    }

    const bot_key = generateBotKey();
    const db = getServiceSupabase();

    const { data, error } = await db
      .from("bots")
      .insert({
        name: name.trim(),
        bot_key,
        allowed_domain: allowed_domain.trim().toLowerCase(),
        status: "pending",
        daily_chat_limit: daily_chat_limit || 100,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ bot: data }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
