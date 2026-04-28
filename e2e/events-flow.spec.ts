import { expect, test, type Page } from "@playwright/test";

const TIMEOUT = 20_000;

async function waitForApp(page: Page) {
  await expect(page.getByRole("button", { name: "Today" })).toBeVisible({
    timeout: TIMEOUT,
  });
}

async function openEventModalOnTodayColumn(page: Page) {
  const todayCol = page.locator(".col.today");
  await todayCol.locator('button[aria-label="Add event"]').click();
  await expect(page.getByRole("dialog", { name: "Event" })).toBeVisible({
    timeout: TIMEOUT,
  });
}

test("create a timed event from the today column", async ({ page }) => {
  const runId = Date.now();
  const title = `Standup ${runId}`;

  await page.goto("/");
  await waitForApp(page);
  await openEventModalOnTodayColumn(page);

  await page.getByLabel("Title").fill(title);
  await page.getByLabel(/^Time/).fill("09:00");
  await page.getByRole("button", { name: "Create" }).click();

  await expect(page.getByText(title)).toBeVisible({ timeout: TIMEOUT });
  await expect(page.getByText("09:00")).toBeVisible({ timeout: TIMEOUT });
});

test("create an untimed (all-day) event", async ({ page }) => {
  const runId = Date.now();
  const title = `Birthday ${runId}`;

  await page.goto("/");
  await waitForApp(page);
  await openEventModalOnTodayColumn(page);

  await page.getByLabel("Title").fill(title);
  await page.getByRole("button", { name: "Create" }).click();

  await expect(page.getByText(title)).toBeVisible({ timeout: TIMEOUT });
});
