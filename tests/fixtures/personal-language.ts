import { expect, type Page } from "@playwright/test";

export async function selectPersonalLanguage(
  page: Page,
  language: "fr" | "en",
) {
  const returnUrl = page.url();
  await expect(
    page.locator(".live-shell .topbar .language-picker"),
  ).toHaveCount(0);
  const mobileMenu = page.locator(".mobile-menu");
  const isMobile = (page.viewportSize()?.width ?? 1440) <= 760;
  if (isMobile) {
    await expect(mobileMenu).toBeVisible();
    await expect(page.locator(".sidebar")).toHaveCount(0);
    await mobileMenu.click();
  }
  const account = page.locator(".account-menu");
  await expect(account).toBeVisible();
  await account.locator("summary").click();
  await account
    .getByRole("link", { name: /Paramètres du compte|Account settings/ })
    .click();
  await expect(page).toHaveURL(/\/workspace\/account$/);
  const name = page.getByRole("textbox", { name: /Nom complet|Full name/ });
  if (!(await name.inputValue())) await name.fill("Test User");
  const select = page.getByRole("combobox", {
    name: /Langue préférée|Preferred language/,
  });
  await select.selectOption(language);
  await page
    .getByRole("button", { name: /Enregistrer le profil|Save profile/ })
    .click();
  await expect(page.getByRole("status")).toContainText(
    /Profil enregistré|Profile saved/,
  );
  await page.goBack();
  await expect(page).toHaveURL(returnUrl);
}
