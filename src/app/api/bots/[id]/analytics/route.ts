import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServiceSupabase, getAuthUser } from "@/lib/supabase";

/** GET /api/bots/[id]/analytics — Auth required, owner only */
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

    // Verify ownership
    const { data: bot } = await db
      .from("bots")
      .select("id, user_id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!bot) {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 });
    }

    // Get all sessions for this bot
    const { data: sessions } = await db
      .from("chat_sessions")
      .select("id, created_at")
      .eq("bot_id", id);

    const sessionIds = (sessions || []).map((s) => s.id);
    const total_sessions = sessionIds.length;

    let total_messages = 0;
    let messages_today = 0;
    const messagesPerDay: Record<string, number> = {};

    if (sessionIds.length > 0) {
      const { data: messages } = await db
        .from("messages")
        .select("role, created_at")
        .in("chat_session_id", sessionIds)
        .eq("role", "user")
        .order("created_at", { ascending: true });

      total_messages = (messages || []).length;

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      for (const msg of messages || []) {
        const date = new Date(msg.created_at);
        if (date >= todayStart) messages_today++;
        const dateKey = date.toISOString().split("T")[0];
        messagesPerDay[dateKey] = (messagesPerDay[dateKey] || 0) + 1;
      }
    }

    // Last 14 days chart data (Max plan gets more history)
    const { data: profile } = await db
      .from("user_profiles")
      .select("plan")
      .eq("id", user.id)
      .single();

    const chartDays = profile?.plan === "max" ? 30 : 7;
    const messages_per_day = [];
    for (let i = chartDays - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split("T")[0];
      messages_per_day.push({ date: dateKey, count: messagesPerDay[dateKey] || 0 });
    }

    // Top pages by citation count
    const { data: topPages } = await db
      .from("pages")
      .select("url, title, citation_count")
      .eq("bot_id", id)
      .order("citation_count", { ascending: false })
      .limit(10);

    // Lead count (Max)
    const { count: lead_count } = await db
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("bot_id", id);

    return NextResponse.json({
      messages_today,
      total_messages,
      total_sessions,
      lead_count: lead_count ?? 0,
      top_pages: topPages || [],
      messages_per_day,
      chart_days: chartDays,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
