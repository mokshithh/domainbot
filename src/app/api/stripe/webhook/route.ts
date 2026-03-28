import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";

const STRIPE_API_VERSION = "2026-03-25.dahlia" as const;

/**
 * POST /api/stripe/webhook
 *
 * Handles Stripe webhook events. Verifies signature using STRIPE_WEBHOOK_SECRET.
 *
 * Events handled:
 *   checkout.session.completed    → activate plan
 *   customer.subscription.updated → sync plan & status
 *   customer.subscription.deleted → downgrade to free
 *   invoice.paid                  → ensure plan is active
 *   invoice.payment_failed        → mark past_due
 */
export async function POST(request: Request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  // If Stripe is not configured, accept gracefully (dev/demo mode)
  if (!stripeKey || stripeKey.includes("REPLACE")) {
    return NextResponse.json({ received: true, note: "stripe_not_configured" });
  }

  const { default: Stripe } = await import("stripe");
  const stripe = new Stripe(stripeKey, { apiVersion: STRIPE_API_VERSION });

  const sig = request.headers.get("stripe-signature");
  const rawBody = await request.text();

  let event: import("stripe").Stripe.Event;

  try {
    if (!sig || !webhookSecret || webhookSecret.includes("REPLACE")) {
      // Dev: parse without signature verification
      event = JSON.parse(rawBody) as import("stripe").Stripe.Event;
    } else {
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Webhook error";
    console.error("[webhook] signature verification failed:", msg);
    return NextResponse.json({ error: `Webhook Error: ${msg}` }, { status: 400 });
  }

  const db = getServiceSupabase();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as import("stripe").Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const plan = session.metadata?.plan as "pro" | "max" | undefined;

        if (!userId || !plan) {
          console.error("[webhook] checkout.session.completed missing metadata:", session.id);
          break;
        }

        await db.from("user_profiles").update({
          plan,
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
          subscription_status: "active",
          subscription_end_date: null,
        }).eq("id", userId);

        console.log(`[webhook] ✓ User ${userId} upgraded to ${plan}`);
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as import("stripe").Stripe.Subscription;
        const userId = sub.metadata?.user_id;
        const plan = (sub.metadata?.plan as "pro" | "max") || await resolvePlanFromSubscription(stripe, sub);

        const statusMap: Record<string, string> = {
          active: "active",
          past_due: "past_due",
          unpaid: "past_due",
          canceled: "cancelled",
          trialing: "active",
          paused: "paused",
        };
        const mappedStatus = statusMap[sub.status] || sub.status;
        // Use cancel_at if available as end date, otherwise null
        const endDate = sub.cancel_at
          ? new Date(sub.cancel_at * 1000).toISOString()
          : null;

        const update = {
          plan: ["past_due", "cancelled", "paused"].includes(mappedStatus) ? "free" : (plan || "free"),
          subscription_status: mappedStatus,
          subscription_end_date: endDate,
        };

        if (userId) {
          await db.from("user_profiles").update(update).eq("id", userId);
        } else {
          await db.from("user_profiles").update(update).eq("stripe_customer_id", sub.customer as string);
        }

        console.log(`[webhook] ✓ Subscription updated: ${sub.id} → status=${mappedStatus}`);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as import("stripe").Stripe.Subscription;
        const userId = sub.metadata?.user_id;

        const update = {
          plan: "free",
          subscription_status: "cancelled",
          stripe_subscription_id: null,
          subscription_end_date: null,
        };

        if (userId) {
          await db.from("user_profiles").update(update).eq("id", userId);
        } else {
          await db.from("user_profiles").update(update).eq("stripe_customer_id", sub.customer as string);
        }

        console.log(`[webhook] ✓ Subscription cancelled: ${sub.id}`);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as import("stripe").Stripe.Invoice;
        await db.from("user_profiles")
          .update({ subscription_status: "active" })
          .eq("stripe_customer_id", invoice.customer as string)
          .neq("plan", "free");

        console.log(`[webhook] ✓ Invoice paid: ${invoice.id}`);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as import("stripe").Stripe.Invoice;
        await db.from("user_profiles")
          .update({ subscription_status: "past_due" })
          .eq("stripe_customer_id", invoice.customer as string);

        console.log(`[webhook] ⚠ Payment failed for customer: ${invoice.customer}`);
        break;
      }

      default:
        break;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Handler error";
    console.error(`[webhook] handler error for ${event.type}:`, msg);
    // Return 200 to prevent Stripe from retrying
  }

  return NextResponse.json({ received: true });
}

async function resolvePlanFromSubscription(
  stripe: import("stripe").Stripe,
  sub: import("stripe").Stripe.Subscription
): Promise<"pro" | "max" | null> {
  try {
    const priceId = sub.items.data[0]?.price?.id;
    if (!priceId) return null;

    if (priceId === process.env.STRIPE_PRICE_ID_PRO) return "pro";
    if (priceId === process.env.STRIPE_PRICE_ID_MAX) return "max";

    const price = await stripe.prices.retrieve(priceId);
    const nick = (price.nickname || "").toLowerCase();
    if (nick.includes("pro")) return "pro";
    if (nick.includes("max")) return "max";

    return null;
  } catch {
    return null;
  }
}
