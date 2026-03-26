import { test, expect } from "@playwright/test";

test.describe("App navigation", () => {
  test("dashboard page loads", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  });

  test("bots page loads", async ({ page }) => {
    await page.goto("/bots");
    await expect(page.getByRole("heading", { name: "Your Bots" })).toBeVisible();
  });

  test("new bot page loads and shows form", async ({ page }) => {
    await page.goto("/bots/new");
    await expect(page.getByRole("heading", { name: "Create a new bot" })).toBeVisible();
    await expect(page.getByPlaceholder("e.g. Acme Support Bot")).toBeVisible();
    await expect(page.getByPlaceholder(/example\.com/)).toBeVisible();
  });

  test("sidebar is visible on dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByText("DomainBot").first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Bots" })).toBeVisible();
  });

  test("new bot form shows error when fields are blank", async ({ page }) => {
    await page.goto("/bots/new");
    // Use whitespace — passes HTML5 `required` but fails JS .trim() check
    await page.getByPlaceholder("e.g. Acme Support Bot").fill("   ");
    await page.getByPlaceholder(/example\.com/).fill("   ");
    await page.getByRole("button", { name: /Create Bot/ }).click();
    await expect(page.getByText(/required/i)).toBeVisible();
  });
});
