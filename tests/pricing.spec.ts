import { test, expect } from "@playwright/test";

test.describe("Landing page pricing section", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("shows correct plan names in pricing section", async ({ page }) => {
    const section = page.locator("#pricing");
    await expect(section.getByRole("heading", { name: "Free", exact: true })).toBeVisible();
    await expect(section.getByRole("heading", { name: "Pro", exact: true })).toBeVisible();
    await expect(section.getByRole("heading", { name: "Max", exact: true })).toBeVisible();
  });

  test("shows monthly/yearly toggle in pricing section", async ({ page }) => {
    const section = page.locator("#pricing");
    await expect(section.getByRole("button", { name: "Monthly" })).toBeVisible();
    await expect(section.getByRole("button", { name: /Yearly/ })).toBeVisible();
  });

  test("yearly toggle switches billing period label", async ({ page }) => {
    const section = page.locator("#pricing");
    await expect(section.getByText("/month").first()).toBeVisible();

    await section.getByRole("button", { name: /Yearly/ }).click();

    await expect(section.getByText("/year").first()).toBeVisible();
    await expect(section.getByText("/month").first()).not.toBeVisible();
  });

  test("nav has Pricing anchor link", async ({ page }) => {
    const link = page.getByRole("navigation").getByRole("link", { name: "Pricing" });
    await expect(link).toHaveAttribute("href", "#pricing");
  });
});

test.describe("/pricing redirect", () => {
  test("redirects to /#pricing", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page).toHaveURL(/\/#pricing$/);
    // Pricing section should be visible after redirect
    await expect(page.locator("#pricing")).toBeVisible();
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
