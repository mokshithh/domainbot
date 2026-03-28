/**
 * scripts/setup-stripe.mjs
 *
 * Creates DomainBot Pro + Max products/prices in Stripe test mode.
 * Run once: node scripts/setup-stripe.mjs
 *
 * Prerequisites:
 *   1. Set STRIPE_SECRET_KEY in .env.local (starts with sk_test_...)
 *   2. npm install (stripe already in package.json)
 */

import Stripe from "stripe";
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");

// Read current env
let envContent = readFileSync(envPath, "utf-8");
const keyMatch = envContent.match(/STRIPE_SECRET_KEY="?([^"\n]+)"?/);
const secretKey = keyMatch?.[1];

if (!secretKey || secretKey === "sk_test_REPLACE_ME") {
  console.error(
    "❌ Set STRIPE_SECRET_KEY in .env.local before running this script.\n" +
    "   Get it from: https://dashboard.stripe.com/test/apikeys"
  );
  process.exit(1);
}

const stripe = new Stripe(secretKey, { apiVersion: "2024-06-20" });

async function createOrFindProduct(name, description) {
  const existing = await stripe.products.search({
    query: `name:'${name}' AND active:'true'`,
    limit: 1,
  });
  if (existing.data.length > 0) {
    console.log(`  ✓ Product already exists: ${name} (${existing.data[0].id})`);
    return existing.data[0];
  }
  const product = await stripe.products.create({ name, description });
  console.log(`  ✓ Created product: ${name} (${product.id})`);
  return product;
}

async function createPrice(productId, unitAmount, nickname) {
  const price = await stripe.prices.create({
    product: productId,
    unit_amount: unitAmount,
    currency: "usd",
    recurring: { interval: "month" },
    nickname,
  });
  console.log(`  ✓ Created price: ${nickname} → $${unitAmount / 100}/mo (${price.id})`);
  return price;
}

async function main() {
  console.log("\n🚀 DomainBot Stripe Setup\n");

  const pro = await createOrFindProduct(
    "DomainBot Pro",
    "500 chats/day, file uploads, 10 bots"
  );
  const max = await createOrFindProduct(
    "DomainBot Max",
    "Unlimited chats, full customization, unlimited bots"
  );

  const proPrice = await createPrice(pro.id, 2000, "DomainBot Pro Monthly");
  const maxPrice = await createPrice(max.id, 4500, "DomainBot Max Monthly");

  // Patch .env.local with the new price IDs
  envContent = envContent
    .replace(/STRIPE_PRICE_ID_PRO=.*/, `STRIPE_PRICE_ID_PRO=${proPrice.id}`)
    .replace(/STRIPE_PRICE_ID_MAX=.*/, `STRIPE_PRICE_ID_MAX=${maxPrice.id}`);
  writeFileSync(envPath, envContent, "utf-8");

  console.log(`\n✅ .env.local updated with price IDs.\n`);
  console.log("Next steps:");
  console.log("  1. Set up your webhook endpoint in Stripe Dashboard:");
  console.log("     https://dashboard.stripe.com/test/webhooks");
  console.log("     URL: https://<your-domain>/api/stripe/webhook");
  console.log("     Events: checkout.session.completed, customer.subscription.updated,");
  console.log("             customer.subscription.deleted, invoice.paid, invoice.payment_failed");
  console.log("  2. Copy the webhook signing secret to STRIPE_WEBHOOK_SECRET in .env.local");
  console.log("  3. For local testing, use Stripe CLI:");
  console.log("     stripe listen --forward-to localhost:3000/api/stripe/webhook");
  console.log("\nPrice IDs created:");
  console.log(`  Pro:  ${proPrice.id}`);
  console.log(`  Max:  ${maxPrice.id}`);
}

main().catch((err) => {
  console.error("❌ Setup failed:", err.message);
  process.exit(1);
});
