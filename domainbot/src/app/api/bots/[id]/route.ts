import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";

/** GET /api/bots/[id] — fetch a single bot + its pages */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getServiceSupabase();

    const { data: bot, error } = await db
      .from("bots")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !bot) {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 });
    }

    const { data: pages } = await db
      .from("pages")
      .select("id, url, title, created_at")
      .eq("bot_id", id)
      .order("created_at", { ascending: true });

    return NextResponse.json({ bot, pages: pages || [] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** PATCH /api/bots/[id] — update bot fields */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const db = getServiceSupabase();

    const allowed = ["name", "daily_chat_limit", "status"];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) updates[key] = body[key];
    }

    const { data, error } = await db
      .from("bots")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ bot: data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** DELETE /api/bots/[id] */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getServiceSupabase();

    const { error } = await db.from("bots").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
