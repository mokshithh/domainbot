import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServiceSupabase, getAuthUser } from "@/lib/supabase";

/**
 * POST /api/leads
 * Public: Submit a lead from the chat widget (pre-chat or in-chat).
 * The bot owner receives the lead in their dashboard.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { bot_key, name, email, phone, session_id, notes, source } = body;

    if (!bot_key) {
      return NextResponse.json({ error: "bot_key required" }, { status: 400 });
    }

    const db = getServiceSupabase();

    // Resolve bot → owner
    const { data: bot } = await db
      .from("bots")
      .select("id, user_id")
      .eq("bot_key", bot_key)
      .single();

    if (!bot) return NextResponse.json({ error: "Invalid bot_key" }, { status: 404 });

    // Validate at least one contact field
    if (!name && !email && !phone) {
      return NextResponse.json(
        { error: "At least one of name, email, or phone is required" },
        { status: 400 }
      );
    }

    const { data: lead, error } = await db
      .from("leads")
      .insert({
        bot_id: bot.id,
        user_id: bot.user_id,
        name: name || null,
        email: email || null,
        phone: phone || null,
        session_id: session_id || null,
        notes: notes || null,
        source: source || "chat",
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to save lead" }, { status: 500 });
    }

    return NextResponse.json({ success: true, lead_id: lead.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * GET /api/leads?bot_id=xxx
 * Auth-required: List leads for a bot (Max plan feature).
 */
export async function GET(request: Request) {
  try {
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

    if (profile?.plan !== "max" && profile?.plan !== "pro") {
      return NextResponse.json(
        { error: "Lead management requires Pro or Max plan", code: "PLAN_REQUIRED" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const botId = searchParams.get("bot_id");
    const isExport = searchParams.get("export") === "1";

    // CSV export
    if (isExport) {
      let exportQuery = db
        .from("leads")
        .select("name, email, phone, source, notes, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (botId) exportQuery = exportQuery.eq("bot_id", botId);
      const { data: rows } = await exportQuery;
      const headers = ["Name", "Email", "Phone", "Source", "Notes", "Date"];
      const csvLines = [
        headers.map((h) => `"${h}"`).join(","),
        ...(rows || []).map((r) =>
          [r.name, r.email, r.phone, r.source, r.notes, r.created_at]
            .map((v) => `"${(v ?? "").toString().replace(/"/g, '""')}"`)
            .join(",")
        ),
      ];
      return new Response(csvLines.join("\n"), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="leads-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 500);
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = db
      .from("leads")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (botId) query = query.eq("bot_id", botId);

    const { data: leads, count, error } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ leads: leads || [], total: count ?? 0 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * GET /api/leads/export?bot_id=xxx
 * Export leads as CSV (Max plan).
 */
export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const user = await getAuthUser(cookieStore);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const botId = searchParams.get("bot_id");

    const db = getServiceSupabase();

    const { data: profile } = await db
      .from("user_profiles")
      .select("plan")
      .eq("id", user.id)
      .single();

    if (!["pro", "max"].includes(profile?.plan ?? "")) {
      return NextResponse.json({ error: "Requires Pro or Max plan" }, { status: 403 });
    }

    let query = db
      .from("leads")
      .select("name, email, phone, source, notes, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (botId) query = query.eq("bot_id", botId);
    const { data } = await query;

    const rows = data || [];
    const headers = ["Name", "Email", "Phone", "Source", "Notes", "Date"];
    const csvLines = [
      headers.map((h) => `"${h}"`).join(","),
      ...rows.map((r) =>
        [r.name, r.email, r.phone, r.source, r.notes, r.created_at]
          .map((v) => `"${(v ?? "").toString().replace(/"/g, '""')}"`)
          .join(",")
      ),
    ];

    return new Response(csvLines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="leads-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
