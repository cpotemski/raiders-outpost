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

const login = async (page: Page, name = "Vanguard") => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
  });
  await page.reload();
  await expect(page.getByText("ARC// AUTH LINK")).toBeVisible();
  await page.getByLabel("Operator Name").fill(name);
  await page.getByRole("button", { name: "Link Uplink" }).click();
  await expect(page.getByText(name)).toBeVisible();
};

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("seo metadata is present", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("ARC // Raiders Outpost");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    /Companion HUD/i
  );
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    "content",
    "ARC // Raiders Outpost"
  );
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    "content",
    "summary"
  );
  await expect(page.locator('link[rel="icon"][sizes="32x32"]')).toHaveAttribute(
    "href",
    "/favicon-32x32.png"
  );
  await expect(
    page.locator('link[rel="icon"][sizes="16x16"]')
  ).toHaveAttribute("href", "/favicon-16x16.png");
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
    "href",
    "/apple-touch-icon.png"
  );
});

test("blueprint images load from arc-items endpoint", async ({ page }) => {
  await login(page);
  await page.waitForResponse((response) => {
    return (
      response.url().includes("/api/blueprints") &&
      response.request().method() === "GET" &&
      response.ok()
    );
  });

  const img = page.locator('img[src^="/api/arc-items/image"]').first();
  await expect(img).toBeVisible();
  await expect
    .poll(async () => {
      return img.evaluate((node: HTMLImageElement) => node.naturalWidth);
    })
    .toBeGreaterThan(0);
});

test("mobile layout avoids horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await expect(page.getByText("ARC// AUTH LINK")).toBeVisible();
  await expect
    .poll(async () => {
      return page.evaluate(() => {
        return (
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth
        );
      });
    })
    .toBeFalsy();

  await page.getByLabel("Operator Name").fill("Vanguard");
  await page.getByRole("button", { name: "Link Uplink" }).click();
  await expect(page.getByText("Found")).toBeVisible();
  await expect
    .poll(async () => {
      return page.evaluate(() => {
        return (
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth
        );
      });
    })
    .toBeFalsy();

  await page.getByRole("link", { name: "Community", exact: true }).click();
  await expect(page.getByText("Roster")).toBeVisible();
  await expect
    .poll(async () => {
      return page.evaluate(() => {
        return (
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth
        );
      });
    })
    .toBeFalsy();
  await page.getByRole("main").screenshot({
    path: "test-results/mobile-community.png",
  });
});

test("blueprint project persists owned state", async ({ page }) => {
  await login(page);
  const identity = await getLocalIdentity(page);
  expect(identity.token).toBeTruthy();
  const loadResponse = page.waitForResponse((response) => {
    return (
      response.url().includes("/api/blueprints") &&
      response.request().method() === "GET" &&
      response.ok()
    );
  });
  await page.reload();
  await loadResponse;

  const firstBlueprint = page.getByRole("button", { name: /Blueprint/i }).first();
  const persistRequest = page.waitForResponse((response) => {
    return (
      response.url().includes("/api/blueprints") &&
      response.request().method() === "PATCH" &&
      response.ok()
    );
  });
  await firstBlueprint.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Found" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
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

test("blueprint tiles show community ownership", async ({ page, browser }) => {
  await login(page, "Vanguard");

  await page.getByRole("link", { name: "Community", exact: true }).click();
  await expect(page.getByText("Roster")).toBeVisible();
  await page.getByLabel("Community Name").fill("Echo Node");
  await page.getByRole("button", { name: "Create Community" }).click();
  await expect(page.getByText("Echo Node")).toBeVisible();
  const inviteLink = await page.getByLabel("Invite link").inputValue();

  const context = await browser.newContext();
  const invitePage = await context.newPage();
  await invitePage.goto(inviteLink);
  await expect(invitePage.getByText("ARC// AUTH LINK")).toBeVisible();
  await invitePage.getByLabel("Operator Name").fill("Nomad");
  await invitePage.getByRole("button", { name: "Link Uplink" }).click();
  await expect(invitePage.getByText("Echo Node")).toBeVisible();

  await page.getByRole("link", { name: "Start", exact: true }).click();
  await page.waitForResponse((response) => {
    return (
      response.url().includes("/api/blueprints") &&
      response.request().method() === "GET" &&
      response.ok()
    );
  });

  const firstBlueprint = page.getByRole("button", { name: /Blueprint/i }).first();
  const itemName = await firstBlueprint.getAttribute("title");
  const persistRequest = page.waitForResponse((response) => {
    return (
      response.url().includes("/api/blueprints") &&
      response.request().method() === "PATCH" &&
      response.ok()
    );
  });
  await firstBlueprint.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Found" }).click();
  await persistRequest;
  await expect(firstBlueprint).toHaveAttribute("aria-pressed", "true");

  await invitePage.goto("/");
  await invitePage.waitForResponse((response) => {
    return (
      response.url().includes("/api/blueprints") &&
      response.request().method() === "GET" &&
      response.ok()
    );
  });

  const targetBlueprint = itemName
    ? invitePage.getByRole("button", { name: itemName })
    : invitePage.getByRole("button", { name: /Blueprint/i }).first();
  await targetBlueprint.click();
  await expect(invitePage.getByText("Needs Item")).toBeVisible();
  await expect(invitePage.getByRole("dialog")).not.toContainText("Nomad");
  await invitePage.getByRole("dialog").screenshot({
    path: "test-results/blueprint-community-tile.png",
  });

  await context.close();
});

test("auth creates token in localStorage and shows in menu", async ({ page }) => {
  await login(page);

  const identity = await getLocalIdentity(page);
  expect(identity.name).toBe("Vanguard");
  expect(identity.token).toBeTruthy();

  const generateResponse = page.waitForResponse((response) => {
    return (
      response.url().includes("/api/auth/code") &&
      response.request().method() === "POST"
    );
  });
  await page.getByRole("button", { name: /Operator/i }).click();
  await expect(page.getByText("Auth Code")).toBeVisible();
  const response = await generateResponse;
  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`Auth code generation failed: ${response.status()} ${body}`);
  }
  const codeField = page.getByLabel("Auth code value");
  await expect(codeField).toHaveText(/^[A-Z0-9]{8}$/);
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

test("auth code links existing account", async ({ page, browser }) => {
  await login(page, "Atlas");
  const generateResponse = page.waitForResponse((response) => {
    return (
      response.url().includes("/api/auth/code") &&
      response.request().method() === "POST"
    );
  });
  await page.getByRole("button", { name: /Operator/i }).click();
  const response = await generateResponse;
  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`Auth code generation failed: ${response.status()} ${body}`);
  }
  const code = await page.getByLabel("Auth code value").textContent();
  expect(code).toMatch(/^[A-Z0-9]{8}$/);

  const context = await browser.newContext();
  const secondPage = await context.newPage();
  await secondPage.goto("/");
  await expect(secondPage.getByText("ARC// AUTH LINK")).toBeVisible();
  await secondPage.getByRole("button", { name: "Use Code" }).click();
  await secondPage.getByLabel("Auth Code").fill(code ?? "");
  await secondPage.getByRole("button", { name: "Link Uplink" }).click();
  await expect(secondPage.getByText("Atlas")).toBeVisible();
  await context.close();
});

