import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServiceSupabase, getAuthUser } from "@/lib/supabase";

async function verifyOwnership(botId: string, userId: string) {
  const db = getServiceSupabase();
  const { data: bot } = await db
    .from("bots")
    .select("id, user_id")
    .eq("id", botId)
    .single();
  return bot?.user_id === userId ? bot : null;
}

/** GET /api/bots/[id] — fetch a single bot + its pages */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const user = await getAuthUser(cookieStore);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = getServiceSupabase();

    const { data: bot, error } = await db
      .from("bots")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
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
    const cookieStore = await cookies();
    const user = await getAuthUser(cookieStore);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const owned = await verifyOwnership(id, user.id);
    if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await request.json();
    const db = getServiceSupabase();

    const allowed = [
      "name", "status", "welcome_message", "primary_color", "bot_name_display",
      // Max-plan customization fields (enforced on read, not write, for simplicity)
      "system_prompt", "avatar_url", "remove_branding", "custom_css", "bot_personality",
    ];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) updates[key] = body[key];
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
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
    const cookieStore = await cookies();
    const user = await getAuthUser(cookieStore);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const owned = await verifyOwnership(id, user.id);
    if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const db = getServiceSupabase();
    const { error } = await db.from("bots").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
