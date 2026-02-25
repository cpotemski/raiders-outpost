import { expect, test } from "@playwright/test";
import { getLocalIdentity, login, openUserMenu } from "./helpers";

test("raider can sync and log out", async ({ page }) => {
  await login(page, "Vanguard");

  const identity = await getLocalIdentity(page);
  expect(identity.name).toBe("Vanguard");
  expect(identity.token).toBeTruthy();

  await openUserMenu(page);
  await page.getByTestId("operator-logout").click();

  await expect(page.getByTestId("onboarding-step-account")).toBeVisible();
  const cleared = await getLocalIdentity(page);
  expect(cleared.name).toBeFalsy();
  expect(cleared.token).toBeFalsy();
});

test("auth code links an existing account", async ({ page, browser }) => {
  await login(page, "Atlas");

  const generateResponse = page.waitForResponse((response) => {
    return (
      response.url().includes("/api/auth/code") &&
      response.request().method() === "POST"
    );
  });

  await openUserMenu(page);
  const response = await generateResponse;
  if (!response.ok()) {
    throw new Error(`Auth code generation failed: ${response.status()}`);
  }

  const codeField = page.getByTestId("operator-auth-code");
  await expect(codeField).toHaveText(/^[A-Z0-9]{8}$/);
  const code = await codeField.textContent();

  const context = await browser.newContext();
  const secondPage = await context.newPage();
  await secondPage.goto("/");
  await expect(secondPage.getByTestId("onboarding-step-account")).toBeVisible();
  await secondPage.getByTestId("onboarding-select-existing").click();
  await secondPage.locator("#auth-code").fill(code ?? "");
  await secondPage
    .getByTestId("onboarding-step-existing")
    .locator('button[type="submit"]')
    .click();
  await expect
    .poll(async () => {
      const linkedIdentity = await getLocalIdentity(secondPage);
      return linkedIdentity.name === "Atlas" && Boolean(linkedIdentity.token);
    })
    .toBe(true);
  await context.close();
});

test("new onboarding stores active expedition and completed phases", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
  });
  await page.reload();

  await expect(page.getByTestId("onboarding-step-account")).toBeVisible();
  await page.getByTestId("onboarding-select-new").click();
  await page.locator("#operator-name").fill("PhaseRunner");
  await page.getByTestId("onboarding-next").click();
  await expect(page.locator('[data-testid^="onboarding-blueprints-"]')).toHaveCount(0);
  await page.getByTestId("onboarding-next").click();

  const expeditionButton = page
    .locator('[data-testid^="onboarding-expedition-active-expedition_project"]')
    .first();
  await expect(expeditionButton).toBeVisible();
  const expeditionTestId = await expeditionButton.getAttribute("data-testid");
  const expeditionSlug = expeditionTestId?.replace(
    "onboarding-expedition-active-",
    ""
  );
  if (!expeditionSlug) {
    throw new Error("Could not resolve selected expedition slug.");
  }
  await expeditionButton.click();
  await page.getByTestId("onboarding-expedition-phase-1").click();

  const authRequestPromise = page.waitForRequest((request) => {
    return request.url().includes("/api/auth") && request.method() === "POST";
  });

  await page.getByTestId("onboarding-submit").click();
  const authRequest = await authRequestPromise;
  const authPayload = authRequest.postDataJSON() as {
    activeExpeditionSlug?: string | null;
    baseline?: { projectSlug: string; completedStageSortOrders: number[] }[];
  };

  expect(authPayload.activeExpeditionSlug).toBe(expeditionSlug);
  const expeditionBaseline = authPayload.baseline?.find(
    (entry) => entry.projectSlug === expeditionSlug
  );
  expect(expeditionBaseline?.completedStageSortOrders.length).toBe(1);

  await expect
    .poll(async () => {
      const identity = await getLocalIdentity(page);
      return identity.name === "PhaseRunner" && Boolean(identity.token);
    })
    .toBe(true);

  await openUserMenu(page);
  const activeOption = page.getByTestId(`expedition-option-${expeditionSlug}`);
  await expect(activeOption).toHaveAttribute("aria-pressed", "true");
});

test("public profile link is accessible without login", async ({
  page,
  browser,
}) => {
  await login(page, "PublicScout");
  await openUserMenu(page);

  const publicLinkField = page.getByTestId("operator-public-profile-link");
  await expect(publicLinkField).toContainText("/public/");
  const publicLink = await publicLinkField.textContent();
  if (!publicLink) {
    throw new Error("Public profile link is missing.");
  }

  const publicContext = await browser.newContext();
  const publicPage = await publicContext.newPage();
  await publicPage.goto(publicLink);

  await expect(publicPage.getByTestId("public-profile-panel")).toBeVisible();
  await expect(publicPage.getByTestId("public-profile-name")).toHaveText(
    "PublicScout"
  );
  await expect(publicPage.getByTestId("community-needs-panel")).toBeVisible();
  await publicPage
    .getByTestId("public-profile-panel")
    .screenshot({ path: "test-results/public-profile.png" });

  await publicContext.close();
});
