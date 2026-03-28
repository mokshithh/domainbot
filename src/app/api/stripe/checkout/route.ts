import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServiceSupabase, getAuthUser } from "@/lib/supabase";
import type { Plan } from "@/lib/plans";

const STRIPE_PRICE_IDS: Record<string, string> = {
  pro: process.env.STRIPE_PRICE_ID_PRO || "",
  max: process.env.STRIPE_PRICE_ID_MAX || "",
};

/**
 * POST /api/stripe/checkout
 *
 * Creates a Stripe Checkout session for plan upgrades.
 * Falls back to immediate DB update if Stripe is not configured (dev/demo mode).
 */
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const user = await getAuthUser(cookieStore);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { plan, returnTo } = await request.json() as { plan: Plan; returnTo?: string };

    if (!plan || !["pro", "max", "free"].includes(plan)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const db = getServiceSupabase();

    // Get current profile
    const { data: profile } = await db
      .from("user_profiles")
      .select("plan, stripe_customer_id, stripe_subscription_id")
      .eq("id", user.id)
      .single();

    const currentPlan = profile?.plan ?? "free";

    // Downgrade to free — cancel subscription
    if (plan === "free") {
      if (profile?.stripe_subscription_id && process.env.STRIPE_SECRET_KEY &&
          !process.env.STRIPE_SECRET_KEY.includes("REPLACE")) {
        const { default: Stripe } = await import("stripe");
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-03-25.dahlia" });
        await stripe.subscriptions.cancel(profile.stripe_subscription_id);
        // Webhook will handle the DB update; return immediately
        return NextResponse.json({ success: true, plan: "free", message: "Subscription cancellation initiated" });
      }
      // No Stripe — direct downgrade
      await db.from("user_profiles")
        .update({ plan: "free", subscription_status: "cancelled", stripe_subscription_id: null })
        .eq("id", user.id);
      return NextResponse.json({ success: true, plan: "free" });
    }

    // Upgrade/change to paid plan
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const priceId = STRIPE_PRICE_IDS[plan];

    // If Stripe is not configured → fall back to immediate upgrade (dev mode)
    if (!stripeKey || stripeKey.includes("REPLACE") || !priceId || priceId.includes("REPLACE")) {
      await db.from("user_profiles")
        .update({ plan, subscription_status: "active" })
        .eq("id", user.id);
      return NextResponse.json({ success: true, plan, demo: true });
    }

    const { default: Stripe } = await import("stripe");
    const stripe = new Stripe(stripeKey, { apiVersion: "2026-03-25.dahlia" });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const successUrl = `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = returnTo ? `${appUrl}${returnTo}` : `${appUrl}/billing/cancelled`;

    // Reuse or create Stripe customer
    let customerId = profile?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
      await db.from("user_profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
    }

    // If user already has a subscription, create a billing portal session to manage it
    if (profile?.stripe_subscription_id && currentPlan !== "free") {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${appUrl}/account`,
      });
      return NextResponse.json({ url: portalSession.url });
    }

    // New subscription checkout
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { user_id: user.id, plan },
      subscription_data: {
        metadata: { user_id: user.id, plan },
      },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[stripe/checkout]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * POST /api/stripe/portal
 * Redirects existing subscribers to Stripe Customer Portal for self-service billing.
 */
export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const user = await getAuthUser(cookieStore);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey || stripeKey.includes("REPLACE")) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
    }

    const db = getServiceSupabase();
    const { data: profile } = await db
      .from("user_profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return NextResponse.json({ error: "No billing account found" }, { status: 404 });
    }

    const { default: Stripe } = await import("stripe");
    const stripe = new Stripe(stripeKey, { apiVersion: "2026-03-25.dahlia" });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${appUrl}/account`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
