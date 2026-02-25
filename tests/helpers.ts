import { expect, type Locator, type Page } from "@playwright/test";

const NAME_KEY = "arc:identity:name";
const TOKEN_KEY = "arc:identity:token";

export const resetAdminSettings = async (page: Page) => {
  const response = await page.request.patch(
    "/api/admin/settings?password=playwright",
    {
      data: {
        disabledProjectSlugs: [],
        disabledItemIds: [],
        easyItemIds: [],
      },
    }
  );

  // In production-like setups admin access is intentionally hidden.
  if (response.ok() || response.status() === 404) {
    return;
  }

  throw new Error(
    `Failed to reset admin settings for test run: ${response.status()}`
  );
};

export const login = async (page: Page, name = "Vanguard") => {
  await resetAdminSettings(page);
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
  await expect(page.getByTestId("onboarding-step-new")).toBeVisible();
  await page.locator("#operator-name").fill(name);
  await page.getByTestId("onboarding-next").click();
  await expect(page.getByTestId("onboarding-submit")).toBeVisible();
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
  const link = slug
    ? page.getByTestId(`project-card-link-${slug}`).first()
    : page.locator('[data-testid^="project-card-link-"]').first();
  await expect(link).toBeVisible();
  await link.click();
  await expect(page).toHaveURL(/\/projects\/[^/?]+(\?.*)?$/);
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
