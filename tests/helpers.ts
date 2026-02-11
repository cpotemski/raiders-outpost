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
  await expect(page.getByTestId("onboarding-step-account")).toBeHidden();
};

export const syncIdentity = async (page: Page, name: string) => {
  await expect(page.getByTestId("onboarding-step-account")).toBeVisible();
  await page.getByTestId("onboarding-select-new").click();
  await page.locator("#operator-name").fill(name);
  await page.getByTestId("onboarding-next").click();
  const nextButton = page.getByTestId("onboarding-next");
  if (await nextButton.isVisible()) {
    await nextButton.click();
  }
  if (await nextButton.isVisible()) {
    await nextButton.click();
  }
  await page.getByTestId("onboarding-submit").click();
  await expect
    .poll(async () => {
      const identity = await getLocalIdentity(page);
      return identity.name === name && Boolean(identity.token);
    })
    .toBe(true);
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
  await page.goto("/operator");
  await expect(page).toHaveURL(/\/operator/);
};

export const openProject = async (page: Page, slug?: string) => {
  await page.goto("/projects");
  const card = slug
    ? page.getByTestId(`project-card-${slug}`).first()
    : page.locator('[data-testid^="project-card-"]').first();
  await expect(card).toBeVisible();
  await card.click();
  await expect(page).toHaveURL(/\/projects\/[^/]+$/);
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
