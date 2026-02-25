import { expect, test } from "@playwright/test";
import {
  findAdjustableTile,
  getTileQuantity,
  login,
  openProject,
} from "./helpers";

const completeSmallStage = async (page: import("@playwright/test").Page) => {
  const stages = page.locator("[data-stage-key]");
  const stageCount = await stages.count();

  for (let stageIndex = 0; stageIndex < stageCount; stageIndex += 1) {
    const stage = stages.nth(stageIndex);
    const stageKey = await stage.getAttribute("data-stage-key");
    if (!stageKey) continue;
    const items = stage.locator("[data-item-id]");
    const itemCount = await items.count();
    if (!itemCount) continue;

    const deltas: number[] = [];
    let totalClicks = 0;
    for (let itemIndex = 0; itemIndex < itemCount; itemIndex += 1) {
      const tile = items.nth(itemIndex);
      const requiredRaw = await tile.getAttribute("data-required");
      const ownedRaw = await tile.getAttribute("data-quantity");
      const required = Number(requiredRaw ?? "0");
      const owned = Number(ownedRaw ?? "0");
      const delta = required > 0 ? required - owned : 0;
      deltas.push(delta);
      if (delta > 0) {
        totalClicks += delta;
      }
    }

    if (totalClicks <= 0 || totalClicks > 12) {
      continue;
    }

    for (let itemIndex = 0; itemIndex < itemCount; itemIndex += 1) {
      const delta = deltas[itemIndex] ?? 0;
      if (delta <= 0) continue;
      const tile = items.nth(itemIndex);
      const plusButton = tile.getByTestId("qty-plus");
      for (let click = 0; click < delta; click += 1) {
        await plusButton.click();
      }
    }

    return { stage, stageKey };
  }

  return null;
};

test("stages are fully expanded on first project open", async ({ page }) => {
  await login(page, "Vanguard");
  await openProject(page);

  const stages = page.locator("[data-stage-key]");
  const stageCount = await stages.count();
  expect(stageCount).toBeGreaterThan(0);

  for (let index = 0; index < stageCount; index += 1) {
    await expect(stages.nth(index)).toHaveAttribute("data-stage-expanded", "true");
  }
});

test("completed stage collapses after effect and stays collapsed on revisit", async ({
  page,
}) => {
  await login(page, "Vanguard");
  await openProject(page);

  const completedStage = await completeSmallStage(page);
  if (!completedStage) {
    test.skip(true, "No small completable stage found.");
    return;
  }
  const { stage, stageKey } = completedStage;

  await expect(stage).toHaveAttribute("data-stage-highlight", "true");
  await expect(stage).toHaveAttribute("data-stage-expanded", "false", {
    timeout: 4000,
  });
  await expect(page.getByTestId(`project-stage-complete-mark-${stageKey}`)).toBeVisible();

  await page.getByRole("main").screenshot({
    path: "test-results/project-stage-collapse.png",
  });

  await page.reload();
  await expect(page.getByTestId("project-control-bar")).toBeVisible();
  await expect(
    page.getByTestId(`project-stage-${stageKey}`)
  ).toHaveAttribute("data-stage-expanded", "false");
});

test("project item updates persist", async ({ page }) => {
  await login(page, "Vanguard");
  await openProject(page);
  await page.getByRole("main").screenshot({
    path: "test-results/project-detail.png",
  });

  const tile = await findAdjustableTile(page);
  if (!tile) {
    throw new Error("No adjustable tile found for persistence test.");
  }

  const itemId = await tile.getAttribute("data-item-id");
  if (!itemId) {
    throw new Error("Missing item id for adjustable tile.");
  }

  const before = await getTileQuantity(tile);
  const patchResponse = page.waitForResponse((response) => {
    return (
      response.url().includes("/api/projects") &&
      response.request().method() === "PATCH"
    );
  });

  await tile.getByTestId("qty-plus").click();
  await patchResponse;

  await expect
    .poll(async () => getTileQuantity(tile))
    .toBe(before + 1);

  await page.reload();
  await expect(page.getByTestId("project-control-bar")).toBeVisible();

  const tileAfter = page.locator(`[data-item-id="${itemId}"]`).first();
  await expect(tileAfter).toBeVisible();
  await expect
    .poll(async () => getTileQuantity(tileAfter))
    .toBe(before + 1);
});

test("project toggles persist per user", async ({ page }) => {
  await login(page, "TogglePilot");
  await page.goto("/projects");

  const firstToggle = page.locator('[data-testid^="project-toggle-"]').first();
  await expect(firstToggle).toBeVisible();
  const toggleTestId = await firstToggle.getAttribute("data-testid");
  const slug = toggleTestId?.replace("project-toggle-", "");
  if (!slug) {
    throw new Error("No project slug found for toggle.");
  }

  const card = page.getByTestId(`project-card-${slug}`).first();
  await expect(card).toBeVisible();
  await firstToggle.click();
  await expect(firstToggle).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByTestId(`project-card-link-${slug}`)).toHaveCount(0);

  await page.reload();
  const toggleAfterReload = page.getByTestId(`project-toggle-${slug}`);
  await expect(toggleAfterReload).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByTestId(`project-card-link-${slug}`)).toHaveCount(0);
});
