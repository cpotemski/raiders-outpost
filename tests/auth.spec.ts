import { expect, test } from "@playwright/test";
import { getLocalIdentity, login, openUserMenu } from "./helpers";

test("raider can sync and log out", async ({ page }) => {
  await login(page, "Vanguard");

  const identity = await getLocalIdentity(page);
  expect(identity.name).toBe("Vanguard");
  expect(identity.token).toBeTruthy();

  await openUserMenu(page);
  await page.getByRole("button", { name: "Log Out" }).click();

  await expect(page.getByText("ARC// AUTH LINK")).toBeVisible();
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

  const codeField = page.getByLabel("Auth code value");
  await expect(codeField).toHaveText(/^[A-Z0-9]{8}$/);
  const code = await codeField.textContent();

  const context = await browser.newContext();
  const secondPage = await context.newPage();
  await secondPage.goto("/");
  await expect(secondPage.getByText("ARC// AUTH LINK")).toBeVisible();
  await secondPage.getByRole("button", { name: "Use Code" }).click();
  await secondPage.getByLabel("Auth Code").fill(code ?? "");
  await secondPage.getByRole("button", { name: "Sync Uplink" }).click();
  await expect(secondPage.getByText("Atlas")).toBeVisible();
  await context.close();
});
