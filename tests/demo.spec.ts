import { expect, type Page, test } from "@playwright/test";

/** Declines optional telemetry so the consent panel never covers controls. */
async function open(page: Page, path: string) {
  await page.goto(path);
  await page.getByRole("button", { name: "Tout refuser", exact: true }).click();
}

function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

const screens = [
  ["/projects/maison-ixelles", "Maison des Tilleuls"],
  ["/projects/maison-ixelles?tab=tasks", "Tâches du projet"],
  ["/projects/maison-ixelles?tab=budget", "Répartition des coûts"],
  ["/projects/maison-ixelles?tab=estimates", "Devis du projet"],
  ["/projects/maison-ixelles?tab=documents", "Fichiers du projet"],
  ["/projects/maison-ixelles?tab=activity", "Journal du projet"],
  ["/estimates", "Devis"],
  ["/estimates/ixelles-cuisine", "Cuisine — option îlot central"],
  ["/schedule", "Planning"],
  ["/clients", "Clients et biens"],
  ["/team", "Équipe"],
  ["/settings", "Paramètres"],
  ["/account", "Paramètres du compte"],
] as const;

for (const [path, heading] of screens) {
  test(`demo screen ${path} renders fictional data`, async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto(path);
    await expect(
      page.getByRole("heading", { name: heading, exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.locator(".demo-chip, .demo-label").first(),
    ).toBeAttached();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
  });
}

test("demo sidebar reaches every workspace screen", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "Desktop sidebar");
  await open(page, "/projects");
  const nav = page.getByRole("navigation", { name: "ESPACE DE TRAVAIL" });
  for (const [name, url] of [
    ["Clients", /\/clients$/],
    ["Planning", /\/schedule$/],
    ["Devis", /\/estimates$/],
    ["Équipe", /\/team$/],
    ["Paramètres", /\/settings$/],
  ] as const) {
    await nav.getByRole("link", { name, exact: true }).click();
    await expect(page).toHaveURL(url);
  }
  await page.getByRole("link", { name: /Alex Morgan/ }).click();
  await expect(page).toHaveURL(/\/account$/);
});

test("a demo task created on a project appears in the schedule", async ({
  page,
}) => {
  await open(page, "/projects/loft-gent?tab=tasks");
  await page.getByRole("button", { name: "Nouvelle tâche" }).click();
  await page
    .getByRole("textbox", { name: "Nom de la tâche" })
    .fill("Vérifier la charpente");
  await page.getByRole("button", { name: "Enregistrer la tâche" }).click();
  await expect(page.getByText("Vérifier la charpente")).toBeVisible();
  await page.getByRole("link", { name: "Ouvrir le planning" }).click();
  await page.getByRole("button", { name: "Sans date", exact: true }).click();
  await expect(page.getByText("Vérifier la charpente")).toBeVisible();
  await page.getByRole("link", { name: "Loft aan de Leie" }).first().click();
  await page.getByRole("link", { name: "Journal", exact: true }).click();
  await expect(page.getByText("Tâche créée").first()).toBeVisible();
});

test("demo costs update totals and voided costs are excluded", async ({
  page,
}) => {
  await open(page, "/projects/maison-ixelles?tab=budget");
  await expect(page.getByText("38 200,00 €").first()).toBeVisible();
  await page.getByRole("button", { name: "Ajouter un coût" }).click();
  await page
    .getByRole("textbox", { name: "Description du coût" })
    .fill("Silicone sanitaire");
  await page.getByRole("textbox", { name: "Montant HT (€)" }).fill("100");
  await page.getByRole("button", { name: "Enregistrer le coût" }).click();
  await expect(page.getByText("38 300,00 €").first()).toBeVisible();
  await expect(page.getByText("Coût annulé")).toBeVisible();
});

test("demo estimate workflow records sending and freezes content", async ({
  page,
}) => {
  page.on("dialog", (dialog) => void dialog.accept());
  await open(page, "/estimates/gent-loft");
  await page
    .getByRole("textbox", { name: "Référence de l’échange" })
    .fill("Envoyé par e-mail le jour même");
  await page.getByRole("button", { name: "Marquer comme envoyé" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Statut consigné" }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Titre du devis" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Enregistrer l’acceptation" }),
  ).toBeVisible();
});

test("demo voice note review creates a suggested task", async ({ page }) => {
  await open(page, "/projects/maison-ixelles?tab=documents");
  await page.getByRole("button", { name: "Transcrire avec l’IA" }).click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("heading", { name: "Transcription" }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Créer la tâche" }).first().click();
  await expect(dialog.getByRole("status")).toHaveText("Tâche créée");
  await page.keyboard.press("Escape");
  await page.getByRole("link", { name: "Tâches", exact: true }).click();
  await expect(
    page.getByText("Demander deux échantillons de quartz clair"),
  ).toBeVisible();
});

test("demo estimate PDF preview is generated from fictional data", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "Viewer layout is covered by the live PDF tests");
  await open(page, "/projects/maison-ixelles?tab=documents");
  await page
    .getByRole("row", { name: /Devis-demolition-accepte\.pdf/ })
    .getByRole("button", { name: "Aperçu" })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Devis-demolition-accepte.pdf" }),
  ).toBeVisible();
  await expect(page.getByText("Page 1 / 1")).toBeVisible({ timeout: 15000 });
});
