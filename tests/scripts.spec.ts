import { expect, test } from "@playwright/test";

test("scripts page documents the available script endpoints", async ({ page }) => {
  await page.goto("/scripts");
  const scriptsUrl = new URL(page.url());
  const expectedCommand = `!command add !map $(customapi ${scriptsUrl.origin}/scripts/map)`;

  await expect(page.getByTestId("scripts-page")).toBeVisible();
  await expect(page.getByText("Stream Endpunkte")).toBeVisible();
  await expect(page.locator("article").getByText("/scripts/map", { exact: true })).toBeVisible();
  await expect(page.getByText(expectedCommand)).toBeVisible();

  await page.getByTestId("scripts-page").screenshot({
    path: "test-results/scripts-page.png",
  });
});

test("map script endpoint returns plain text", async ({ page }) => {
  const response = await page.request.get("/scripts/map");
  expect(response.ok()).toBeTruthy();

  const text = await response.text();
  expect(text.length).toBeGreaterThan(0);
  expect(text).toMatch(
    /^(Map-Pick: .+|Aktuell konnten die Map-Daten nicht geladen werden\.)$/
  );
});
