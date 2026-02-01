import "dotenv/config";
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { test, expect, type Page, type Locator } from "@playwright/test";

const NAME_KEY = "arc:identity:name";
const TOKEN_KEY = "arc:identity:token";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

const getUniqueExpeditionItem = () => {
  const dataPath = path.join(
    process.cwd(),
    "node_modules",
    "arcraiders-data",
    "projects.json"
  );
  const raw = fs.readFileSync(dataPath, "utf8");
  const projects = JSON.parse(raw) as Array<{
    id?: string;
    phases?: Array<{
      requirementItemIds?: Array<{ itemId?: string; quantity?: number }>;
    }>;
  }>;

  const expeditionProjects = projects.filter((project) =>
    project.id?.startsWith("expedition_project")
  );
  const expeditionItems = new Map<
    string,
    { projectSlug: string; required: number }
  >();
  const nonExpeditionItems = new Set<string>();

  for (const project of projects) {
    const isExpedition = project.id?.startsWith("expedition_project");
    for (const phase of project.phases ?? []) {
      for (const requirement of phase.requirementItemIds ?? []) {
        if (!requirement.itemId) continue;
        const required = Number(requirement.quantity ?? 0);
        if (isExpedition) {
          if (!expeditionItems.has(requirement.itemId)) {
            expeditionItems.set(requirement.itemId, {
              projectSlug: project.id ?? "",
              required,
            });
          }
        } else {
          nonExpeditionItems.add(requirement.itemId);
        }
      }
    }
  }

  for (const [itemId, data] of expeditionItems.entries()) {
    if (data.required <= 0) continue;
    if (nonExpeditionItems.has(itemId)) continue;
    if (!data.projectSlug) continue;
    return { itemId, projectSlug: data.projectSlug };
  }

  return null;
};

const getTileQuantity = async (tile: Locator) => {
  const value = await tile.getAttribute("data-quantity");
  return Number(value ?? "0");
};

const incrementTile = async (tile: Locator) => {
  const before = await getTileQuantity(tile);
  const increaseButton = tile.getByRole("button", { name: /Increase/i });
  await increaseButton.click();
  await expect.poll(async () => getTileQuantity(tile)).toBeGreaterThan(before);
};

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

const openProject = async (page: Page, slug: string) => {
  const card = page.getByTestId(`project-card-${slug}`);
  await expect(card).toBeVisible();
  await card.click();
  await expect(page).toHaveURL(new RegExp(`/projects/${slug}$`));
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
  await expect(page.getByTestId("project-list")).toBeVisible();
};

const getOnboardingProjects = async (page: Page) => {
  const res = await page.request.get("/api/onboarding/projects?locale=en");
  if (!res.ok()) {
    throw new Error("Failed to load onboarding projects.");
  }
  return (await res.json()) as {
    projects: Array<{
      slug: string;
      name: string;
      isExpedition: boolean;
      stages: Array<{
        stageKey: string;
        sortOrder: number;
      }>;
    }>;
  };
};

const openUserMenu = async (page: Page) => {
  const trigger = page.getByTestId("user-menu-trigger");
  await expect(trigger).toBeVisible();
  await trigger.click();
  await expect(page).toHaveURL(/\/operator/);
};

const setActiveExpedition = async (page: Page, slug: string | null) => {
  const result = await page.evaluate(async (expeditionSlug) => {
    const token = localStorage.getItem("arc:identity:token");
    const res = await fetch("/api/user/expedition", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-arc-token": token ?? "",
      },
      body: JSON.stringify({ expeditionSlug }),
    });
    return res.ok;
  }, slug);
  if (!result) {
    throw new Error("Failed to set expedition selection.");
  }
  await page.reload();
  await expect(page.getByTestId("project-list")).toBeVisible();
};

