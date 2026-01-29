import { PrismaClient } from "@prisma/client";
import { test, expect, type Page } from "@playwright/test";

const NAME_KEY = "arc:identity:name";
const TOKEN_KEY = "arc:identity:token";

const prisma = new PrismaClient();

const getLocalIdentity = async (page: Page) => {
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

const login = async (page: Page) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
  });
  await page.reload();
  await expect(page.getByText("ARC// AUTH LINK")).toBeVisible();
  await page.getByLabel("Operator Name").fill("Vanguard");
  await page.getByRole("button", { name: "Link Uplink" }).click();
  await expect(page.getByText("Vanguard")).toBeVisible();
};

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("blueprint project persists owned state", async ({ page }) => {
  await login(page);
  const identity = await getLocalIdentity(page);
  expect(identity.token).toBeTruthy();
  await page.waitForResponse((response) => {
    return (
      response.url().includes("/api/blueprints") &&
      response.request().method() === "GET" &&
      response.ok()
    );
  });

  const firstBlueprint = page.getByRole("button", { name: /Blueprint/i }).first();
  const persistRequest = page.waitForResponse((response) => {
    return (
      response.url().includes("/api/blueprints") &&
      response.request().method() === "PATCH" &&
      response.ok()
    );
  });
  await firstBlueprint.click();
  await persistRequest;
  await expect(firstBlueprint).toHaveAttribute("aria-pressed", "true");

  const user = await prisma.user.findUnique({
    where: { token: identity.token ?? "" },
    select: { id: true },
  });
  expect(user).toBeTruthy();
  const ownedCount = await prisma.userProjectItem.count({
    where: {
      userId: user!.id,
      projectItem: { stage: { project: { slug: "blueprints" } } },
    },
  });
  expect(ownedCount).toBe(1);

  await page.reload();
  await expect.poll(async () => {
    const stored = await getLocalIdentity(page);
    return stored.token;
  }).toBe(identity.token);
  await expect(page.getByRole("button", { name: /Operator/i })).toContainText(
    "Vanguard"
  );
  await expect(firstBlueprint).toHaveAttribute("aria-pressed", "true");
});

test("auth creates token in localStorage and shows in menu", async ({ page }) => {
  await login(page);

  const identity = await getLocalIdentity(page);
  expect(identity.name).toBe("Vanguard");
  expect(identity.token).toBeTruthy();

  await page.getByRole("button", { name: /Operator/i }).click();
  await expect(page.getByText("Access Token")).toBeVisible();
  await expect(page.getByText(identity.token ?? "")).toBeVisible();
});

test("logout clears local identity and returns to auth gate", async ({ page }) => {
  await login(page);

  await page.getByRole("button", { name: /Operator/i }).click();
  await page.getByRole("button", { name: "Log Out" }).click();

  await expect(page.getByText("ARC// AUTH LINK")).toBeVisible();
  const identity = await getLocalIdentity(page);
  expect(identity.name).toBeFalsy();
  expect(identity.token).toBeFalsy();
});

test("unknown token is cleared and auth gate appears", async ({ page }) => {
  await page.addInitScript(
    ({ nameKey, tokenKey }) => {
      localStorage.setItem(nameKey, "Ghost");
      localStorage.setItem(tokenKey, "arc-invalid-token");
    },
    { nameKey: NAME_KEY, tokenKey: TOKEN_KEY }
  );

  await page.goto("/");
  await expect(page.getByText("ARC// AUTH LINK")).toBeVisible();
  const identity = await getLocalIdentity(page);
  expect(identity.name).toBeFalsy();
  expect(identity.token).toBeFalsy();
});
