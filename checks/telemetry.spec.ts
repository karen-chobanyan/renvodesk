import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, type Page, test } from "@playwright/test";

const origin = "https://renvodesk.com";
const key = "renvodesk-privacy-v1";
async function serve(page: Page) {
  const external: { url: string; body: string }[] = [];
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== origin) {
      external.push({ url: request.url(), body: request.postData() ?? "" });
      // No request from these tests ever reaches Google, Sentry or Supabase.
      return route.fulfill({
        status: 200,
        contentType: url.hostname.includes("googletagmanager")
          ? "application/javascript"
          : "application/json",
        body: url.hostname.includes("googletagmanager")
          ? "/* test transport: inspect dataLayer without contacting Google */"
          : "{}",
      });
    }
    let file = url.pathname;
    if (file === "/") file = "/index.html";
    else if (file === "/en/") file = "/en/index.html";
    else if (/^\/(en\/)?privacy\/?$/.test(file))
      file = `${file.replace(/\/$/, "")}/index.html`;
    else if (!path.extname(file)) file = "/app.html";
    const resolved = path.resolve("dist", `.${file}`);
    if (!resolved.startsWith(`${path.resolve("dist")}/`)) return route.abort();
    try {
      const body = await readFile(resolved);
      const type =
        {
          ".html": "text/html",
          ".js": "application/javascript",
          ".css": "text/css",
          ".svg": "image/svg+xml",
          ".png": "image/png",
          ".jpg": "image/jpeg",
          ".woff2": "font/woff2",
        }[path.extname(resolved)] ?? "application/octet-stream";
      await route.fulfill({ status: 200, contentType: type, body });
    } catch {
      await route.fulfill({ status: 404, body: "Not found" });
    }
  });
  return external;
}
async function commands(page: Page) {
  return page.evaluate(() =>
    (window.dataLayer ?? []).map((value) =>
      Array.from(value as ArrayLike<unknown>),
    ),
  );
}