test.afterAll(async () => {
  await prisma.$disconnect();
  await pool.end();
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

test("project images load from arc-items endpoint", async ({ page }) => {
  await login(page);
  await openProject(page, "blueprints");

  const img = page.locator('img[src^="/api/arc-items/image"]').first();
  await expect(img).toBeVisible();
  await expect
    .poll(async () => {
      return img.evaluate((node: HTMLImageElement) => node.naturalWidth);
    })
    .toBeGreaterThan(0);
});

test("blueprint labels omit blueprint suffix", async ({ page }) => {
  await login(page);
  await openProject(page, "blueprints");

  const firstTile = page.locator("[data-item-id]").first();
  await expect(firstTile).toBeVisible();
  await expect(firstTile).not.toContainText(/Blueprint/i);
});

test("plus button increments by one per click", async ({ page }) => {
  await login(page);
  await openProject(page, "blueprints");

  const tile = page
    .locator("[data-item-id]")
    .filter({
      has: page.locator(
        '[data-testid="qty-plus"][aria-hidden="false"]'
      ),
    })
    .first();
  await expect(tile).toBeVisible();
  const increaseButton = tile.getByTestId("qty-plus");
  const before = await getTileQuantity(tile);
  await increaseButton.click();
  await expect
    .poll(async () => getTileQuantity(tile))
    .toBe(before + 1);
});

test("touch scroll over plus does not change quantity", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await login(page);

  const tile = page
    .locator("[data-item-id]")
    .filter({
      has: page.locator(
        '[data-testid="qty-plus"][aria-hidden="false"]'
      ),
    })
    .first();
  await expect(tile).toBeVisible();
  const increaseButton = tile.getByTestId("qty-plus");
  const before = await getTileQuantity(tile);
  const box = await increaseButton.boundingBox();
  expect(box).toBeTruthy();
  if (!box) return;
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;

  await increaseButton.dispatchEvent("pointerdown", {
    pointerId: 1,
    pointerType: "touch",
    isPrimary: true,
    buttons: 1,
    clientX: startX,
    clientY: startY,
  });
  await increaseButton.dispatchEvent("pointermove", {
    pointerId: 1,
    pointerType: "touch",
    isPrimary: true,
    buttons: 1,
    clientX: startX,
    clientY: startY + 32,
  });
  await increaseButton.dispatchEvent("pointerup", {
    pointerId: 1,
    pointerType: "touch",
    isPrimary: true,
    buttons: 0,
    clientX: startX,
    clientY: startY + 32,
  });

  await page.waitForTimeout(200);
  await expect
    .poll(async () => getTileQuantity(tile))
    .toBe(before);
  await tile.screenshot({
    path: "test-results/mobile-qty-touch-scroll.png",
  });
});

test("project tile images scale to fill on desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await login(page);

  const tile = page
    .locator("[data-item-id]")
    .filter({ has: page.locator("img") })
    .first();
  await expect(tile).toBeVisible();
  const image = tile.locator("img");
  await expect(image).toBeVisible();

  const tileBox = await tile.boundingBox();
  const imageBox = await image.boundingBox();
  expect(tileBox).toBeTruthy();
  expect(imageBox).toBeTruthy();
  if (!tileBox || !imageBox) return;
  expect(imageBox.width / tileBox.width).toBeGreaterThan(0.55);
  expect(imageBox.height / tileBox.height).toBeGreaterThan(0.55);
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
  await expect(page.getByTestId("project-list")).toBeVisible();
  await openUserMenu(page);
  const menuPanel = page.getByText("ARC// OPERATOR").locator("..").locator("..");
  await expect(menuPanel).toBeVisible();
  await expect
    .poll(async () => {
      const box = await menuPanel.boundingBox();
      const viewport = page.viewportSize();
      if (!box || !viewport) return false;
      return (
        box.x >= 0 &&
        box.y >= 0 &&
        box.x + box.width <= viewport.width &&
        box.y + box.height <= viewport.height
      );
    })
    .toBeTruthy();
  await menuPanel.screenshot({
    path: "test-results/mobile-user-menu.png",
  });
  await page.goBack();
  await expect(page.getByTestId("project-list")).toBeVisible();
  await page.getByRole("main").screenshot({
    path: "test-results/mobile-projects.png",
  });
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

test("project control bar sticks beneath the top nav", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await login(page);
  await openProject(page, "blueprints");

  const topNav = page.getByText("ARC // Raiders Outpost");
  const controlBar = page.getByTestId("project-control-bar");
  await expect(topNav).toBeVisible();
  await expect(controlBar).toBeVisible();

  const initialPositions = await page.evaluate(() => {
    const nav = document
      .evaluate(
        "//*[contains(text(), 'ARC // Raiders Outpost')]",
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      )
      .singleNodeValue as HTMLElement | null;
    const bar = document.querySelector(
      '[data-testid="project-control-bar"]'
    ) as HTMLElement | null;
    if (!nav || !bar) return null;
    return {
      navBottom: nav.getBoundingClientRect().bottom,
      barTop: bar.getBoundingClientRect().top,
    };
  });
  expect(initialPositions).toBeTruthy();
  if (!initialPositions) return;
  expect(initialPositions.barTop).toBeGreaterThan(
    initialPositions.navBottom - 1
  );

  await page.mouse.wheel(0, 1200);
  await page.waitForTimeout(100);

  const barTopAfterScroll = await page.evaluate(() => {
    const bar = document.querySelector(
      '[data-testid="project-control-bar"]'
    ) as HTMLElement | null;
    return bar?.getBoundingClientRect().top ?? null;
  });
  expect(barTopAfterScroll).not.toBeNull();
  if (barTopAfterScroll === null) return;
  expect(barTopAfterScroll).toBeLessThanOrEqual(1);
});

test("project list navigates to project detail", async ({ page }) => {
  await login(page);
  await setActiveExpedition(page, "expedition_project");
  await openProject(page, "expedition_project");
  await expect(page.getByText("Foundation")).toBeVisible();
});

test("onboarding baseline completes selected stage", async ({ page }) => {
  const onboarding = await getOnboardingProjects(page);
  const project = onboarding.projects.find(
    (entry) => !entry.isExpedition && entry.stages.length > 0
  );
  if (!project) {
    test.skip(true, "No onboarding project with stages available.");
    return;
  }

  const stage = project.stages[0];

  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
  });
  await page.reload();
  await expect(page.getByText("ARC// AUTH LINK")).toBeVisible();
  await page.getByLabel("Operator Name").fill("Baseline");
  const projectComplete = page.getByTestId(
    `onboarding-project-complete-${project.slug}`
  );
  await expect(projectComplete).toBeVisible();
  await projectComplete.click();
  const authPanel = page.locator(".arc-panel").first();
  await authPanel.screenshot({
    path: "test-results/onboarding-baseline.png",
  });
  await page.getByRole("button", { name: "Link Uplink" }).click();
  await expect(page.getByTestId("project-list")).toBeVisible();
  await openProject(page, project.slug);

  const stagePanel = page.locator(`[data-stage-key="${stage.stageKey}"]`);
  await expect(stagePanel).toBeVisible();
  const countValue = await stagePanel
    .locator("[data-stage-count]")
    .getAttribute("data-stage-count");
  expect(countValue).toBeTruthy();
  const match = countValue?.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (!match) {
    throw new Error(`Unexpected stage count format: ${countValue}`);
  }
  expect(Number(match[1])).toBe(Number(match[2]));
});

