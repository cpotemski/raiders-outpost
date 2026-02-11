import { expect, test } from "@playwright/test";
import { login, syncIdentity } from "./helpers";

const uniqueName = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

test("community can be joined across multiple communities and members removed", async ({
  page,
  browser,
}) => {
  await login(page, "Vanguard");
  await page.getByRole("link", { name: /Community/ }).click();
  await expect(page.locator("#community-name")).toBeVisible();

  const alphaCommunityName = uniqueName("Echo");
  await page.locator("#community-name").fill(alphaCommunityName);
  await page.locator('form:has(#community-name) button[type="submit"]').click();
  await expect(
    page.getByRole("heading", { name: alphaCommunityName, exact: true })
  ).toBeVisible();

  const alphaInviteLink = await page
    .getByTestId(/community-invite-tile-/)
    .first()
    .getByLabel("Invite link")
    .inputValue();
  expect(alphaInviteLink).toContain("/community?invite=");

  const nomadContext = await browser.newContext();
  const nomadPage = await nomadContext.newPage();
  await nomadPage.goto(alphaInviteLink);
  await syncIdentity(nomadPage, "Nomad");
  await expect(
    nomadPage.getByRole("heading", { name: alphaCommunityName, exact: true })
  ).toBeVisible();
  await nomadContext.close();

  const scoutContext = await browser.newContext();
  const scoutPage = await scoutContext.newPage();
  await login(scoutPage, "Scout");
  await scoutPage.getByRole("link", { name: /Community/ }).click();
  const betaCommunityName = uniqueName("Haven");
  await scoutPage.locator("#community-name").fill(betaCommunityName);
  await scoutPage
    .locator('form:has(#community-name) button[type="submit"]')
    .click();
  await expect(
    scoutPage.getByRole("heading", { name: betaCommunityName, exact: true })
  ).toBeVisible();
  const betaInviteLink = await scoutPage
    .getByTestId(/community-invite-tile-/)
    .first()
    .getByLabel("Invite link")
    .inputValue();
  await scoutContext.close();

  await page.goto(betaInviteLink);
  await expect(
    page.getByRole("heading", { name: betaCommunityName, exact: true })
  ).toBeVisible();

  const communityFilters = page.getByTestId(/community-filter-/);
  await expect(communityFilters.first()).toBeVisible();
  const communityFilterCount = await communityFilters.count();

  const memberFilters = page.getByTestId(/community-member-filter-/);
  await expect(memberFilters.first()).toBeVisible();

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

  const alphaManageCard = page.getByTestId(/community-manage-/).filter({
    has: page.getByRole("heading", { name: alphaCommunityName, exact: true }),
  });
  await expect(
    alphaManageCard
      .getByText("Nomad", { exact: true })
  ).toBeVisible();

  await alphaManageCard
    .getByRole("button", { name: /Remove User Nomad|Sever Uplink Nomad/ })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();

  await expect(
    alphaManageCard
      .getByText("Nomad", { exact: true })
  ).toBeHidden();
});
