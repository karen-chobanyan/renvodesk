import { expect, test } from "@playwright/test";

test("projects search, reset and locale switch", async ({ page }) => {
  await page.goto("/projects");
  await expect(
    page.getByRole("heading", { name: "Vos projets, au clair." }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Rechercher un projet ou un client…" })
    .fill("missing");
  await expect(
    page.getByRole("heading", { name: "Aucun projet trouvé" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Réinitialiser", exact: true })
    .last()
    .click();
  await page.getByRole("combobox", { name: "Langue" }).selectOption("en");
  await expect(
    page.getByRole("heading", { name: "Every project. A clear picture." }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
});
test("create demo project and open detail", async ({ page }) => {
  await page.goto("/projects");
  await page.getByRole("button", { name: "Nouveau projet" }).click();
  await page
    .getByRole("textbox", { name: "Nom du projet" })
    .fill("Maison test");
  await page
    .getByRole("textbox", { name: "Client", exact: true })
    .fill("Client exemple");
  await page.getByRole("textbox", { name: "Ville" }).fill("Liège");
  await page
    .getByRole("button", { name: "Créer le projet", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Projet créé" }),
  ).toBeVisible();
  await page
    .getByRole("link")
    .filter({ hasText: "Maison test" })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Maison test", exact: true }),
  ).toBeVisible();
});
test("edit estimate, validate and preserve across navigation", async ({
  page,
}) => {
  await page.goto("/estimates/maison-ixelles");
  await page
    .getByRole("textbox", { name: "Prix unitaire HT 1", exact: true })
    .fill("30");
  await expect(page.getByTestId("estimate-total")).toContainText("9");
  await page.getByRole("button", { name: "Enregistrer le brouillon" }).click();
  await expect(page.getByRole("status")).toContainText("Brouillon enregistré");
  await page
    .getByRole("link", { name: "Maison des Tilleuls", exact: true })
    .click();
  await page.getByRole("link", { name: "Devis du projet" }).click();
  await expect(
    page.getByRole("textbox", { name: "Prix unitaire HT 1", exact: true }),
  ).toHaveValue("30");
  await page
    .getByRole("textbox", { name: "Quantité 1", exact: true })
    .fill("-1");
  await expect(
    page.getByRole("button", { name: "Enregistrer le brouillon" }),
  ).toBeDisabled();
  await expect(page.getByRole("alert")).toBeVisible();
});
test("unknown page and modal keyboard dismissal", async ({ page }) => {
  await page.goto("/missing");
  await expect(
    page.getByRole("heading", { name: "Cette page est introuvable." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Voir les projets" }).click();
  await page.getByRole("button", { name: "Nouveau projet" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Nouveau projet" }),
  ).toBeFocused();
});

test("mobile navigation closes with Escape and routes correctly", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "Drawer is only used on mobile");
  await page.goto("/projects");
  const trigger = page.getByRole("button", { name: "Navigation", exact: true });
  await trigger.click();
  await expect(
    page.getByRole("dialog", { name: "Navigation", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page
    .getByRole("dialog")
    .getByRole("link", { name: "Composants", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Les bases de RenvoDesk." }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
