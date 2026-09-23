import { expect, test } from "@playwright/test";

for (const locale of ["fr", "en"] as const) {
  test(`legal pages ${locale}: footer, content, language and keyboard navigation`, async ({
    page,
  }, info) => {
    const en = locale === "en";
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(en ? "/en/" : "/");
    const footer = page.locator(".landing-footer");
    await expect(
      footer.getByRole("link", {
        name: en ? "Privacy Policy" : "Politique de confidentialité",
        exact: true,
      }),
    ).toHaveAttribute("href", en ? "/en/privacy/" : "/privacy/");
    await footer
      .getByRole("link", {
        name: en ? "Terms of Use" : "Conditions d’utilisation",
        exact: true,
      })
      .click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      en ? "Terms of Use" : "Conditions d’utilisation",
    );
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.locator(".legal-body section")).toHaveCount(13);
    await expect(page.locator("#service")).toContainText(
      en ? "not invoices" : "pas des factures",
    );
    await page.screenshot({ path: info.outputPath(`terms-${locale}.png`) });
    const toc = page.locator('.legal-contents a[href="#ending"]');
    await toc.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#ending$/);
    await expect(page.locator("#ending h2")).toBeInViewport();
    await page
      .locator(".landing-header")
      .getByRole("link", {
        name: en ? "Lire en français" : "Read in English",
        exact: true,
      })
      .click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      en ? "Conditions d’utilisation" : "Terms of Use",
    );
    await page.goto(en ? "/en/privacy/" : "/privacy/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      en ? "Privacy Policy" : "Politique de confidentialité",
    );
    await expect(page.locator("#rights")).toContainText(
      en ? "one month" : "un mois",
    );
    await expect(page.locator("#storage")).toContainText("180");
    await expect(page.locator("#analytics")).toContainText("Google Analytics");
    await expect(page.locator("#recipients")).toContainText("Supabase");
    await expect(page.locator('.legal-body a[href="mailto:"]')).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({ path: info.outputPath(`privacy-${locale}.png`) });
    expect(errors).toEqual([]);
  });
}
