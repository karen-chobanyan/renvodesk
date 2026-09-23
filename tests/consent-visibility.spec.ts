import { expect, test } from "@playwright/test";

test("cookie controls remain available without production telemetry", async ({
  page,
}) => {
  const providerRequests: string[] = [];
  page.on("request", (request) => {
    if (/googletagmanager|google-analytics|ingest.*sentry/.test(request.url()))
      providerRequests.push(request.url());
  });
  await page.goto("/en/");
  const trigger = page.getByRole("button", {
    name: "Cookie Settings",
    exact: true,
  });
  const panel = page.locator("#privacy-panel");
  await expect(trigger).toBeVisible();
  await expect(panel).toBeVisible();
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(panel).toBeVisible();
  await page.getByRole("button", { name: "Reject all", exact: true }).click();
  await page.reload();
  await expect(panel).toHaveCount(0);
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(panel).toBeVisible();
  await page.getByRole("button", { name: "Accept all", exact: true }).click();
  await page.reload();
  await expect(panel).toHaveCount(0);
  expect(providerRequests).toEqual([]);
});
