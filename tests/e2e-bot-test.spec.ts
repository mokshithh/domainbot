import { test, expect } from "@playwright/test";

/**
 * Full end-to-end: use existing ready bot, chat with it, verify response.
 * Bot: "E2E Test Bot" (quotes.toscrape.com) — already crawled and ready.
 *
 * Run with: npx playwright test e2e-bot-test --headed
 */

const READY_BOT_ID = "82a7c075-663d-4857-8c46-2e1045fe1b09";

test("chat with ready bot via UI", async ({ page }) => {
  test.setTimeout(60_000);

  // ── 1. Open the bot detail page ───────────────────────────────────────────
  await page.goto(`/bots/${READY_BOT_ID}`);
  await expect(page.getByRole("heading", { name: "E2E Test Bot" })).toBeVisible({ timeout: 10_000 });
  console.log("Bot page loaded");

  // ── 2. Test Chat tab should be visible (bot is ready) ────────────────────
  const chatTab = page.getByRole("tab", { name: /Test Chat/i });
  await expect(chatTab).toBeVisible({ timeout: 10_000 });
  await chatTab.click();
  console.log("Switched to Test Chat tab");

  // ── 3. Verify the initial greeting is shown ───────────────────────────────
  await expect(page.getByText(/ready to answer questions/i)).toBeVisible({ timeout: 5_000 });

  // ── 4. Send a message ─────────────────────────────────────────────────────
  const input = page.getByPlaceholder(/ask a question/i);
  await expect(input).toBeVisible();
  await input.fill("What kind of quotes are on this website?");
  await page.keyboard.press("Enter");
  console.log("Message sent, waiting for streaming response…");

  // ── 5. Wait for assistant response to appear and finish streaming ─────────
  // The streaming cursor (<span style="animation: blink..."/>) disappears when done
  await expect(async () => {
    const allText = await page.locator("body").textContent();
    // Response should mention quotes/authors
    expect(allText).toMatch(/quote|author|inspiration|philosophy/i);
    // The streaming dots should be gone (no "thinking" animation visible)
    const thinkingDots = page.locator("span[style*='thinking']");
    const dotCount = await thinkingDots.count();
    expect(dotCount).toBe(0);
  }).toPass({ timeout: 30_000, intervals: [1_500] });

  console.log("Streaming response received!");

  // ── 6. Verify citation pills appeared ─────────────────────────────────────
  await expect(page.locator("a[href*='quotes.toscrape.com']").first()).toBeVisible({ timeout: 10_000 });
  console.log("Citations visible");

  // ── 7. Send a follow-up to test session continuity ────────────────────────
  await input.fill("Who wrote them?");
  await page.keyboard.press("Enter");

  await expect(async () => {
    // Page should now mention at least one author name
    const allText = await page.locator("body").textContent();
    expect(allText).toMatch(/Einstein|Twain|Rowling|Seuss|Monroe|Shakespeare/i);
    const thinkingDots = page.locator("span[style*='thinking']");
    expect(await thinkingDots.count()).toBe(0);
  }).toPass({ timeout: 30_000, intervals: [1_500] });

  console.log("Follow-up response received!");

  // ── 8. Screenshot ──────────────────────────────────────────────────────────
  await page.screenshot({ path: "test-results/e2e-bot-chat.png", fullPage: false });
  console.log("Screenshot saved: test-results/e2e-bot-chat.png");
});
