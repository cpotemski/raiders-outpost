import { expect, test } from "@playwright/test";
import {
  findAdjustableTile,
  getTileQuantity,
  login,
  openProject,
} from "./helpers";

test("project item updates persist", async ({ page }) => {
  await login(page, "Vanguard");
  await openProject(page, "blueprints");
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