test("onboarding next expedition sets active expedition", async ({ page }) => {
  const onboarding = await getOnboardingProjects(page);
  const expedition = onboarding.projects.find((entry) => entry.isExpedition);
  if (!expedition) {
    test.skip(true, "No expedition project available.");
    return;
  }

  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
  });
  await page.reload();
  await expect(page.getByText("ARC// AUTH LINK")).toBeVisible();
  await page.getByLabel("Operator Name").fill("Scout");
  const nextToggle = page.getByTestId(
    `onboarding-expedition-next-${expedition.slug}`
  );
  await expect(nextToggle).toBeVisible();
  await nextToggle.click();
  await page.getByRole("button", { name: "Link Uplink" }).click();
  await expect(page.getByTestId("project-list")).toBeVisible();
  await expect(
    page.getByTestId(`project-card-${expedition.slug}`)
  ).toBeVisible();
});

test("project list shows progress counts and ring", async ({ page }) => {
  await login(page);
  const card = page.getByTestId("project-card-blueprints");
  await expect(card).toBeVisible();
  const count = card.locator("[data-project-count]");
  await expect(count).toBeVisible();
  const countValue = await count.getAttribute("data-project-count");
  expect(countValue).toBeTruthy();
  const match = countValue?.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (!match) {
    throw new Error(`Unexpected project count format: ${countValue}`);
  }
  const ring = card.locator("[data-project-progress]");
  await expect(ring).toBeVisible();
  await card.screenshot({
    path: "test-results/project-list-progress.png",
  });
});

