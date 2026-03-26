import { test, expect } from "@playwright/test";

test.describe("Landing page", () => {
  test("loads and shows hero", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/DomainBot/);
    await expect(page.getByText("smart AI chatbot")).toBeVisible();
  });

  test("has working nav links", async ({ page }) => {
    await page.goto("/");
    // Use first() — two Dashboard links exist (nav + hero button)
    await page.getByRole("link", { name: "Dashboard" }).first().click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("Get Started button goes to new bot page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Get Started Free" }).click();
    await expect(page).toHaveURL(/\/bots\/new/);
  });

  test("shows pricing section", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Simple pricing")).toBeVisible();
    await expect(page.getByText("Starter")).toBeVisible();
    // Use exact match to avoid matching "Everything in Pro"
    await expect(page.getByText("Pro", { exact: true })).toBeVisible();
    await expect(page.getByText("Business")).toBeVisible();
  });
});
