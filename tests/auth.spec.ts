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
