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

test("schedule navigation, empty views and task links work in both languages", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-10-18T12:00:00Z"));
  await open(page, "/schedule");
  const schedule = page.locator(".schedule-workspace");
  await expect(
    schedule.getByRole("heading", { name: "Planning", exact: true }),
  ).toBeVisible();
  await expect(
    schedule.getByRole("link", { name: "Retour aux projets" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Cette semaine", exact: true }),
  ).toBeDisabled();
  await expect(page.locator(".week-day")).toHaveCount(7);
  await expect(page.locator("time[aria-current=date]")).toContainText(
    "Aujourd’hui",
  );
  expect(
    await schedule.evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
  // Native buttons remain keyboard-operable even though the arrows have no visible text.
  const next = page.getByRole("button", {
    name: "Semaine suivante",
    exact: true,
  });
  await next.focus();
  await next.press("Enter");
  await next.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Aucune tâche cette semaine" }),
  ).toBeVisible();
  await expect(page.locator(".week-day")).toHaveCount(7);
  await expect(page.locator(".week-grid .task-row")).toHaveCount(0);
  await expect(page.locator(".calendar-day-empty")).toHaveCount(0);
  await page.getByLabel("Mes tâches uniquement").check();
  await expect(
    page.getByRole("heading", {
      name: "Aucune tâche ne vous est attribuée dans cette vue.",
    }),
  ).toBeVisible();
  await expect(page.locator(".week-day")).toHaveCount(7);
  await page
    .getByRole("button", { name: "Afficher toutes les tâches" })
    .click();
  await expect(page.getByLabel("Mes tâches uniquement")).not.toBeChecked();
  await expect(page.getByLabel("Mes tâches uniquement")).toBeFocused();
  await page
    .getByRole("button", { name: "Cette semaine", exact: true })
    .click();
  await expect(page.locator(".week-day")).toHaveCount(7);
  await page.getByRole("button", { name: "Sans date", exact: true }).click();
  await expect(
    page.locator(".task-row").first().locator(".task-dates"),
  ).toHaveText("Sans date");
  await page
    .getByRole("combobox", { name: "Langue", exact: true })
    .selectOption("en");
  await expect(
    page.locator(".task-row").first().locator(".task-dates"),
  ).toHaveText("No dates");
  const task = page.locator(".task-title-link").first();
  await task.focus();
  await task.press("Enter");
  await expect(page).toHaveURL(/\/projects\/[^?]+\?tab=tasks$/);
  await expect(
    page.getByRole("region", { name: "Project tasks", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Edit", exact: true }).first(),
  ).toBeVisible();
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

test("project register filters reset with keyboard and long names fit on phones", async ({
  page,
}) => {
  await open(page, "/projects");
  const register = page.getByRole("region", {
    name: "Projets de l’entreprise",
  });
  const search = register.getByRole("textbox");
  await search.fill("no matching project");
  await expect(
    register.getByRole("heading", { name: "Aucun projet trouvé" }),
  ).toBeVisible();
  await register
    .getByRole("button", { name: "Réinitialiser", exact: true })
    .press("Enter");
  await expect(search).toBeFocused();
  await expect(search).toHaveValue("");
  await register.getByRole("button", { name: "Terminés", exact: true }).click();
  await expect(
    register.getByRole("button", { name: "Terminés", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await register.getByRole("button", { name: "Nouveau projet" }).click();
  const projectName =
    "Rénovation complète de la maison et de ses dépendances — deuxième phase";
  await page.getByLabel("Nom du projet", { exact: true }).fill(projectName);
  await page
    .getByLabel("Client", { exact: true })
    .fill("Famille Exemple — résidence principale");
  await page
    .getByLabel("Ville", { exact: true })
    .fill("Ottignies-Louvain-la-Neuve");
  await page
    .getByRole("button", { name: "Créer le projet", exact: true })
    .click();
  await expect(
    register.getByRole("link", { name: projectName, exact: true }),
  ).toBeVisible();
  await expect(
    register.getByRole("button", { name: "Tous les projets", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await search.fill("  Ottignies  ");
  await expect(
    register.getByRole("link", { name: projectName, exact: true }),
  ).toBeVisible();
  await register
    .getByRole("button", { name: "Effacer la recherche", exact: true })
    .click();
  await expect(search).toBeFocused();
  expect(
    await register
      .locator(".table-scroll")
      .evaluate((element) => element.scrollWidth <= element.clientWidth),
  ).toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("combobox", { name: "Langue" }).selectOption("en");
  await expect(
    page.getByRole("heading", { name: "Company projects" }),
  ).toBeVisible();
});

test("client directory search, responsive contacts and guarded editing", async ({
  page,
}) => {
  await open(page, "/clients");
  const name = "Sophie & Marc Laurent";
  const search = page.getByRole("textbox", { name: "Rechercher un client" });
  await search.fill("no matching client");
  await expect(
    page.getByRole("status").filter({ hasText: "Validez avec Rechercher" }),
  ).toBeVisible();
  await search.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Aucun client trouvé." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Réinitialiser", exact: true })
    .press("Enter");
  await expect(search).toBeFocused();
  await expect(page.getByRole("button", { name, exact: true })).toBeVisible();
  await expect(
    page.getByRole("link", {
      name: "laurent.famille@example.com",
      exact: true,
    }),
  ).toBeVisible();
  const edit = page.getByRole("button", {
    name: `Modifier — ${name}`,
    exact: true,
  });
  await edit.click();
  const dialog = page.getByRole("dialog", { name: "Modifier le client" });
  const input = dialog.getByLabel("Nom du client", { exact: true });
  await expect(input).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(edit).toBeFocused();
  await edit.click();
  const longName =
    "Famille Exemple — rénovation de la résidence et des dépendances";
  await input.fill(longName);
  await dialog
    .getByLabel("E-mail du client")
    .fill("contact.residence.et.dependances@example.test");
  page.once("dialog", (confirmation) => void confirmation.dismiss());
  await page.keyboard.press("Escape");
  await expect(input).toHaveValue(longName);
  await dialog.getByRole("button", { name: "Enregistrer le client" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: longName, exact: true }),
  ).toBeVisible();
  expect(
    await page
      .locator(".table-scroll")
      .evaluate((element) => element.scrollWidth <= element.clientWidth),
  ).toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: longName, exact: true }).click();
  const detail = page.getByRole("dialog", { name: longName });
  await expect(
    detail.getByRole("heading", { name: "Adresse de facturation" }),
  ).toBeVisible();
  await expect(
    detail
      .getByRole("region", { name: "Biens du client" })
      .getByText("Adresse de facturation"),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: longName, exact: true }),
  ).toBeFocused();
  await page.getByRole("combobox", { name: "Langue" }).selectOption("en");
  await expect(
    page.getByRole("heading", { name: "Clients and properties" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add client", exact: true }).click();
  await expect(page.getByLabel("Client name", { exact: true })).toBeFocused();
  await page.getByLabel("Client name", { exact: true }).fill("Unsaved client");
  page.once("dialog", (confirmation) => void confirmation.accept());
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Add client", exact: true }),
  ).toBeFocused();
  await expect(
    page.getByRole("button", { name: "Unsaved client", exact: true }),
  ).toHaveCount(0);
});
