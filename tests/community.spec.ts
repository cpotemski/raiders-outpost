import { expect, test } from "@playwright/test";
import { getLocalIdentity, login, syncIdentity } from "./helpers";

const uniqueName = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

test("community defaults to manage mode when no community exists", async ({ page }) => {
  await login(page, uniqueName("FreshRaider"));
  await page.getByTestId("nav-community").click();

  await expect(page.getByTestId("community-mode-switch")).toBeVisible();
  await expect(page.getByTestId("community-mode-manage")).toHaveAttribute(
    "aria-pressed",
    "true"
  );
  await expect(page.getByTestId("community-mode-needs")).toBeDisabled();
  await expect(page.getByTestId("community-empty-panel")).toBeVisible();
});

test("community can be joined across multiple communities and members removed", async ({
  page,
  browser,
}) => {
  await login(page, "Vanguard");
  await page.getByTestId("nav-community").click();
  await expect(page.getByTestId("community-name-input")).toBeVisible();

  const alphaCommunityName = uniqueName("Echo");
  await page.getByTestId("community-name-input").fill(alphaCommunityName);
  await page.getByTestId("community-create-submit").click();
  await expect(page.getByTestId("community-mode-needs")).toHaveAttribute(
    "aria-pressed",
    "true"
  );

  await page.getByTestId("community-mode-manage").click();
  await page.getByTestId(/community-copy-invite-/).first().click();
  const alphaInviteLink = await page.getByTestId("community-invite-link-input").inputValue();
  await page.getByTestId("community-invite-close").click();
  expect(alphaInviteLink).toContain("/community?invite=");

  const nomadContext = await browser.newContext();
  const nomadPage = await nomadContext.newPage();
  await nomadPage.goto(alphaInviteLink);
  await syncIdentity(nomadPage, "Nomad");
  await nomadPage.goto(alphaInviteLink);
  await expect(nomadPage.getByText(alphaCommunityName, { exact: true })).toBeVisible();
  await nomadContext.close();

  const scoutContext = await browser.newContext();
  const scoutPage = await scoutContext.newPage();
  await login(scoutPage, "Scout");
  await scoutPage.getByTestId("nav-community").click();
  const betaCommunityName = uniqueName("Haven");
  await scoutPage.getByTestId("community-name-input").fill(betaCommunityName);
  await scoutPage.getByTestId("community-create-submit").click();
  await expect(scoutPage.getByText(betaCommunityName, { exact: true })).toBeVisible();
  await scoutPage.getByTestId("community-mode-manage").click();
  await scoutPage.getByTestId(/community-copy-invite-/).first().click();
  const betaInviteLink = await scoutPage
    .getByTestId("community-invite-link-input")
    .inputValue();
  await scoutPage.getByTestId("community-invite-close").click();
  await scoutContext.close();

  const betaInviteCode = new URL(betaInviteLink).searchParams.get("invite");
  if (!betaInviteCode) {
    throw new Error("Beta invite code missing.");
  }
  const vanguardIdentity = await getLocalIdentity(page);
  if (!vanguardIdentity.token) {
    throw new Error("Missing Vanguard token.");
  }
  const joinBetaResponse = await page.request.post("/api/community/join", {
    headers: {
      "Content-Type": "application/json",
      "x-arc-token": vanguardIdentity.token,
    },
    data: { code: betaInviteCode },
  });
  if (!joinBetaResponse.ok()) {
    throw new Error(`Failed to join beta community: ${joinBetaResponse.status()}`);
  }

  await page.goto("/community");
  await expect(page.getByText(betaCommunityName, { exact: true })).toBeVisible();
  await page.getByTestId("community-mode-manage").click();
  const gammaCommunityName = uniqueName("Forge");
  await page.getByTestId("community-create-open").click();
  await expect(page.getByTestId("community-create-dialog")).toBeVisible();
  await page.getByTestId("community-name-input").fill(gammaCommunityName);
  await page.getByTestId("community-create-submit").click();
  await expect(page.getByText(gammaCommunityName, { exact: true })).toBeVisible();

  const communityFilters = page.getByTestId(/community-filter-(?!hide-easy)/);
  await page.getByTestId("community-mode-needs").click();
  await expect(communityFilters.first()).toBeVisible();
  const hideEasyToggle = page.getByTestId("community-filter-hide-easy");
  await expect(hideEasyToggle).toHaveAttribute("aria-pressed", "true");

  const memberFilters = page.getByTestId(/community-member-filter-/);
  await expect(memberFilters.first()).toBeVisible();

  const vanguardIdentityAfterJoin = await getLocalIdentity(page);
  if (!vanguardIdentityAfterJoin.token) {
    throw new Error("Missing Vanguard token after join.");
  }
  const communitiesResponse = await page.request.get("/api/community", {
    headers: {
      "x-arc-token": vanguardIdentityAfterJoin.token,
    },
  });
  if (!communitiesResponse.ok()) {
    throw new Error(`Failed to load communities: ${communitiesResponse.status()}`);
  }
  const communitiesPayload = (await communitiesResponse.json()) as {
    communities?: Array<{ id: string }>;
  };
  const selectedCommunityIds =
    communitiesPayload.communities?.map((community) => community.id) ?? [];
  if (!selectedCommunityIds.length) {
    throw new Error("Expected at least one community.");
  }
  const needsResponse = await page.request.get(
    `/api/community/needs?locale=en&communityIds=${encodeURIComponent(
      selectedCommunityIds.join(",")
    )}&hideEasy=false`,
    {
      headers: {
        "x-arc-token": vanguardIdentityAfterJoin.token,
      },
    }
  );
  if (!needsResponse.ok()) {
    throw new Error(`Failed to load community needs: ${needsResponse.status()}`);
  }
  const needsPayload = (await needsResponse.json()) as {
    items?: Array<{ itemId: string }>;
  };
  const easyCandidateId = needsPayload.items?.[0]?.itemId;
  if (!easyCandidateId) {
    throw new Error("Expected at least one needed item.");
  }
  const saveEasyResponse = await page.request.patch(
    "/api/admin/settings?password=playwright",
    {
      data: {
        easyItemIds: [easyCandidateId],
      },
    }
  );
  if (!saveEasyResponse.ok()) {
    throw new Error(`Failed to save easy items: ${saveEasyResponse.status()}`);
  }

  await page.reload();
  await page.getByTestId("community-mode-needs").click();
  await expect(hideEasyToggle).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId(`community-need-${easyCandidateId}`)).toHaveCount(0);
  await hideEasyToggle.click();
  await expect(hideEasyToggle).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByTestId(`community-need-${easyCandidateId}`)).toBeVisible();

  const firstMemberFilter = memberFilters.first();
  const disabledMemberId = await firstMemberFilter.getAttribute("data-member-id");
  if (!disabledMemberId) {
    throw new Error("Missing member filter id.");
  }
  const memberFilterToDisable = page.getByTestId(
    `community-member-filter-${disabledMemberId}`
  );
  await memberFilterToDisable.click();
  await expect(memberFilterToDisable).toHaveAttribute("aria-pressed", "false");

  await page.reload();
  await expect(communityFilters.first()).toBeVisible();
  const memberFilterAfterReload = page.getByTestId(
    `community-member-filter-${disabledMemberId}`
  );
  await expect(memberFilterAfterReload).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByTestId("community-needs-panel")).toBeVisible();
  await page
    .getByTestId("community-needs-panel")
    .screenshot({ path: "test-results/community-needs-all.png" });

  const communityFilterToDisable = communityFilters.first();
  await communityFilterToDisable.click();
  await expect(communityFilterToDisable).toHaveAttribute("aria-pressed", "false");
  await page.reload();
  await expect(communityFilterToDisable).toHaveAttribute("aria-pressed", "false");

  await page.getByTestId("community-mode-manage").click();
  await expect(page.getByTestId("community-management-list")).toBeVisible();

  const alphaManageCard = page.getByTestId(/community-manage-/).filter({
    hasText: alphaCommunityName,
  });
  const alphaToggle = alphaManageCard.getByTestId(/community-toggle-/).first();
  const alphaExpanded = await alphaToggle.getAttribute("aria-expanded");
  if (alphaExpanded !== "true") {
    await alphaToggle.click();
  }
  await expect(
    alphaManageCard
      .getByText("Nomad", { exact: true })
  ).toBeVisible();

  await alphaManageCard
    .getByRole("button", { name: /Remove Nomad|Entfernen Nomad/ })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();

  await expect(
    alphaManageCard
      .getByText("Nomad", { exact: true })
  ).toBeHidden();
});
