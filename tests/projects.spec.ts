import { test, expect } from "@playwright/test";

test("blueprint project persists owned state", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("ARC// AUTH LINK")).toBeVisible();
  await page.getByLabel("Operator Name").fill("Vanguard");
  await page.getByRole("button", { name: "Link Uplink" }).click();

  await expect(page.getByText("Vanguard")).toBeVisible();

  const firstBlueprint = page.getByRole("button", { name: /Blueprint/i }).first();
  await firstBlueprint.click();
  await expect(firstBlueprint).toHaveAttribute("aria-pressed", "true");

  await page.reload();
  await expect(page.getByText("Vanguard")).toBeVisible();
  await expect(firstBlueprint).toHaveAttribute("aria-pressed", "true");
});
