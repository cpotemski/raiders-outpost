import { expect, test, type Page } from "@playwright/test";
import { login } from "./helpers";

type ExpeditionProgressPayload = {
  activeExpeditionSlug: string | null;
  completedExpeditionSlugs: string[];
};

const getTokenHeader = async (page: Page) => {
  const identity = await page.evaluate(() => {
    return {
      token: localStorage.getItem("arc:identity:token") ?? "",
    };
  });

  return {
    token: identity.token,
  };
};

const loadExpeditionProgress = async (page: Page) => {
  const headers = await getTokenHeader(page);
  const response = await page.request.get("/api/user/expedition/progress", {
    headers: {
      "x-arc-token": headers.token,
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to load expedition progress: ${response.status()}`);
  }

  return (await response.json()) as ExpeditionProgressPayload;
};

test("operator expedition history enforces sequential completion", async ({ page }) => {
  await login(page, `HistoryPilot-${Date.now().toString(36)}`);

  await page.goto("/operator");
  await expect(
    page.getByText(/Scanning expedition index|Scanne Expeditionsindex/)
  ).toBeHidden({ timeout: 15_000 });
  const toggles = page.locator('[data-testid^="expedition-completed-toggle-"]');
  const count = await toggles.count();
  expect(count).toBeGreaterThanOrEqual(2);

  const firstToggle = toggles.nth(0);
  const secondToggle = toggles.nth(1);

  await secondToggle.click();

  await expect(firstToggle).toHaveAttribute("aria-checked", "true");
  await expect(secondToggle).toHaveAttribute("aria-checked", "true");

  const afterSecond = await loadExpeditionProgress(page);
  expect(afterSecond.completedExpeditionSlugs.length).toBeGreaterThanOrEqual(2);

  await firstToggle.click();

  await expect(firstToggle).toHaveAttribute("aria-checked", "false");
  await expect(secondToggle).toHaveAttribute("aria-checked", "false");

  const afterReset = await loadExpeditionProgress(page);
  expect(afterReset.completedExpeditionSlugs).toEqual([]);
});
