import { expect, test } from "@playwright/test";

test("account and workspace storage update across companies in French and English", async ({
  page,
}) => {
  await page.route("**/storage-usage-harness", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<html><head><meta name="viewport" content="width=device-width, initial-scale=1"/></head><body><div id="root"></div><script type="module">import RefreshRuntime from '/@react-refresh'; RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;await import('/tests/fixtures/storage-usage-harness.tsx');</script></body></html>`,
    }),
  );
  await page.route("**/rest/v1/rpc/read_storage_usage", async (route) => {
    const { p_org } = route.request().postDataJSON() as { p_org: string };
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        account_limit_bytes: 1_000_000_000,
        account_used_bytes: 850_000_000,
        account_reserved_bytes: 100_000_000,
        workspace_limit_bytes: 1_000_000_000,
        workspace_used_bytes: p_org === "first" ? 100_000_000 : 500_000_000,
        workspace_reserved_bytes: 0,
      }),
    });
  });
  await page.goto("/storage-usage-harness");
  const usage = page.getByRole("region", { name: "Stockage" });
  await expect(usage).toContainText("850 Mo utilisés");
  await expect(usage).toContainText("100 Mo réservés");
  await expect(usage).toContainText("Il reste très peu");
  await page.getByRole("button", { name: "Switch company" }).click();
  await expect(usage).toContainText("500 Mo utilisés");
  await page.getByRole("button", { name: "Language" }).click();
  await expect(page.getByRole("region", { name: "Storage" })).toContainText(
    "850 MB used",
  );
  await expect(
    page.getByRole("progressbar", { name: "Account · all your companies" }),
  ).toBeVisible();
  await expect(
    page.getByRole("progressbar", { name: "This company" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