test("basic consent: no providers before opt-in, persistence, withdrawal and no unsafe page metadata", async ({
  page,
}, info) => {
  const external = await serve(page);
  await page.goto(`${origin}/en/?customer=PRIVATE#access_token=PRIVATE`);
  await expect(
    page.getByRole("heading", { name: "Your privacy preferences" }),
  ).toBeVisible();
  expect(external).toEqual([]);
  await page.getByRole("button", { name: "Reject all", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Privacy settings", exact: true }),
  ).toBeVisible();
  await expect(page.locator("#privacy-panel")).toHaveCount(0);
  expect(external).toEqual([]);
  await page
    .getByRole("button", { name: "Privacy settings", exact: true })
    .click();
  await page.getByLabel("Usage statistics", { exact: true }).check();
  await page.getByRole("button", { name: "Save my choices" }).click();
  await expect
    .poll(
      () => external.filter((r) => r.url.includes("googletagmanager")).length,
    )
    .toBe(1);
  expect(external.some((r) => r.url.includes("sentry"))).toBe(false);
  const ga = await commands(page);
  expect(JSON.stringify(ga)).not.toContain("PRIVATE");
  expect(ga.some((c) => c[0] === "config" && c[1] === "G-Y94L907Y9E")).toBe(
    true,
  );
  expect(
    ga.filter((c) => c[0] === "event" && c[1] === "page_view"),
  ).toHaveLength(1);
  await page
    .getByRole("button", { name: "Privacy settings", exact: true })
    .click();
  await page.screenshot({ path: info.outputPath("consent.png") });
  await page.getByRole("button", { name: "Reject all", exact: true }).click();
  await page
    .locator(".landing-hero-actions a")
    .first()
    .evaluate((anchor) => {
      anchor.addEventListener("click", (event) => event.preventDefault(), {
        once: true,
      });
    });
  const beforeClick = (await commands(page)).filter(
    (c) => c[0] === "event",
  ).length;
  await page.locator(".landing-hero-actions a").first().click();
  expect((await commands(page)).filter((c) => c[0] === "event")).toHaveLength(
    beforeClick,
  );
  const eventCount = (await commands(page)).filter(
    (c) => c[0] === "event",
  ).length;
  await page.locator(".landing-hero-actions a").first().click();
  await expect(page).toHaveURL(`${origin}/signup`);
  expect((await commands(page)).filter((c) => c[0] === "event")).toHaveLength(
    0,
  );
  expect(eventCount).toBe(1);
  expect(
    external.filter((r) => r.url.includes("googletagmanager")),
  ).toHaveLength(1);
  expect(await page.evaluate(() => document.cookie)).not.toContain("_ga");
});

test("diagnostics only: sanitized error envelope and withdrawal stops future reports", async ({
  page,
}) => {
  const external = await serve(page);
  await page.goto(`${origin}/en/`);
  await page.getByLabel("Technical error reports", { exact: true }).check();
  await page.getByRole("button", { name: "Save my choices" }).click();
  // Wait for the lazy SDK to initialize before generating a controlled test error.
  await page.waitForFunction(
    () => !!(window as unknown as { __SENTRY__?: unknown }).__SENTRY__,
  );
  await page.evaluate(() => {
    setTimeout(() => {
      throw new TypeError("PRIVATE customer@example.com access_token=secret");
    }, 0);
  });
  await expect
    .poll(() => external.filter((r) => r.url.includes("sentry.io")).length)
    .toBe(1);
  const report = external.find((r) => r.url.includes("sentry.io"))?.body ?? "";
  expect(report).toContain("Application error (message removed for privacy)");
  expect(report).not.toMatch(/PRIVATE|customer@example|access_token|secret/);
  expect(external.some((r) => r.url.includes("google"))).toBe(false);
  await page
    .getByRole("button", { name: "Privacy settings", exact: true })
    .click();
  await page.getByRole("button", { name: "Reject all", exact: true }).click();
  await page.evaluate(() => {
    setTimeout(() => {
      throw new Error("PRIVATE withdrawn");
    }, 0);
  });
  await page.waitForTimeout(300);
  expect(external.filter((r) => r.url.includes("sentry.io"))).toHaveLength(1);
});

test("French controls and expired consent do not silently enable tracking", async ({
  page,
}) => {
  const external = await serve(page);
  await page.addInitScript(
    ({ key }) =>
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 1,
          analytics: true,
          diagnostics: true,
          savedAt: 1,
        }),
      ),
    { key },
  );
  await page.goto(origin);
  await expect(
    page.getByRole("heading", { name: "Vos préférences de confidentialité" }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Statistiques d’utilisation", { exact: true }),
  ).not.toBeChecked();
  expect(external).toEqual([]);
  await page.getByRole("button", { name: "Tout refuser", exact: true }).click();
  await page
    .getByRole("button", { name: "Confidentialité", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#privacy-panel")).toBeVisible();
  await page
    .getByRole("link", { name: "Informations de confidentialité" })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Confidentialité et suivi optionnel",
  );
  expect(external).toEqual([]);
});

test("storage denial defaults back to no collection on reload", async ({
  page,
}) => {
  const external = await serve(page);
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new Error("Storage unavailable");
    };
  });
  await page.goto(`${origin}/en/`);
  await page.getByRole("button", { name: "Reject all", exact: true }).click();
  expect(external).toEqual([]);
  await page.reload();
  await expect(page.locator("#privacy-panel")).toBeVisible();
  expect(external).toEqual([]);
});

test("another tab can withdraw consent without discarding the current page", async ({
  page,
  context,
}) => {
  const external = await serve(page);
  await page.goto(`${origin}/en/`);
  await page.getByLabel("Usage statistics", { exact: true }).check();
  await page.getByRole("button", { name: "Save my choices" }).click();
  await expect
    .poll(
      () => external.filter((r) => r.url.includes("googletagmanager")).length,
    )
    .toBe(1);
  const other = await context.newPage();
  await serve(other);
  await other.goto(`${origin}/en/`);
  await other
    .getByRole("button", { name: "Privacy settings", exact: true })
    .click();
  await other.getByRole("button", { name: "Reject all", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as Record<string, unknown>)[
            "ga-disable-G-Y94L907Y9E"
          ],
      ),
    )
    .toBe(true);
  await page
    .getByRole("button", { name: "Privacy settings", exact: true })
    .click();
  await expect(
    page.getByLabel("Usage statistics", { exact: true }),
  ).not.toBeChecked();
  await expect(page).toHaveURL(`${origin}/en/`);
});
