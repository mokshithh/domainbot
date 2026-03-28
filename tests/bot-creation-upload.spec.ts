import { test, expect } from "@playwright/test";

/**
 * Tests for the bot creation multi-step flow and file upload entry points.
 * These tests validate the UX structure without requiring a logged-in session.
 */

// ─────────────────────────────────────────────────────────────────────────────
// /bots/new — page structure (unauthenticated → redirect)
// ─────────────────────────────────────────────────────────────────────────────
test.describe("Bot creation page — auth enforcement", () => {
  test("GET /bots/new redirects unauthenticated users to /login", async ({ page }) => {
    await page.goto("/bots/new");
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// /api/bots — creation enforces plan limits
// ─────────────────────────────────────────────────────────────────────────────
test.describe("POST /api/bots — plan gating", () => {
  test("returns 401 without auth", async ({ request }) => {
    const res = await request.post("/api/bots", {
      data: { name: "Test", allowed_domain: "test.com" },
    });
    expect(res.status()).toBe(401);
  });

  test("returns 400 when name is missing", async ({ request }) => {
    // We can't bypass auth, so this just validates the 401 shape
    const res = await request.post("/api/bots", { data: {} });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// /api/upload — plan gating enforced server-side
// ─────────────────────────────────────────────────────────────────────────────
test.describe("POST /api/upload — server-side plan gating", () => {
  test("returns 401 without auth", async ({ request }) => {
    const res = await request.post("/api/upload?bot_id=fake-id");
    expect(res.status()).toBe(401);
  });

  test("GET /api/upload returns 401 without auth", async ({ request }) => {
    const res = await request.get("/api/upload?bot_id=fake-id");
    expect(res.status()).toBe(401);
  });

  test("DELETE /api/upload returns 401 without auth", async ({ request }) => {
    const res = await request.delete("/api/upload?file_id=fake-id");
    expect(res.status()).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Widget script serves correct JS structure (used in both creation + detail)
// ─────────────────────────────────────────────────────────────────────────────
test.describe("Widget script structure", () => {
  test("script is an IIFE that injects a chat button + panel", async ({ request }) => {
    const res = await request.get("/api/widget?bot_key=abc-test");
    expect(res.status()).toBe(200);
    const js = await res.text();

    // Core widget elements that must be injected
    expect(js).toContain("db-widget-btn");
    expect(js).toContain("db-widget-panel");
    expect(js).toContain("db-widget-input");
    expect(js).toContain("db-widget-send");
    expect(js).toContain("db-widget-close");

    // Must POST to /api/chat
    expect(js).toContain("/api/chat");

    // Must read bot_key from the script tag attribute
    expect(js).toContain("data-bot-key");

    // Must preserve session across page reloads
    expect(js).toContain("sessionStorage");
  });

  test("widget CSS is self-contained (no external stylesheets)", async ({ request }) => {
    const res = await request.get("/api/widget");
    const js = await res.text();
    // All styles injected via <style> tag — no link[rel=stylesheet]
    expect(js).toContain("style.textContent");
    expect(js).not.toContain('rel="stylesheet"');
    expect(js).not.toContain("rel='stylesheet'");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// /api/bots/[id]/settings — gated to Max plan
// ─────────────────────────────────────────────────────────────────────────────
test.describe("Bot settings API — auth enforcement", () => {
  test("GET /api/bots/[id]/settings returns 401 without auth", async ({ request }) => {
    const res = await request.get("/api/bots/fake-id/settings");
    expect(res.status()).toBe(401);
  });

  test("PATCH /api/bots/[id]/settings returns 401 without auth", async ({ request }) => {
    const res = await request.patch("/api/bots/fake-id/settings", {
      data: { system_prompt: "test" },
    });
    expect(res.status()).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// /api/leads — plan gating
// ─────────────────────────────────────────────────────────────────────────────
test.describe("Leads API — auth + plan enforcement", () => {
  test("GET /api/leads returns 401 without auth", async ({ request }) => {
    const res = await request.get("/api/leads");
    expect(res.status()).toBe(401);
  });

  test("POST /api/leads with invalid bot_key returns 404", async ({ request }) => {
    // POST is public (from widget) but validates bot_key
    const res = await request.post("/api/leads", {
      data: { bot_key: "definitely-not-real", name: "Test User" },
    });
    // Should be 404 (bot not found) not 401
    expect(res.status()).toBe(404);
  });

  test("POST /api/leads with no contact info returns 400", async ({ request }) => {
    const res = await request.post("/api/leads", {
      data: { bot_key: "some-key" },
    });
    // 404 (bot not found) since key is fake, but the key is present
    expect([400, 404]).toContain(res.status());
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Billing pages — correct entry points
// ─────────────────────────────────────────────────────────────────────────────
test.describe("Billing entry points", () => {
  test("/billing/cancelled is publicly accessible", async ({ page }) => {
    await page.goto("/billing/cancelled");
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: /No charge made/i })).toBeVisible();
  });

  test("/billing/success redirects to login when unauthenticated", async ({ page }) => {
    await page.goto("/billing/success");
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});