test("hideout benches appear in project list", async ({ page }) => {
  await login(page);
  await openProject(page, "weapon_bench");
  await expect(page.getByRole("heading", { name: "Gunsmith" })).toBeVisible();
  await expect(page.getByText("Level 01")).toBeVisible();
  await expect(page.locator('[data-item-id="metal_parts"]')).toBeVisible();
  await page.getByRole("main").screenshot({
    path: "test-results/hideout-weapon-bench.png",
  });
});

test("hideout projects are ordered after other projects", async ({ page }) => {
  await login(page);
  const hideoutSlugs = [
    "equipment_bench",
    "explosives_bench",
    "med_station",
    "refiner",
    "scrappy",
    "stash",
    "utility_bench",
    "weapon_bench",
    "workbench",
  ];
  const list = page.getByTestId("project-list");
  await expect(list).toBeVisible();

  const slugs = await list.evaluate((node) => {
    return Array.from(
      node.querySelectorAll('[data-testid^="project-card-"]')
    )
      .map((card) => card.getAttribute("data-testid"))
      .filter((value): value is string => Boolean(value))
      .map((value) => value.replace("project-card-", ""));
  });

  const hideoutIndices = slugs
    .map((slug, index) => (hideoutSlugs.includes(slug) ? index : -1))
    .filter((index) => index >= 0);
  expect(hideoutIndices.length).toBeGreaterThan(0);
  const firstHideoutIndex = Math.min(...hideoutIndices);
  const nonHideoutAfter = slugs
    .slice(firstHideoutIndex)
    .filter((slug) => !hideoutSlugs.includes(slug));
  expect(nonHideoutAfter).toHaveLength(0);

  await list.screenshot({
    path: "test-results/project-list-order.png",
  });
});

test("search filters project items", async ({ page }) => {
  await login(page);
  await setActiveExpedition(page, "expedition_project");
  await openProject(page, "expedition_project");

  const search = page.getByPlaceholder("SEARCH...");
  await search.fill("Battery");
  await expect(page.locator('[data-item-id="battery"]')).toBeVisible();
  await expect(page.locator('[data-item-id="metal-parts"]')).toHaveCount(0);
});

test("trophy display includes queen reactor", async ({ page }) => {
  await login(page);
  await openProject(page, "trophy_display_project");
  await expect(page.locator('[data-item-id="queen_reactor"]')).toBeVisible();
});

test("blueprints show multiple blueprint items", async ({ page }) => {
  await login(page);
  await openProject(page, "blueprints");
  const blueprints = page.locator('[data-item-id*="_blueprint"]');
  await expect(blueprints.first()).toBeVisible();
  await expect.poll(async () => blueprints.count()).toBeGreaterThan(10);
});

test("stage progress shows completed and total counts", async ({ page }) => {
  await login(page);
  await openProject(page, "blueprints");

  const stagePanel = page.locator("[data-stage-key]").first();
  const count = stagePanel.locator("[data-stage-count]");
  await expect(count).toBeVisible();
  const countValue = await count.getAttribute("data-stage-count");
  expect(countValue).toBeTruthy();
  const match = countValue?.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (!match) {
    throw new Error(`Unexpected stage count format: ${countValue}`);
  }
  const total = Number(match[2]);
  const tileCount = await stagePanel.locator("[data-item-id]").count();
  expect(tileCount).toBe(total);

  await stagePanel.screenshot({
    path: "test-results/stage-progress-count.png",
  });
});

