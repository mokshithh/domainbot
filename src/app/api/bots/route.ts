import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServiceSupabase, getAuthUser } from "@/lib/supabase";
import { generateBotKey } from "@/lib/utils";
import { PLANS } from "@/lib/plans";

/** GET /api/bots — list bots for the authenticated user */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const user = await getAuthUser(cookieStore);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getServiceSupabase();
    const { data, error } = await db
      .from("bots")
      .select("*")
      .eq("user_id", user.id)
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
    const cookieStore = await cookies();
    const user = await getAuthUser(cookieStore);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getServiceSupabase();

    // Get user's plan
    const { data: profile } = await db
      .from("user_profiles")
      .select("plan")
      .eq("id", user.id)
      .single();

    const plan = (profile?.plan ?? "free") as "free" | "pro" | "max";
    const planConfig = PLANS[plan];

    // Check bot count limit
    if (planConfig.maxBots !== Infinity) {
      const { count } = await db
        .from("bots")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      if ((count ?? 0) >= planConfig.maxBots) {
        return NextResponse.json(
          {
            error: `Your ${planConfig.label} plan allows up to ${planConfig.maxBots} bot${planConfig.maxBots === 1 ? "" : "s"}. Upgrade to create more.`,
            code: "BOT_LIMIT_REACHED",
          },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const { name, allowed_domain } = body;

    if (!name || !allowed_domain) {
      return NextResponse.json(
        { error: "name and allowed_domain are required" },
        { status: 400 }
      );
    }

    const bot_key = generateBotKey();

    const { data, error } = await db
      .from("bots")
      .insert({
        name: name.trim(),
        bot_key,
        allowed_domain: allowed_domain.trim().toLowerCase(),
        status: "pending",
        daily_chat_count: 0,
        user_id: user.id,
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
