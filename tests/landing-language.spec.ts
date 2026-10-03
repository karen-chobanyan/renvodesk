import { expect, type Page, test } from "@playwright/test";

// Automation is never redirected, so present as an ordinary desktop browser.
test.use({
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
});

async function asVisitor(page: Page) {
  await page.addInitScript(() =>
    Object.defineProperty(Navigator.prototype, "webdriver", {
      get: () => false,
    }),
  );
}

test.describe("English browser", () => {
  test.use({ locale: "en-GB", timezoneId: "Europe/London" });

  test("is sent from / to /en/ once, and the switch is respected", async ({
    page,
  }) => {
    await asVisitor(page);
    await page.goto("/?ref=ad#questions");
    await expect(page).toHaveURL(/\/en\/\?ref=ad#questions$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("h1")).toContainText("renovation");

    // Choosing French is not undone, in this tab or in a later one.
    await page.locator(".landing-language").click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "fr");
    const later = await page.context().newPage();
    await asVisitor(later);
    await later.goto("/en/");
    await expect(later).toHaveURL(/\/$/);
    await expect(later.locator("html")).toHaveAttribute("lang", "fr");
  });
});

test.describe("French browser", () => {
  test.use({ locale: "fr-BE", timezoneId: "Europe/Brussels" });

  test("is sent from /en/ to / and stays on French pages", async ({ page }) => {
    await asVisitor(page);
    await page.goto("/en/");
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "fr");
    // Later pages in the same tab keep the language the visitor asked for.
    await page.goto("/en/");
    await expect(page).toHaveURL(/\/en\/$/);
  });
});

test.describe("German browser in France", () => {
  test.use({ locale: "de-DE", timezoneId: "Europe/Paris" });

  test("uses the time zone as a location hint", async ({ page }) => {
    await asVisitor(page);
    await page.goto("/en/");
    await expect(page).toHaveURL(/\/$/);
  });
});

test.describe("Crawler", () => {
  test.use({
    locale: "en-US",
    userAgent:
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  });

  test("always receives the requested page", async ({ page }) => {
    await asVisitor(page);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  });
});
