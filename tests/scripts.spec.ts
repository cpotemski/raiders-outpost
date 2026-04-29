import { expect, test } from "@playwright/test";
import { translateBotName } from "@/lib/arc-bot-labels";
import { loadArcBots } from "@/lib/arc-bots";
import { getScriptEligibleItems } from "@/lib/scripts/random-item";

test("scripts page documents the available script endpoints", async ({ page }) => {
  await page.goto("/scripts");
  const scriptsUrl = new URL(page.url());
  const expectedArcCommand = `!command add !arc $(customapi ${scriptsUrl.origin}/scripts/arc)`;
  const expectedMapCommand = `!command add !map $(customapi ${scriptsUrl.origin}/scripts/map)`;
  const expectedItemCommand = `!command add !item $(customapi ${scriptsUrl.origin}/scripts/item?rarity=$(queryescape $(1)))`;

  await expect(page.getByTestId("scripts-page")).toBeVisible();
  await expect(page.getByText("Stream Endpunkte")).toBeVisible();
  await expect(page.locator("article").getByText("/scripts/arc", { exact: true })).toBeVisible();
  await expect(page.locator("article").getByText("/scripts/map", { exact: true })).toBeVisible();
  await expect(page.locator("article").getByText("/scripts/item", { exact: true })).toBeVisible();
  await expect(page.getByText(expectedArcCommand)).toBeVisible();
  await expect(page.getByText(expectedMapCommand)).toBeVisible();
  await expect(page.getByText(expectedItemCommand)).toBeVisible();
  await expect(page.getByTestId("copy-command--scripts-arc")).toBeVisible();
  await expect(page.getByTestId("copy-command--scripts-map")).toBeVisible();
  await expect(page.getByTestId("copy-command--scripts-item")).toBeVisible();

  await page.getByTestId("scripts-page").screenshot({
    path: "test-results/scripts-page.png",
  });
});

test("scripts page is accessible without login", async ({ page }) => {
  await page.goto("/scripts");

  await expect(page.getByTestId("scripts-page")).toBeVisible();
  await expect(page.getByTestId("onboarding-step-account")).toBeHidden();
});

test("arc script endpoint returns plain text", async ({ page }) => {
  const response = await page.request.get("/scripts/arc");
  expect(response.ok()).toBeTruthy();

  const text = await response.text();
  expect(text).toMatch(/^(ARC: .+|Aktuell konnten die ARC-Daten nicht geladen werden\.)$/);
});

test("map script endpoint returns plain text", async ({ page }) => {
  const response = await page.request.get("/scripts/map");
  expect(response.ok()).toBeTruthy();

  const text = await response.text();
  expect(text.length).toBeGreaterThan(0);
  expect(text).toMatch(
    /^(Map: .+|Aktuell konnten die Map-Daten nicht geladen werden\.)$/
  );
});

test("item script endpoint returns plain text", async ({ page }) => {
  const response = await page.request.get("/scripts/item");
  expect(response.ok()).toBeTruthy();

  const text = await response.text();
  expect(text).toMatch(
    /^(Item: .+|Aktuell konnten die Item-Daten nicht geladen werden\.)$/
  );
});

test("item script endpoint supports rarity filtering", async ({ page }) => {
  const response = await page.request.get("/scripts/item?rarity=rare");
  expect(response.ok()).toBeTruthy();

  const text = await response.text();
  expect(text).toMatch(/^Item: .+$/);
});

test("item script endpoint treats unresolved chat placeholders as no rarity filter", async ({ page }) => {
  const response = await page.request.get("/scripts/item?rarity=$(1)");
  expect(response.ok()).toBeTruthy();

  const text = await response.text();
  expect(text).toMatch(
    /^(Item: .+|Aktuell konnten die Item-Daten nicht geladen werden\.)$/
  );
});

test("item script endpoint lists available rarities for invalid rarity", async ({ page }) => {
  const response = await page.request.get("/scripts/item?rarity=definitely-not-real");
  expect(response.ok()).toBeTruthy();

  const text = await response.text();
  expect(text).toMatch(
    /^Keine Items fuer rarity "definitely-not-real" gefunden\. Verfuegbare Rarities: .+$/
  );
});

test("item script exclusions filter blueprints and keys generically", async () => {
  const items = getScriptEligibleItems([
    {
      id: "allowed",
      name: "Agave Juice",
      rarity: "Common",
      itemType: "Nature",
      imageFile: null,
    },
    {
      id: "blueprint",
      name: "Anvil Blueprint",
      rarity: "Rare",
      itemType: "Blueprint",
      imageFile: null,
    },
    {
      id: "key",
      name: "Blue Gate Village Key",
      rarity: "Epic",
      itemType: "Key",
      imageFile: null,
    },
    {
      id: "trinket",
      name: "Secret Meeting Info",
      rarity: "Rare",
      itemType: "Trinket",
      imageFile: null,
    },
  ]);

  expect(items).toHaveLength(1);
  expect(items[0]?.id).toBe("allowed");
});

test("arc bot labels provide german translations", () => {
  expect(translateBotName("MATRIARCH", "de")).toBe("Matriarchin");
  expect(translateBotName("THE QUEEN", "de")).toBe("Königin");
  expect(translateBotName("SENTINEL", "de")).toBe("Wächter");
  expect(translateBotName("ARC Assessor", "de")).toBe("ARC-Assessor");
  expect(translateBotName("Comet", "de")).toBe("Komet");
  expect(translateBotName("Turbine", "de")).toBe("Turbine");
});

test("arc bot loader includes local override entries from MetaForge list", async () => {
  const payload = await loadArcBots("de");
  const ids = new Set(payload.bots.map((bot) => bot.id));

  expect(ids.has("arc_assessor")).toBeTruthy();
  expect(ids.has("arc_comet")).toBeTruthy();
  expect(ids.has("arc_firefly")).toBeTruthy();
  expect(ids.has("arc_turbine")).toBeTruthy();
  expect(ids.has("arc_vaporizer")).toBeTruthy();
});