test("community creation and invite link join", async ({ page, browser }) => {
  await login(page, "Vanguard");

  await page.getByRole("link", { name: "Community", exact: true }).click();
  await expect(page.getByText("Roster")).toBeVisible();
  await page.getByLabel("Community Name").fill("Echo Node");
  await page.getByRole("button", { name: "Create Community" }).click();
  await expect(page.getByText("Echo Node")).toBeVisible();
  await expect(
    page.getByRole("main").getByText("Vanguard", { exact: true })
  ).toBeVisible();

  const inviteLink = await page.getByLabel("Invite link").inputValue();
  expect(inviteLink).toContain("/community?invite=");

  const context = await browser.newContext();
  const invitePage = await context.newPage();
  await invitePage.goto(inviteLink);
  await expect(invitePage.getByText("ARC// AUTH LINK")).toBeVisible();
  await invitePage.getByLabel("Operator Name").fill("Nomad");
  await invitePage.getByRole("button", { name: "Link Uplink" }).click();
  await expect(
    invitePage.getByRole("main").getByText("Nomad", { exact: true })
  ).toBeVisible();
  await expect(invitePage.getByText("Echo Node")).toBeVisible();
  await expect(
    invitePage.getByRole("main").getByText("Vanguard", { exact: true })
  ).toBeVisible();
  await context.close();
});

test("community members can remove operators", async ({ page, browser }) => {
  await login(page, "Vanguard");

  await page.getByRole("link", { name: "Community", exact: true }).click();
  await expect(page.getByText("Roster")).toBeVisible();
  await page.getByLabel("Community Name").fill("Echo Node");
  await page.getByRole("button", { name: "Create Community" }).click();
  await expect(page.getByText("Echo Node")).toBeVisible();
  const inviteLink = await page.getByLabel("Invite link").inputValue();

  const context = await browser.newContext();
  const invitePage = await context.newPage();
  await invitePage.goto(inviteLink);
  await expect(invitePage.getByText("ARC// AUTH LINK")).toBeVisible();
  await invitePage.getByLabel("Operator Name").fill("Nomad");
  await invitePage.getByRole("button", { name: "Link Uplink" }).click();
  await expect(invitePage.getByText("Echo Node")).toBeVisible();
  await context.close();

  await page.reload();
  await expect(
    page.getByRole("main").getByText("Nomad", { exact: true })
  ).toBeVisible();

  const removeRequest = page.waitForResponse((response) => {
    return (
      response.url().includes("/api/community/remove") &&
      response.request().method() === "POST" &&
      response.ok()
    );
  });
  await page.getByRole("button", { name: "Remove Nomad" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await removeRequest;

  await expect(
    page.getByRole("main").getByText("Nomad", { exact: true })
  ).toBeHidden();
  await page.getByRole("main").screenshot({
    path: "test-results/community-remove.png",
  });
});
