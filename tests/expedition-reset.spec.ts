import { expect, test, type Page } from "@playwright/test";
import { login } from "./helpers";

type ProjectsPayload = {
  projects: Array<{
    slug: string;
    kind: "workshop" | "project" | "blueprints";
    stages: Array<{
      items: Array<{
        projectItemId: string;
        quantityRequired: number;
        quantityOwned: number;
      }>;
    }>;
  }>;
  activeExpeditionSlug: string | null;
};

const getTokenHeader = async (page: Page) => {
  const identity = await page.evaluate(() => {
    return {
      name: localStorage.getItem("arc:identity:name") ?? "",
      token: localStorage.getItem("arc:identity:token") ?? "",
    };
  });

  return {
    token: identity.token,
    name: identity.name,
  };
};

const loadProjects = async (page: Page) => {
  const headers = await getTokenHeader(page);
  const response = await page.request.get("/api/projects?locale=en", {
    headers: {
      "x-arc-token": headers.token,
      "x-arc-name": headers.name,
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to load projects: ${response.status()}`);
  }

  return (await response.json()) as ProjectsPayload;
};

const setActiveExpedition = async (
  page: Page,
  expeditionSlug: string
) => {
  const headers = await getTokenHeader(page);
  const response = await page.request.put("/api/user/expedition?locale=en", {
    headers: {
      "x-arc-token": headers.token,
      "Content-Type": "application/json",
    },
    data: { expeditionSlug },
  });

  if (!response.ok()) {
    throw new Error(`Failed to set expedition: ${response.status()}`);
  }
};

test("expedition reset clears only workshop and blueprints and starts next expedition", async ({
  page,
}) => {
  await login(page, `ResetPilot-${Date.now().toString(36)}`);

  await setActiveExpedition(page, "expedition_project_s1");

  const before = await loadProjects(page);
  const workshopItem = before.projects
    .filter((project) => project.kind === "workshop")
    .flatMap((project) => project.stages)
    .flatMap((stage) => stage.items)
    .find((item) => item.quantityRequired > 0);
  const blueprintItem = before.projects
    .filter((project) => project.kind === "blueprints")
    .flatMap((project) => project.stages)
    .flatMap((stage) => stage.items)
    .find((item) => item.quantityRequired > 0);
  const projectItem = before.projects
    .filter((project) => project.kind === "project")
    .flatMap((project) => project.stages)
    .flatMap((stage) => stage.items)
    .find((item) => item.quantityRequired > 0);
  const expeditionItem = before.projects
    .find((project) => project.slug === "expedition_project_s1")
    ?.stages.flatMap((stage) => stage.items)
    .find((item) => item.quantityRequired > 0);

  if (!workshopItem || !blueprintItem || !projectItem || !expeditionItem) {
    throw new Error("Missing required fixture items for expedition reset test.");
  }

  const headers = await getTokenHeader(page);
  const patchResponse = await page.request.patch("/api/projects", {
    headers: {
      "x-arc-token": headers.token,
      "x-arc-name": headers.name,
      "Content-Type": "application/json",
    },
    data: {
      updates: [
        { projectItemId: workshopItem.projectItemId, quantityOwned: 1 },
        { projectItemId: blueprintItem.projectItemId, quantityOwned: 1 },
        { projectItemId: projectItem.projectItemId, quantityOwned: 1 },
        { projectItemId: expeditionItem.projectItemId, quantityOwned: 1 },
      ],
    },
  });
  if (!patchResponse.ok()) {
    throw new Error(`Failed to seed progress: ${patchResponse.status()}`);
  }

  await page.goto("/");
  await expect(page.getByTestId("expedition-reset-notice")).toBeVisible();
  await page
    .getByTestId("expedition-reset-notice")
    .screenshot({ path: "test-results/expedition-reset-notice.png" });
  await page.getByTestId("expedition-reset-open-dialog").click();
  await expect(page.getByTestId("expedition-reset-step-confirm")).toBeVisible();
  await page.getByTestId("expedition-reset-confirm").click();
  await expect(page.getByTestId("expedition-reset-step-next")).toBeVisible();

  const resetResponse = page.waitForResponse((response) => {
    return (
      response.url().includes("/api/user/expedition/reset") &&
      response.request().method() === "POST"
    );
  });
  await page.getByTestId("expedition-reset-next-yes").click();
  const resetResult = await resetResponse;
  expect(resetResult.ok()).toBeTruthy();

  await expect(page.getByTestId("expedition-reset-notice")).toBeHidden();

  const after = await loadProjects(page);
  const getQuantity = (projectItemId: string) =>
    after.projects
      .flatMap((project) => project.stages)
      .flatMap((stage) => stage.items)
      .find((item) => item.projectItemId === projectItemId)?.quantityOwned;

  expect(getQuantity(workshopItem.projectItemId)).toBe(0);
  expect(getQuantity(blueprintItem.projectItemId)).toBe(0);
  expect(getQuantity(projectItem.projectItemId)).toBe(1);
  expect(getQuantity(expeditionItem.projectItemId)).toBe(1);
  expect(after.activeExpeditionSlug).toBe("expedition_project");
});

test("notice can be dismissed and operator reset remains available", async ({ page }) => {
  await login(page, `ResetDismiss-${Date.now().toString(36)}`);
  await setActiveExpedition(page, "expedition_project");

  await page.goto("/");
  await expect(page.getByTestId("expedition-reset-notice")).toBeVisible();

  const dismissResponse = page.waitForResponse((response) => {
    return (
      response.url().includes("/api/user/expedition/reset") &&
      response.request().postData()?.includes('"mode":"dismiss"')
    );
  });
  await page.getByTestId("expedition-reset-dismiss").click();
  const dismissResult = await dismissResponse;
  expect(dismissResult.ok()).toBeTruthy();

  await expect(page.getByTestId("expedition-reset-notice")).toBeHidden();

  await page.goto("/operator");
  await expect(page.getByTestId("operator-expedition-reset-open")).toBeVisible();
  await page.getByTestId("operator-expedition-reset-open").click();
  await expect(page.getByTestId("expedition-reset-dialog")).toBeVisible();
  await page.getByTestId("expedition-reset-close").click();
  await expect(page.getByTestId("expedition-reset-dialog")).toBeHidden();
});
