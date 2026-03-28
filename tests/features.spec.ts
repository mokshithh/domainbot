import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import * as http from "http";

// ─────────────────────────────────────────────────────────────────────────────
// API auth enforcement tests (no login required)
// ─────────────────────────────────────────────────────────────────────────────
test.describe("API auth enforcement", () => {
  test("POST /api/bots → 401 without auth", async ({ request }) => {
    const res = await request.post("/api/bots", {
      data: { name: "X", allowed_domain: "x.com" },
    });
    expect(res.status()).toBe(401);
    expect((await res.json()).error).toBeTruthy();
  });

  test("POST /api/stripe/checkout → 401 without auth", async ({ request }) => {
    const res = await request.post("/api/stripe/checkout", {
      data: { plan: "pro" },
    });
    expect(res.status()).toBe(401);
  });

  test("GET /api/leads → 401 without auth", async ({ request }) => {
    const res = await request.get("/api/leads");
    expect(res.status()).toBe(401);
  });

  test("POST /api/upload → 401 without auth", async ({ request }) => {
    const res = await request.post("/api/upload?bot_id=fake");
    expect(res.status()).toBe(401);
  });

  test("GET /api/bots → 401 without auth", async ({ request }) => {
    const res = await request.get("/api/bots");
    expect(res.status()).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Widget API
// ─────────────────────────────────────────────────────────────────────────────
test.describe("Widget script API (/api/widget)", () => {
  test("GET /api/widget returns valid JavaScript", async ({ request }) => {
    const res = await request.get("/api/widget?bot_key=test-key-123");
    expect(res.status()).toBe(200);
    const ct = res.headers()["content-type"];
    expect(ct).toContain("javascript");
    const body = await res.text();
    // Must be an IIFE
    expect(body).toContain("(function");
    // Must reference BOT_KEY
    expect(body).toContain("BOT_KEY");
    // Must build the widget button
    expect(body).toContain("db-widget-btn");
    // Must make chat requests
    expect(body).toContain("/api/chat");
  });

  test("GET /api/widget includes data-bot-key attribute reading", async ({ request }) => {
    const res = await request.get("/api/widget");
    const body = await res.text();
    expect(body).toContain("data-bot-key");
  });

  test("GET /api/widget has CORS header", async ({ request }) => {
    const res = await request.get("/api/widget");
    expect(res.headers()["access-control-allow-origin"]).toBe("*");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Widget embed test — simulates pasting 3 lines onto an external website
// serial: prevents port conflict when Playwright runs workers in parallel
// ─────────────────────────────────────────────────────────────────────────────
test.describe.serial("Widget embed — external website simulation", () => {
  let server: http.Server;
  let externalUrl: string;

  test.beforeAll(async () => {
    // Spin up a minimal HTTP server serving a plain HTML page that embeds the widget
    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>ACME Corp</title></head>
<body>
  <h1>Welcome to ACME Corp</h1>
  <p>This is a third-party website that has embedded the DomainBot widget.</p>

  <!-- The 3 lines a user would paste onto their website -->
  <script
    src="http://localhost:3000/api/widget"
    data-bot-key="test-embed-key"
    defer
  ></script>
</body>
</html>`;

    server = http.createServer((req, res) => {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(html);
    });

    await new Promise<void>((resolve) => server.listen(9999, resolve));
    externalUrl = "http://localhost:9999";
  });

  test.afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  test("widget button appears on external page after script loads", async ({ page }) => {
    await page.goto(externalUrl);

    // The page content should be visible
    await expect(page.locator("h1")).toHaveText("Welcome to ACME Corp");

    // Widget script loads from localhost:3000 — wait for the button to appear
    const widgetBtn = page.locator("#db-widget-btn");
    await expect(widgetBtn).toBeVisible({ timeout: 15_000 });

    // Button should be fixed-position in the bottom-right corner
    const box = await widgetBtn.boundingBox();
    expect(box).not.toBeNull();
    console.log("Widget button position:", box);
  });

  test("clicking widget button opens chat panel", async ({ page }) => {
    await page.goto(externalUrl);

    const widgetBtn = page.locator("#db-widget-btn");
    await expect(widgetBtn).toBeVisible({ timeout: 15_000 });

    // Panel should be hidden initially
    const panel = page.locator("#db-widget-panel");
    await expect(panel).not.toHaveClass(/db-open/);

    // Click to open
    await widgetBtn.click();
    await expect(panel).toHaveClass(/db-open/, { timeout: 5_000 });

    // Panel should show the chat header
    await expect(page.locator("#db-widget-header")).toBeVisible();
    await expect(page.locator("#db-widget-input")).toBeVisible();
    await expect(page.locator("#db-widget-send")).toBeVisible();
    console.log("Chat panel opened successfully");
  });

  test("widget panel can be closed", async ({ page }) => {
    await page.goto(externalUrl);

    const widgetBtn = page.locator("#db-widget-btn");
    await expect(widgetBtn).toBeVisible({ timeout: 15_000 });

    await widgetBtn.click();
    const panel = page.locator("#db-widget-panel");
    await expect(panel).toHaveClass(/db-open/);

    // Close via the X button
    await page.locator("#db-widget-close").click();
    await expect(panel).not.toHaveClass(/db-open/);
    console.log("Chat panel closed successfully");
  });

  test("widget panel shows 'Powered by DomainBot' branding", async ({ page }) => {
    await page.goto(externalUrl);
    await page.locator("#db-widget-btn").waitFor({ state: "visible", timeout: 15_000 });
    await page.locator("#db-widget-btn").click();
    await expect(page.locator("#db-powered")).toBeVisible();
    await expect(page.locator("#db-powered")).toContainText("DomainBot");
    console.log("DomainBot branding visible in widget");
  });

  test("widget input accepts text", async ({ page }) => {
    await page.goto(externalUrl);
    await page.locator("#db-widget-btn").waitFor({ state: "visible", timeout: 15_000 });
    await page.locator("#db-widget-btn").click();

    const input = page.locator("#db-widget-input");
    await expect(input).toBeVisible();
    await input.fill("Hello, can you help me?");
    await expect(input).toHaveValue("Hello, can you help me?");
    console.log("Widget input accepts text");
  });

  test("screenshot of widget embedded on external site", async ({ page }) => {
    await page.goto(externalUrl);
    await page.locator("#db-widget-btn").waitFor({ state: "visible", timeout: 15_000 });

    // Screenshot with widget closed
    await page.screenshot({ path: "test-results/widget-embed-closed.png", fullPage: true });

    // Open and screenshot
    await page.locator("#db-widget-btn").click();
    await expect(page.locator("#db-widget-panel")).toHaveClass(/db-open/);
    await page.screenshot({ path: "test-results/widget-embed-open.png", fullPage: true });
    console.log("Screenshots saved: widget-embed-closed.png, widget-embed-open.png");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Landing page
// ─────────────────────────────────────────────────────────────────────────────
test.describe("Landing page", () => {
  test("loads and shows hero", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 10_000 });
  });

  test("pricing section is on the same page (no separate tab)", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#pricing")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("#pricing").getByRole("heading", { name: "Free", exact: true })).toBeVisible();
    await expect(page.locator("#pricing").getByRole("heading", { name: "Pro", exact: true })).toBeVisible();
    await expect(page.locator("#pricing").getByRole("heading", { name: "Max", exact: true })).toBeVisible();
  });

  test("monthly/yearly toggle works", async ({ page }) => {
    await page.goto("/");
    const section = page.locator("#pricing");
    await expect(section.getByText("/month").first()).toBeVisible({ timeout: 10_000 });
    await section.getByRole("button", { name: /Yearly/ }).click();
    await expect(section.getByText("/year").first()).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Auth redirect enforcement
// ─────────────────────────────────────────────────────────────────────────────
test.describe("Auth redirect enforcement", () => {
  for (const route of ["/dashboard", "/bots", "/account", "/leads"]) {
    test(`${route} redirects unauthenticated users to /login`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Billing pages
// ─────────────────────────────────────────────────────────────────────────────
test.describe("Billing pages", () => {
  test("/billing/cancelled renders without auth (public page)", async ({ page }) => {
    await page.goto("/billing/cancelled");
    // Should NOT redirect to login (billing/cancelled is public)
    await expect(page).not.toHaveURL(/\/login/, { timeout: 5_000 });
    await expect(page.getByRole("heading", { name: /No charge made/i })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("link", { name: /Try Again/i })).toBeVisible();
  });

  test("/pricing redirects to /#pricing", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page).toHaveURL(/\/#pricing$/, { timeout: 10_000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Stripe webhook (no Stripe configured → graceful accept)
// ─────────────────────────────────────────────────────────────────────────────
test.describe("Stripe webhook graceful handling", () => {
  test("POST /api/stripe/webhook returns 200 in dev mode", async ({ request }) => {
    // In dev/demo mode (no STRIPE_SECRET_KEY configured), webhook should accept gracefully
    const res = await request.post("/api/stripe/webhook", {
      data: JSON.stringify({ type: "test.event", data: { object: {} } }),
      headers: { "Content-Type": "application/json" },
    });
    // Should return 200 (either stripe_not_configured or processed)
    expect(res.status()).toBe(200);
  });
});
