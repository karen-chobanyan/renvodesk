import { expect, test } from "@playwright/test";

for (const locale of ["fr", "en"] as const) {
  test(`public landing ${locale}: navigation, model, FAQ and conversion`, async ({
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
    await expect(page.locator(".cad-drawing")).toBeVisible();
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
    const model = page.getByRole("button", {
      name: locale === "fr" ? "Explorer les détails" : "Explore the details",
    });
    await model.click();
    await expect(
      page.getByRole("button", {
        name: locale === "fr" ? "Recomposer le projet" : "Bring it together",
      }),
    ).toHaveAttribute("aria-pressed", "true");
    await page
      .getByRole("button", {
        name: locale === "fr" ? "Recomposer le projet" : "Bring it together",
      })
      .click();
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
test("reduced motion keeps the page readable and model controls usable", async ({
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
  await page.getByRole("button", { name: "Explorer les détails" }).click();
  expect(
    await page
      .locator(".model-roof")
      .evaluate((el) => getComputedStyle(el).transitionDuration),
  ).toBe("0s");
  await expect(
    page.getByRole("button", { name: "Recomposer le projet" }),
  ).toHaveAttribute("aria-pressed", "true");
});
