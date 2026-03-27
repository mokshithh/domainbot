import { test, expect } from "@playwright/test";

test.describe("Landing page pricing section", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("shows correct plan names", async ({ page }) => {
    const section = page.locator("section").filter({ hasText: "Simple pricing" });
    await expect(section.getByText("Free", { exact: true }).first()).toBeVisible();
    await expect(section.getByText("Pro", { exact: true }).first()).toBeVisible();
    await expect(section.getByText("Max", { exact: true }).first()).toBeVisible();
  });

  test("shows correct prices", async ({ page }) => {
    const section = page.locator("section").filter({ hasText: "Simple pricing" });
    await expect(section.getByText("$0")).toBeVisible();
    await expect(section.getByText("$20")).toBeVisible();
    await expect(section.getByText("$45")).toBeVisible();
  });

  test("Free plan CTA links to /bots/new", async ({ page }) => {
    const section = page.locator("section").filter({ hasText: "Simple pricing" });
    const cta = section.getByRole("link", { name: "Get started free" });
    await expect(cta).toHaveAttribute("href", "/bots/new");
  });

  test("Pro and Max CTAs link to /pricing", async ({ page }) => {
    const section = page.locator("section").filter({ hasText: "Simple pricing" });
    const links = section.getByRole("link", { name: "See pricing" });
    await expect(links).toHaveCount(2);
    for (const link of await links.all()) {
      await expect(link).toHaveAttribute("href", "/pricing");
    }
  });
});

test.describe("/pricing page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/pricing");
  });

  test("renders without errors", async ({ page }) => {
    await expect(page).not.toHaveTitle(/error/i);
    await expect(page.locator("body")).not.toContainText("Application error");
  });

  test("shows all three plan card headings", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Free", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Pro", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Max", exact: true })).toBeVisible();
  });

  test("shows monthly/yearly toggle", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Monthly" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Yearly/ })).toBeVisible();
  });

  test("yearly toggle switches billing period label", async ({ page }) => {
    // Monthly period label should be visible
    await expect(page.getByText("/month").first()).toBeVisible();

    // Switch to yearly
    await page.getByRole("button", { name: /Yearly/ }).click();

    // Period label changes to /year
    await expect(page.getByText("/year").first()).toBeVisible();
    await expect(page.getByText("/month").first()).not.toBeVisible();
  });
});

test.describe("Bot limit enforcement (API)", () => {
  test("POST /api/bots returns 401 without auth", async ({ request }) => {
    const res = await request.post("/api/bots", {
      data: { name: "Test Bot", allowed_domain: "example.com" },
    });
    expect(res.status()).toBe(401);
  });

  test("POST /api/bots returns error property on unauthorized", async ({ request }) => {
    const res = await request.post("/api/bots", {
      data: { name: "Test Bot", allowed_domain: "example.com" },
    });
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });
});
