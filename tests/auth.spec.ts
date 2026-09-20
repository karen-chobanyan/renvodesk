import { expect, type Page, test } from "@playwright/test";

const id = "11111111-1111-4111-8111-111111111111";
const org = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const user = {
  id,
  aud: "authenticated",
  role: "authenticated",
  email: "test@example.test",
  email_confirmed_at: "2026-01-01T00:00:00Z",
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: {},
  created_at: "2026-01-01T00:00:00Z",
};
const encode = (data: unknown) =>
  Buffer.from(JSON.stringify(data)).toString("base64url");
const token = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: id, role: "authenticated", exp: 4102444800 })}.test-signature`;
async function mockApi(page: Page) {
  let company: string | null = null;
  let contacts = {
    contact_address: "",
    contact_email: "",
    contact_phone: "",
    contact_revision: 1,
  };
  let requests = 0;
  const projects: Record<string, unknown>[] = [];
  let loseResponse = true;
  let edits = 0;
  let estimateEdits = 0;
  let loseEstimateResponse = true;
  let estimate: Record<string, unknown> | null = null;
  await page.route(
    "https://oripsywzngftarbprlgk.supabase.co/**",
    async (route) => {
      const url = new URL(route.request().url());
      const method = route.request().method();
      if (url.pathname.endsWith("/token")) {
        const body = route.request().postDataJSON();
        if (body.password === "incorrect") {
          await route.fulfill({
            status: 400,
            headers: {
              "x-supabase-api-version": "2024-01-01",
              "access-control-expose-headers": "x-supabase-api-version",
            },
            json: {
              code: "invalid_credentials",
              msg: "Invalid login credentials",
            },
          });
          return;
        }
        await route.fulfill({
          json: {
            access_token: token,
            refresh_token: "test-refresh",
            token_type: "bearer",
            expires_in: 3600,
            user,
          },
        });
        return;
      }
      if (url.pathname.endsWith("/signup")) {
        await route.fulfill({ json: { ...user, identities: [] } });
        return;
      }
      if (
        url.pathname.endsWith("/recover") ||
        url.pathname.endsWith("/logout")
      ) {
        await route.fulfill({ json: {} });
        return;
      }
      if (url.pathname.endsWith("/user")) {
        await route.fulfill({ json: user });
        return;
      }
      if (url.pathname.endsWith("/estimates")) {
        const body = method === "GET" ? null : route.request().postDataJSON();
        if (method === "POST") {
          expect(body.organization_id).toBe(org);
          expect(body.project_id).toBe(projects[0].id);
          if (estimate)
            await route.fulfill({ status: 409, json: { code: "23505" } });
          else {
            estimate = {
              ...body,
              lines: [],
              total_cents: 0,
              revision: 1,
              status: "draft",
              currency: "EUR",
            };
            if (loseEstimateResponse) {
              loseEstimateResponse = false;
              await route.abort();
            } else await route.fulfill({ json: estimate });
          }
        } else {
          expect(url.searchParams.get("organization_id")).toBe(`eq.${org}`);
          expect(url.searchParams.get("project_id")).toBe(
            `eq.${projects[0].id}`,
          );
          if (method === "PATCH") {
            estimateEdits++;
            if (estimateEdits === 2 && estimate)
              estimate = {
                ...estimate,
                title: "Other estimate edit",
                revision: 3,
              };
            if (
              estimate &&
              url.searchParams.get("revision") === `eq.${estimate.revision}`
            ) {
              expect(body).not.toHaveProperty("total_cents");
              const total = body.lines.reduce(
                (n: number, l: { quantity: string; price: string }) =>
                  n + Math.round(Number(l.quantity) * Number(l.price) * 100),
                0,
              );
              estimate = { ...estimate, ...body, total_cents: total };
              await route.fulfill({ json: [estimate] });
            } else await route.fulfill({ json: [] });
          } else
            await route.fulfill({
              json:
                estimate &&
                (!url.searchParams.has("id") ||
                  url.searchParams.get("id") === `eq.${estimate.id}`)
                  ? [estimate]
                  : [],
            });
        }
        return;
      }
      if (url.pathname.endsWith("/projects")) {
        if (method === "POST") {
          const body = route.request().postDataJSON();
          expect(body.organization_id).toBe(org);
          if (projects.some((p) => p.id === body.id)) {
            await route.fulfill({
              status: 409,
              json: { code: "23505", message: "Duplicate" },
            });
          } else {
            projects.push({
              ...body,
              status: "planning",
              revision: 1,
              created_at: "2026-09-20T00:00:00Z",
            });
            if (loseResponse) {
              loseResponse = false;
              await route.abort();
            } else await route.fulfill({ json: projects.at(-1) });
          }
        } else if (method === "PATCH") {
          expect(url.searchParams.get("organization_id")).toBe(`eq.${org}`);
          const body = route.request().postDataJSON();
          expect(url.searchParams.get("id")).toBe(`eq.${projects[0].id}`);
          expect(body.revision).toBe(
            Number(url.searchParams.get("revision")?.slice(3)) + 1,
          );
          edits++;
          if (edits === 2) {
            projects[0] = { ...projects[0], name: "Other editor", revision: 3 };
          }
          if (
            url.searchParams.get("revision") === `eq.${projects[0].revision}`
          ) {
            projects[0] = { ...projects[0], ...body };
            await route.fulfill({ json: [projects[0]] });
          } else await route.fulfill({ json: [] });
        } else {
          expect(url.searchParams.get("organization_id")).toBe(`eq.${org}`);
          await route.fulfill({
            json: url.searchParams.has("id")
              ? route.request().headers().accept?.includes("vnd.pgrst.object")
                ? projects[0]
                : projects.filter(
                    (p) => `eq.${p.id}` === url.searchParams.get("id"),
                  )
              : projects,
          });
        }
        return;
      }
      if (url.pathname.endsWith("/organizations")) {
        expect(url.searchParams.get("id")).toBe(`eq.${org}`);
        if (method === "PATCH") {
          const body = route.request().postDataJSON();
          expect(url.searchParams.get("contact_revision")).toBe(
            `eq.${contacts.contact_revision}`,
          );
          contacts = { ...contacts, ...body };
        }
        await route.fulfill({
          json: [{ id: org, name: company, country: "BE", ...contacts }],
        });
        return;
      }
      if (url.pathname.endsWith("/organization_memberships")) {
        expect(url.searchParams.get("user_id")).toBe(`eq.${id}`);
        await route.fulfill({
          json: company
            ? [
                {
                  organization_id: org,
                  organizations: { id: org, name: company, country: "BE" },
                },
              ]
            : [],
        });
        return;
      }
      if (
        url.pathname.endsWith("/rpc/create_organization") &&
        method === "POST"
      ) {
        const body = route.request().postDataJSON();
        expect(body.p_country).toBe("BE");
        expect(body.p_request_id).toMatch(/^[a-f0-9-]{36}$/);
        company = body.p_name;
        requests++;
        await route.fulfill({ json: org });
        return;
      }
      await route.abort();
    },
  );
  return () => requests;
}
async function login(page: Page) {
  await page.goto("/login");
  await page
    .getByRole("textbox", { name: "Adresse e-mail" })
    .fill("test@example.test");
  await page
    .getByLabel("Mot de passe", { exact: true })
    .fill("correct-password");
  await page.getByRole("button", { name: "Se connecter", exact: true }).click();
}
test("protected workspace redirects without a session", async ({ page }) => {
  await mockApi(page);
  await page.goto("/workspace");
  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("heading", { name: "Bienvenue chez RenvoDesk." }),
  ).toBeVisible();
});
test("sign in, create company, reload and sign out", async ({ page }) => {
  const requests = await mockApi(page);
  await login(page);
  await expect(
    page.getByRole("heading", { name: "Créons votre entreprise." }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Nom de l’entreprise" })
    .fill("Atelier Test");
  await page.getByRole("button", { name: "Créer mon entreprise" }).click();
  await expect(
    page.getByRole("button", { name: /Atelier Test/ }),
  ).toBeVisible();
  expect(requests()).toBe(1);
  await page
    .getByText("Coordonnées pour les documents", { exact: true })
    .click();
  await page
    .getByLabel("Adresse de l’entreprise", { exact: true })
    .fill("12 rue de la Paix");
  await page
    .getByLabel("E-mail de contact", { exact: true })
    .fill("office@example.test");
  await page
    .getByRole("button", { name: "Enregistrer les coordonnées" })
    .click();
  await expect(
    page.getByText("Coordonnées enregistrées.", { exact: true }),
  ).toBeVisible();
  await page
    .getByText("Coordonnées pour les documents", { exact: true })
    .click();
  await expect(
    page.getByText("Aucun projet pour le moment.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Nouveau projet" }).click();
  await page
    .getByLabel("Nom du projet", { exact: true })
    .fill("Rénovation cuisine");
  await page.getByLabel("Client", { exact: true }).fill("Client Test");
  await page.getByLabel("Ville", { exact: true }).fill("Bruxelles");
  await page
    .getByRole("button", { name: "Créer le projet", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Enregistrement non confirmé",
  );
  await page
    .getByRole("button", { name: "Créer le projet", exact: true })
    .click();
  await expect(
    page.getByText("Projet enregistré.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Rénovation cuisine", { exact: true }),
  ).toHaveCount(1);
  await page.reload();
  await expect(
    page.getByRole("button", { name: /Atelier Test/ }),
  ).toBeVisible();
  await expect(
    page.getByText("Rénovation cuisine", { exact: true }),
  ).toBeVisible();
  await page.getByRole("combobox", { name: "Langue" }).selectOption("en");
  await expect(
    page.getByRole("heading", { name: "Company projects" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `/private/tmp/renvo-projects-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page
    .getByRole("link", { name: "Rénovation cuisine", exact: true })
    .click();
  await expect(page.getByLabel("Project name", { exact: true })).toHaveValue(
    "Rénovation cuisine",
  );
  await page
    .getByLabel("Project name", { exact: true })
    .fill("Kitchen renovation");
  await page.getByLabel("Status", { exact: true }).selectOption("active");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Changes saved.", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Nom du projet", { exact: true })).toHaveValue(
    "Kitchen renovation",
  );
  await expect(page.getByLabel("Statut", { exact: true })).toHaveValue(
    "active",
  );
  await page
    .getByLabel("Nom du projet", { exact: true })
    .fill("My unsaved change");
  await page
    .getByRole("button", { name: "Enregistrer les modifications" })
    .click();
  await expect(page.getByRole("alert")).toContainText("Le projet a changé");
  await expect(page.getByLabel("Nom du projet", { exact: true })).toHaveValue(
    "My unsaved change",
  );
  await expect(
    page.getByRole("button", { name: "Enregistrer les modifications" }),
  ).toBeDisabled();
  await page.screenshot({
    path: `/private/tmp/renvo-edit-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Recharger et remplacer mes champs" })
    .click();
  await expect(page.getByLabel("Nom du projet", { exact: true })).toHaveValue(
    "Other editor",
  );
  await page
    .getByLabel("Nom du projet", { exact: true })
    .fill("Reconciled project");
  await page
    .getByRole("button", { name: "Enregistrer les modifications" })
    .click();
  await expect(
    page.getByText("Modifications enregistrées.", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.goto(
    `/workspace/${org}/projects/00000000-0000-4000-8000-000000000000`,
  );
  await expect(page.getByRole("alert")).toHaveText(
    "Projet introuvable ou accès indisponible.",
  );
  await page.getByRole("link", { name: "Retour aux entreprises" }).click();
  await expect(
    page.getByRole("link", { name: "Reconciled project", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Reconciled project", exact: true })
    .click();
  await expect(
    page.getByText("Aucun devis pour ce projet.", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Titre du devis", { exact: true })
    .fill("Rénovation étage");
  await page.getByRole("button", { name: "Créer le brouillon" }).click();
  await expect(
    page.getByText("Création non confirmée.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Créer le brouillon" }).click();
  await expect(
    page.getByRole("heading", { name: "Rénovation étage" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ajouter une ligne" }).click();
  await page.getByLabel("Description 1", { exact: true }).fill("Peinture");
  await expect(
    page.getByRole("button", { name: "Télécharger le PDF" }),
  ).toBeDisabled();
  await page.getByLabel("Quantité 1", { exact: true }).fill("1,5");
  await page.getByLabel("Prix unitaire HT 1", { exact: true }).fill("0,03");
  await expect(page.getByTestId("saved-estimate-total")).toContainText("0,05");
  await page
    .getByRole("button", { name: "Enregistrer le brouillon", exact: true })
    .click();
  await expect(
    page.getByText("Brouillon enregistré.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Description 1", { exact: true })).toHaveValue(
    "Peinture",
  );
  await page.getByLabel("Quantité 1", { exact: true }).fill("0");
  await expect(
    page.getByRole("button", { name: "Enregistrer le brouillon", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("Quantité 1", { exact: true }).fill("2");
  await page
    .getByRole("button", { name: "Enregistrer le brouillon", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Ce devis a changé");
  await expect(page.getByLabel("Quantité 1", { exact: true })).toHaveValue("2");
  await page
    .getByRole("button", { name: "Recharger et remplacer mes champs" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Other estimate edit" }),
  ).toBeVisible();
  await page.getByRole("combobox", { name: "Langue" }).selectOption("en");
  await expect(page.getByLabel("Description 1", { exact: true })).toHaveValue(
    "Peinture",
  );
  await page.getByLabel("Quantity 1", { exact: true }).fill("2");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByText("Draft saved.", { exact: true })).toBeVisible();
  await page.screenshot({
    path: `/private/tmp/renvo-estimate-${test.info().project.name}.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PDF" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^draft-.*-r4.pdf$/);
  await download.saveAs(
    `/private/tmp/renvo-browser-${test.info().project.name}.pdf`,
  );
  await page.getByRole("link", { name: "Back to project" }).click();
  await expect(
    page.getByRole("link", { name: "Other estimate edit", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Back to companies" }).click();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/workspace");
  await expect(page).toHaveURL(/\/login$/);
});
test("invalid credentials have a friendly localized error", async ({
  page,
}) => {
  await mockApi(page);
  await page.goto("/login");
  await page
    .getByRole("textbox", { name: "Adresse e-mail" })
    .fill("test@example.test");
  await page.getByLabel("Mot de passe", { exact: true }).fill("incorrect");
  await page.getByRole("button", { name: "Se connecter", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "Adresse e-mail ou mot de passe incorrect.",
  );
  await page.getByRole("combobox", { name: "Langue" }).selectOption("en");
  await expect(
    page.getByRole("heading", { name: "Welcome to RenvoDesk." }),
  ).toBeVisible();
});
test("signup and recovery explain the email step without sending mail", async ({
  page,
}) => {
  await mockApi(page);
  await page.goto("/signup");
  await page
    .getByRole("textbox", { name: "Adresse e-mail" })
    .fill("test@example.test");
  await page
    .getByLabel("Mot de passe", { exact: true })
    .fill("long-test-password");
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Consultez votre boîte mail",
  );
  await page.goto("/auth/forgot");
  await page
    .getByRole("textbox", { name: "Adresse e-mail" })
    .fill("test@example.test");
  await page.getByRole("button", { name: "Envoyer le lien" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Si un compte correspond",
  );
  await page.goto("/auth/reset");
  await expect(page.getByRole("alert")).toContainText("Ce lien a expiré");
});