test("rarity tile background matches arc effect", async ({ page }) => {
  await login(page);
  await setActiveExpedition(page, "expedition_project");
  await openProject(page, "expedition_project");

  const tile = page.locator("[data-item-id]").first();
  await expect(tile).toBeVisible();

  const backgroundImage = await tile.evaluate(
    (node) => getComputedStyle(node).backgroundImage
  );
  expect(backgroundImage).not.toContain("blueprint-bg");
  expect(backgroundImage).toContain("radial-gradient");
  await tile.screenshot({ path: "test-results/rarity-tile.png" });
});

test("needed-only hides completed items", async ({ page }) => {
  await login(page);
  await expect(page.getByTestId("project-list")).toBeVisible();
  await openProject(page, "blueprints");

  const firstTile = page.locator("[data-item-id]").first();
  const itemId = await firstTile.getAttribute("data-item-id");
  await incrementTile(firstTile);

  const filterButton = page.getByRole("button", { name: "Needed Only" });
  await filterButton.click();
  await expect(filterButton).toHaveAttribute("aria-pressed", "true");
  if (itemId) {
    await expect(page.locator(`[data-item-id="${itemId}"]`)).toHaveCount(0);
  }
});

test("project item quantity persists", async ({ page }) => {
  await login(page);
  await openProject(page, "blueprints");
  const identity = await getLocalIdentity(page);
  expect(identity.token).toBeTruthy();

  const firstTile = page.locator("[data-item-id]").first();
  await expect(firstTile).toBeVisible();
  const persistRequest = page.waitForResponse((response) => {
    return (
      response.url().includes("/api/projects") &&
      response.request().method() === "PATCH" &&
      response.ok()
    );
  });
  await incrementTile(firstTile);
  await persistRequest;

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
  expect(ownedCount).toBeGreaterThan(0);

  await page.reload();
  await expect.poll(async () => {
    const stored = await getLocalIdentity(page);
    return stored.token;
  }).toBe(identity.token);
  await expect(page.getByTestId("user-menu-trigger")).toContainText(
    "Vanguard"
  );
  await expect(page).toHaveURL(/\/projects\/blueprints$/);
  await expect
    .poll(async () => {
      const qty = await firstTile.getAttribute("data-quantity");
      return qty;
    })
    .toBe("1");
});

test("project tiles show community ownership", async ({ page, browser }) => {
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

  await page.getByRole("link", { name: "Projects", exact: true }).click();
  await expect(page.getByTestId("project-list")).toBeVisible();
  await openProject(page, "blueprints");

  const firstTile = page.locator("[data-item-id]").first();
  const persistRequest = page.waitForResponse((response) => {
    return (
      response.url().includes("/api/projects") &&
      response.request().method() === "PATCH" &&
      response.ok()
    );
  });
  await incrementTile(firstTile);
  await persistRequest;
  await expect
    .poll(async () => getTileQuantity(firstTile))
    .toBeGreaterThan(0);

  await invitePage.goto("/");
  await expect(invitePage.getByTestId("project-list")).toBeVisible();
  await openProject(invitePage, "blueprints");

  const targetTile = invitePage.locator("[data-item-id]").first();
  const progressRing = targetTile.locator("[data-community-progress]");
  await expect(progressRing).toBeVisible();
  await expect(progressRing).toHaveAttribute("data-community-progress", "50");
  await progressRing.screenshot({
    path: "test-results/project-community-progress.png",
  });

  await context.close();
});

