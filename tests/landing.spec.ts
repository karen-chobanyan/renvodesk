import { expect, test } from "@playwright/test";

for (const locale of ["fr", "en"] as const) {
  test(`public landing ${locale}: navigation, kitchen walkthrough, FAQ and conversion`, async ({
    page,
  }, testInfo) => {
    const errors: string[] = [],
      requests: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("request", (request) => requests.push(request.url()));
    await page.goto(locale === "fr" ? "/" : "/en/");
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page).toHaveTitle(
      locale === "fr" ? /Logiciel de gestion/ : /Project management software/,
    );
    const hero = page.locator(".landing-hero");
    await expect(hero).toContainText(
      locale === "fr" ? "entreprises de rénovation" : "renovation contractors",
    );
    await expect(page.locator(".landing-app-shot")).toHaveCount(4);
    for (const screenshot of await page
      .locator(".landing-app-shot img")
      .all()) {
      await screenshot.scrollIntoViewIfNeeded();
      await expect(screenshot).toHaveJSProperty("naturalWidth", 1440);
    }
    await expect(
      hero.getByRole("link", {
        name: locale === "fr" ? "Créer mon espace" : "Create your workspace",
      }),
    ).toHaveAttribute("href", "/signup");
    await expect(
      hero.getByRole("link", {
        name: locale === "fr" ? "Explorer la démo" : "Explore the demo",
      }),
    ).toHaveAttribute("href", "/projects");
    await expect(
      page.getByRole("img", {
        name:
          locale === "fr"
            ? /Plan illustratif/
            : /Illustrative ground-floor plan/,
      }),
    ).toBeVisible();
    const markup = page.getByRole("button", {
      name: locale === "fr" ? "Annotations" : "Markup",
    });
    await expect(markup).toHaveAttribute("aria-pressed", "true");
    await markup.click();
    await expect(markup).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator(".plan-notes")).toHaveAttribute(
      "data-visible",
      "false",
    );
    const stages = page.getByRole("tablist", {
      name: locale === "fr" ? "Étapes du chantier" : "Project stages",
    });
    const panel = page.getByRole("tabpanel");
    await expect(panel).toContainText(
      locale === "fr" ? /9\s260,00\s€/ : "€9,260.00",
    );
    const tasksTab = stages.getByRole("tab", {
      name: locale === "fr" ? /Coordonnez/ : /Coordinate/,
    });
    await tasksTab.click();
    await expect(tasksTab).toHaveAttribute("aria-selected", "true");
    await expect(panel).toContainText(
      locale === "fr" ? "Plomberie" : "Plumbing",
    );
    await tasksTab.press("ArrowDown");
    const costsTab = stages.getByRole("tab", {
      name: locale === "fr" ? /Contrôlez/ : /Keep spending/,
    });
    await expect(costsTab).toBeFocused();
    await expect(costsTab).toHaveAttribute("aria-selected", "true");
    await expect(panel).toContainText(
      locale === "fr" ? /2\s070,00\s€/ : "€2,070.00",
    );
    await costsTab.press("Home");
    await expect(stages.getByRole("tab").first()).toHaveAttribute(
      "aria-selected",
      "true",
    );
    if (testInfo.project.name === "mobile") {
      await page
        .getByRole("button", { name: "Navigation", exact: true })
        .click();
      await page
        .locator(".landing-mobile-nav")
        .getByRole("link", {
          name: locale === "fr" ? "Le produit" : "The product",
        })
        .click();
      await expect(page.locator(".landing-mobile-nav")).toHaveCount(0);
    }
    const question = page.locator(".landing-faq details").last();
    await question.locator("summary").click();
    await expect(question).toHaveAttribute("open", "");
    await expect(question).toContainText(
      locale === "fr" ? "Pas encore" : "Not yet",
    );
    await question.locator("summary").focus();
    await page.keyboard.press("Enter");
    await expect(question).not.toHaveAttribute("open", "");
    await page.locator(".landing-site-photo").scrollIntoViewIfNeeded();
    await expect(page.locator(".landing-site-photo")).toHaveJSProperty(
      "naturalWidth",
      1536,
    );
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: testInfo.outputPath(`landing-${locale}.png`),
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
    expect(
      requests.some((url) => /supabase|excalidraw|app-entry/.test(url)),
    ).toBe(false);
    await page.locator(".landing-language").click();
    await expect(page.locator("html")).toHaveAttribute(
      "lang",
      locale === "fr" ? "en" : "fr",
    );
    await page.locator(".landing-hero-actions a").first().click();
    await expect(page).toHaveURL(/\/signup$/);
    await expect(
      page.getByLabel(locale === "fr" ? "Email address" : "Adresse e-mail", {
        exact: true,
      }),
    ).toBeVisible();
  });
}
test("reduced motion keeps the page readable and walkthrough tabs usable", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(
    await page
      .locator(".landing-hero-copy")
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
  const costsTab = page.getByRole("tab", { name: /Contrôlez/ });
  await costsTab.click();
  await expect(costsTab).toHaveAttribute("aria-selected", "true");
  expect(
    await page
      .locator(".landing-case-view")
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
});
