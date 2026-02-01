import { expect, test } from "@playwright/test";
import { login, syncIdentity } from "./helpers";

const uniqueName = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

test("community can be created, joined via invite, and members removed", async ({
  page,
  browser,
}) => {
  await login(page, "Vanguard");
  await page.getByRole("link", { name: "Community", exact: true }).click();
  await expect(page.getByText("Roster")).toBeVisible();

  const communityName = uniqueName("Echo");
  await page.getByLabel("Community Name").fill(communityName);
  await page.getByRole("button", { name: "Create Community" }).click();
  await expect(page.getByText(communityName)).toBeVisible();

  const inviteLink = await page.getByLabel("Invite link").inputValue();
  expect(inviteLink).toContain("/community?invite=");

  const context = await browser.newContext();
  const invitePage = await context.newPage();
  await invitePage.goto(inviteLink);
  await syncIdentity(invitePage, "Nomad");
  await expect(invitePage.getByText(communityName)).toBeVisible();
  await context.close();

  await page.reload();
  await expect(
    page
      .getByTestId("community-members")
      .getByText("Nomad", { exact: true })
  ).toBeVisible();

  const memberRow = page
    .getByTestId("community-members")
    .locator("div", { hasText: "Nomad" })
    .first();
  await memberRow.getByRole("button", { name: "Sever Uplink" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();

  await expect(
    page
      .getByTestId("community-members")
      .getByText("Nomad", { exact: true })
  ).toBeHidden();
});