test("community needs overview aggregates and filters by member", async ({
  page,
  browser,
}) => {
  await login(page, "Atlas");

  const identity = await getLocalIdentity(page);
  const user = await prisma.user.findUnique({
    where: { token: identity.token ?? "" },
    select: { id: true },
  });
  if (!user) {
    throw new Error("Missing user for community needs test.");
  }

  const existingMembership = await prisma.communityMember.findUnique({
    where: { userId: user.id },
    include: { community: true },
  });

  const communityName = existingMembership?.community.name ?? "Needline";
  let inviteCode = existingMembership?.community.inviteCode ?? "";
  if (!inviteCode) {
    const created = await prisma.community.create({
      data: {
        name: communityName,
        inviteCode: `need-${Math.random().toString(36).slice(2, 8)}`,
        members: { create: { userId: user.id } },
      },
      select: { inviteCode: true },
    });
    inviteCode = created.inviteCode;
  }

  const origin = await page.evaluate(() => window.location.origin);
  const inviteLink = `${origin}/community?invite=${inviteCode}`;

  await page.getByRole("link", { name: "Community", exact: true }).click();
  await expect(page.getByText(communityName)).toBeVisible();

  const context = await browser.newContext();
  const invitePage = await context.newPage();
  await invitePage.goto(inviteLink);
  await expect(invitePage.getByText("ARC// AUTH LINK")).toBeVisible();
  await invitePage.getByLabel("Operator Name").fill("Warden");
  await invitePage.getByRole("button", { name: "Link Uplink" }).click();
  await expect(invitePage.getByText(communityName)).toBeVisible();

  await page.reload();
  await expect(page.getByText(communityName)).toBeVisible();

  const panel = page.getByTestId("community-needs-panel");
  await expect(panel).toBeVisible();
  await expect(panel.getByPlaceholder("SEARCH...")).toHaveCount(0);
  await panel.screenshot({
    path: "test-results/community-needs-panel.png",
  });
  const firstRow = panel.locator("[data-item-id]").first();
  await expect(firstRow).toBeVisible();
  const itemId = await firstRow.getAttribute("data-item-id");
  expect(itemId).toBeTruthy();
  const targetRow = panel.locator(`[data-item-id="${itemId}"]`);
  const totalBefore = Number(await targetRow.getAttribute("data-total-needed"));
  expect(totalBefore).toBeGreaterThan(0);

  await firstRow.click();
  const overlay = page.getByTestId("community-need-overlay");
  await expect(overlay).toBeVisible();
  await overlay.screenshot({
    path: "test-results/community-needs-overlay.png",
  });
  const backdrop = page.getByTestId("community-need-backdrop");
  await expect(backdrop).toBeVisible();
  await backdrop.click({ position: { x: 5, y: 5 } });
  await expect(overlay).toBeHidden();

  const wardenToggle = panel.getByRole("button", { name: "Warden" });
  await expect(wardenToggle).toBeVisible();
  await wardenToggle.click();

  await expect
    .poll(async () => {
      const value = await targetRow.getAttribute("data-total-needed");
      return Number(value ?? "0");
    })
    .toBeLessThan(totalBefore);

  const firstGroupToggle = panel.getByRole("button", { name: "Hide" }).first();
  await expect(firstGroupToggle).toBeVisible();
  await firstGroupToggle.click();
  const showToggle = panel.getByRole("button", { name: "Show" }).first();
  await expect(showToggle).toBeVisible();

  await context.close();
});

