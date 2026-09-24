import { expect, test } from "@playwright/test";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

test("workspace language and location save while currency stays fixed", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("renvodesk-locale", "fr");
    localStorage.setItem("renvodesk-locale-source", "workspace");
  });
  await page.route("**/workspace-preferences-harness", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<html><head><meta name="viewport" content="width=device-width, initial-scale=1"/></head><body><div id="root"></div><script type="module">import RefreshRuntime from '/@react-refresh'; RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;await import('/tests/fixtures/workspace-preferences-harness.tsx');</script></body></html>`,
    }),
  );
  let record = {
    id: organizationId,
    name: "Atelier test",
    country: "BE",
    default_language: "fr",
    settings_revision: 1,
    contact_revision: 1,
  };
  let saveCount = 0;
  let loadCount = 0;
  await page.route("**/rest/v1/organizations?**", async (route) => {
    const url = new URL(route.request().url());
    expect(url.searchParams.get("id")).toBe(`eq.${organizationId}`);
    if (route.request().method() === "GET") loadCount++;
    if (route.request().method() === "PATCH") {
      saveCount++;
      expect(url.searchParams.get("settings_revision")).toBe(
        `eq.${record.settings_revision}`,
      );
      const body = route.request().postDataJSON();
      expect(body).not.toHaveProperty("contact_revision");
      if (saveCount === 1) {
        await route.fulfill({ json: [] });
        return;
      }
      record = { ...record, ...body };
    }
    await route.fulfill({ json: [record] });
  });

  await page.goto("/workspace-preferences-harness");
  const region = page.getByRole("region", {
    name: "Préférences de l’espace de travail",
  });
  await expect(region.getByLabel("Langue par défaut")).toHaveValue("fr");
  await expect(region.getByLabel("Pays de l’entreprise")).toHaveValue("BE");
  await expect(region).toContainText("EUR · €");
  await expect(region).toContainText("pas encore disponible");

  await region.getByLabel("Langue par défaut").selectOption("en");
  await region.getByLabel("Pays de l’entreprise").selectOption("NL");
  await region
    .getByRole("button", { name: "Enregistrer les préférences" })
    .click();
  await expect(region).toContainText("ont changé");
  await expect(region.getByLabel("Langue par défaut")).toHaveValue("en");
  await expect(region.getByLabel("Pays de l’entreprise")).toHaveValue("NL");
  await region
    .getByRole("button", { name: "Recharger et remplacer mes choix" })
    .click();
  await expect.poll(() => loadCount).toBe(2);
  await expect(region.getByLabel("Langue par défaut")).toHaveValue("fr");
  await expect(region.getByLabel("Pays de l’entreprise")).toHaveValue("BE");

  await region.getByLabel("Langue par défaut").selectOption("en");
  await region.getByLabel("Pays de l’entreprise").selectOption("NL");
  await expect(region.getByLabel("Langue par défaut")).toHaveValue("en");
  await region
    .getByRole("button", { name: "Enregistrer les préférences" })
    .click();
  const english = page.getByRole("region", { name: "Workspace preferences" });
  await expect(english).toContainText("Preferences saved.");
  await expect(english.getByLabel("Default language")).toHaveValue("en");
  await expect(english.getByLabel("Company country")).toHaveValue("NL");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
