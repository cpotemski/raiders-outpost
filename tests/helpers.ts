import { expect, type Locator, type Page } from "@playwright/test";

const NAME_KEY = "arc:identity:name";
const TOKEN_KEY = "arc:identity:token";

export const login = async (page: Page, name = "Vanguard") => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
  });
  await page.reload();
  await syncIdentity(page, name);
  await expect(page.getByTestId("project-list")).toBeVisible();
};

export const syncIdentity = async (page: Page, name: string) => {
  await expect(page.getByText("ARC // AUTH LINK")).toBeVisible();
  await page.getByTestId("onboarding-select-new").click();
  await page.getByLabel("Raider Name").fill(name);
  await page.getByTestId("onboarding-next").click();
  await expect(
    page
      .getByTestId("onboarding-step-new")
      .getByText("Projects", { exact: true })
  ).toBeVisible();
  await page.getByTestId("onboarding-next").click();
  await expect(
    page
      .getByTestId("onboarding-step-new")
      .getByText("Expeditions (Optional)", { exact: true })
  ).toBeVisible();
  await page.getByRole("button", { name: "Sync Uplink" }).click();
  await expect(
    page.getByTestId("user-menu-trigger").getByText(name, { exact: true })
  ).toBeVisible();
};

export const getLocalIdentity = async (page: Page) => {
  return page.evaluate(
    ({ nameKey, tokenKey }) => {
      return {
        name: localStorage.getItem(nameKey),
        token: localStorage.getItem(tokenKey),
      };
    },
    { nameKey: NAME_KEY, tokenKey: TOKEN_KEY }
  );
};

export const openUserMenu = async (page: Page) => {
  const trigger = page.getByTestId("user-menu-trigger");
  await expect(trigger).toBeVisible();
  await trigger.click();
  await expect(page).toHaveURL(/\/operator/);
};

export const openProject = async (page: Page, slug: string) => {
  const card = page.getByTestId(`project-card-${slug}`);
  await expect(card).toBeVisible();
  await card.click();
  await expect(page).toHaveURL(new RegExp(`/projects/${slug}$`));
};

export const getTileQuantity = async (tile: Locator) => {
  const value = await tile.getAttribute("data-quantity");
  return Number(value ?? "0");
};

export const findAdjustableTile = async (page: Page) => {
  const tiles = page.locator("[data-item-id]");
  const tileCount = await tiles.count();
  for (let i = 0; i < tileCount; i += 1) {
    const tile = tiles.nth(i);
    const requiredRaw = await tile.getAttribute("data-required");
    const ownedRaw = await tile.getAttribute("data-quantity");
    const required = Number(requiredRaw ?? "0");
    const owned = Number(ownedRaw ?? "0");
    if (required > 0 && owned < required) {
      return tile;
    }
  }
  return null;
};