test("expedition selection filters community needs", async ({ page }) => {
  const expedition = getUniqueExpeditionItem();
  if (!expedition) {
    throw new Error("No unique expedition item found for test.");
  }

  await login(page, "Tracer");

  const identity = await getLocalIdentity(page);
  const user = await prisma.user.findUnique({
    where: { token: identity.token ?? "" },
    select: { id: true },
  });
  if (!user) {
    throw new Error("Missing user for expedition selection test.");
  }

  const existingMembership = await prisma.communityMember.findUnique({
    where: { userId: user.id },
    include: { community: true },
  });

  const communityName = existingMembership?.community.name ?? "ExpeditionLine";
  if (!existingMembership) {
    await prisma.community.create({
      data: {
        name: communityName,
        inviteCode: `exp-${Math.random().toString(36).slice(2, 8)}`,
        members: { create: { userId: user.id } },
      },
    });
  }

  await page.getByRole("link", { name: "Community", exact: true }).click();
  await expect(page.getByText(communityName)).toBeVisible();

  const panel = page.getByTestId("community-needs-panel");
  await expect(panel).toBeVisible();

  await expect(
    panel.locator(`[data-item-id="${expedition.itemId}"]`)
  ).toHaveCount(0);

  await openUserMenu(page);
  const expeditionOption = page.getByTestId(
    `expedition-option-${expedition.projectSlug}`
  );
  await expect(expeditionOption).toBeVisible();
  await expeditionOption.click();
  await expect(expeditionOption).toHaveAttribute("aria-pressed", "true");
  await page.getByTestId("expedition-config").screenshot({
    path: "test-results/expedition-config.png",
  });

  await page.getByRole("link", { name: "Community", exact: true }).click();
  await expect(page.getByText(communityName)).toBeVisible();

  const panelAfter = page.getByTestId("community-needs-panel");
  await expect(panelAfter).toBeVisible();
  await expect(
    panelAfter.locator(`[data-item-id="${expedition.itemId}"]`)
  ).toHaveCount(1);
});

test("mobile longpress increments quantity repeatedly", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await login(page);
  await openProject(page, "blueprints");

  await expect(page.locator("[data-item-id]").first()).toBeVisible();

  const tiles = page.locator("[data-item-id]");
  const tileCount = await tiles.count();
  let targetIndex = -1;
  for (let i = 0; i < tileCount; i += 1) {
    const required = await tiles.nth(i).getAttribute("data-required");
    if (required !== null && Number(required) > 0) {
      targetIndex = i;
      break;
    }
  }

  if (targetIndex < 0) {
    throw new Error("No tile found for longpress test.");
  }

  const tile = tiles.nth(targetIndex);
  const increaseButton = tile.getByTestId("qty-plus");
  await expect(increaseButton).toBeVisible();

  await increaseButton.dispatchEvent("pointerdown", {
    pointerType: "touch",
    button: 0,
  });
  await page.waitForTimeout(120);
  await increaseButton.dispatchEvent("pointerup", {
    pointerType: "touch",
    button: 0,
  });

  await expect
    .poll(async () => {
      const value = await tile.getAttribute("data-quantity");
      return Number(value ?? "0");
    })
    .toBeGreaterThan(0);
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
  await openUserMenu(page);
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

  await openUserMenu(page);
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
  await openUserMenu(page);
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
  await expect(page.getByTestId("community-invite-tile")).toBeVisible();
  await expect(page.getByTestId("community-member-count")).toContainText(
    "Members (1)"
  );
  await page.getByRole("main").screenshot({
    path: "test-results/community-roster.png",
  });

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

test("project list includes blueprints", async ({ page }) => {
  await login(page);
  await expect(page.getByTestId("project-card-blueprints")).toBeVisible();
});

test("language switch toggles localized project and item names", async ({
  browser,
}) => {
  const context = await browser.newContext({ locale: "de-DE" });
  const page = await context.newPage();

  await login(page, "Vanguard");
  await setActiveExpedition(page, "expedition_project");

  const expeditionCard = page.getByTestId("project-card-expedition_project");
  await expect(expeditionCard).toBeVisible();
  await expect(expeditionCard).toContainText(/Expedition/i);
  await page.getByRole("main").screenshot({
    path: "test-results/language-switch-de.png",
  });

  await openProject(page, "expedition_project");
  const batteryTile = page.locator('[data-item-id="battery"]');
  await expect(batteryTile).toContainText(/Akku/i);

  await page.getByTestId("language-option-en").click();
  await expect(
    page.getByRole("heading", { name: "Expedition Project" })
  ).toBeVisible();
  await expect(batteryTile).toContainText("Battery");

  await context.close();
});
