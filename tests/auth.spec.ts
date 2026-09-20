import { expect, type Page, test } from "@playwright/test";
import { jsPDF } from "jspdf";

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
  let storedFile: Record<string, unknown> | null = null;
  let objectPresent = false;
  let loseUpload = true;
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
      if (url.pathname.endsWith("/project_cost_summary")) {
        await route.fulfill({
          json: [
            {
              budget_cents: null,
              budget_revision: null,
              materials: "0",
              labor: "0",
              subcontractors: "0",
              other: "0",
              total: "0",
            },
          ],
        });
        return;
      }
      if (url.pathname.endsWith("/project_costs")) {
        await route.fulfill({ json: [] });
        return;
      }
      if (
        url.pathname.endsWith("/clients") ||
        url.pathname.endsWith("/properties")
      ) {
        await route.fulfill({ json: [] });
        return;
      }
      if (url.pathname.endsWith("/project_tasks")) {
        await route.fulfill({ json: [] });
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
      if (url.pathname.endsWith("/project_files")) {
        const body = method === "GET" ? null : route.request().postDataJSON();
        if (method === "POST") {
          expect(body.organization_id).toBe(org);
          expect(body.project_id).toBe(projects[0].id);
          storedFile = {
            ...body,
            object_key: `${org}/${body.project_id}/${body.id}`,
            state: "pending",
            version: 1,
          };
          await route.fulfill({ json: storedFile });
        } else {
          expect(url.searchParams.get("organization_id")).toBe(`eq.${org}`);
          expect(url.searchParams.get("project_id")).toBe(
            `eq.${projects[0].id}`,
          );
          if (method === "PATCH") {
            if (body.state === "ready" && !objectPresent) {
              await route.fulfill({
                status: 400,
                json: { message: "Missing object" },
              });
              return;
            }
            storedFile = { ...storedFile, state: body.state };
            await route.fulfill({ json: storedFile });
          } else
            await route.fulfill({
              json:
                storedFile && storedFile.state !== "deleted"
                  ? [storedFile]
                  : [],
            });
        }
        return;
      }
      if (url.pathname.startsWith("/storage/v1/object/")) {
        if (method === "POST" && url.pathname.includes("/sign/")) {
          await route.fulfill({
            json: {
              signedURL: "/object/sign/project-files/preview.png?token=test",
            },
          });
          return;
        }
        if (method === "POST") {
          expect(route.request().headers()["x-upsert"]).toBe("false");
          objectPresent = true;
          if (loseUpload) {
            loseUpload = false;
            await route.abort();
          } else await route.fulfill({ json: { Key: storedFile?.object_key } });
        } else if (method === "DELETE") {
          expect(storedFile?.state).toBe("deleting");
          objectPresent = false;
          await route.fulfill({ json: [] });
        } else
          await route.fulfill({
            contentType:
              storedFile?.mime_type === "application/pdf"
                ? "application/pdf"
                : "image/png",
            body:
              storedFile?.mime_type === "application/pdf"
                ? (() => {
                    const doc = new jsPDF();
                    doc.text("Project plan preview", 20, 30);
                    return Buffer.from(doc.output("arraybuffer"));
                  })()
                : Buffer.from(
                    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j8ioAAAAASUVORK5CYII=",
                    "base64",
                  ),
          });
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
  await expect(page).toHaveURL(new RegExp(`company=${org}`));
  expect(requests()).toBe(1);
  if (test.info().project.name === "mobile")
    await page.getByRole("button", { name: "Navigation" }).click();
  await page.locator(".company-menu > summary").click();
  await page
    .getByRole("link", { name: "Paramètres de l’entreprise", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Paramètres de l’entreprise" }),
  ).toBeVisible();
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
  await page.goto(`/workspace?company=${org}`);
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
  await expect(page).toHaveURL(new RegExp(`company=${org}`));
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
  const register = page.getByRole("region", { name: "Company projects" });
  await register
    .getByRole("textbox", { name: /Search projects/ })
    .fill("no matching project");
  await expect(
    register.getByRole("link", { name: "Rénovation cuisine", exact: true }),
  ).toHaveCount(0);
  await register.getByRole("textbox").fill("");
  await register
    .getByRole("button", { name: "Completed", exact: true })
    .click();
  await expect(
    register.getByRole("link", { name: "Rénovation cuisine", exact: true }),
  ).toHaveCount(0);
  await register
    .getByRole("button", { name: "All projects", exact: true })
    .click();
  await expect(
    register.getByRole("link", { name: "Rénovation cuisine", exact: true }),
  ).toBeVisible();
  await expect(
    register.getByText("Find your project tasks in the company schedule."),
  ).toBeVisible();
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
  const files = page.locator(".project-files");
  await expect(
    files.getByText("Aucun fichier pour ce projet.", { exact: true }),
  ).toBeVisible();
  await files.locator('input[type="file"]').setInputFiles({
    name: "plan.heic",
    mimeType: "image/heic",
    buffer: Buffer.from("test"),
  });
  await expect(files.getByRole("alert")).toContainText("HEIC/HEIF");
  await files.locator('input[type="file"]').setInputFiles({
    name: "chantier.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j8ioAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await files.getByRole("button", { name: "Importer", exact: true }).click();
  await expect(
    files.getByText("Import incomplet", { exact: false }),
  ).toBeVisible();
  await files.getByRole("button", { name: "Vérifier l’import" }).click();
  await expect(
    files.getByText("Import terminé.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(files.getByText("chantier.png", { exact: true })).toBeVisible();
  await files.getByRole("button", { name: "Aperçu", exact: true }).click();
  await expect(
    page.getByRole("dialog").getByRole("img", { name: "chantier.png" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  const fileDownload = page.waitForEvent("download");
  await files.getByRole("button", { name: "Télécharger", exact: true }).click();
  expect((await fileDownload).suggestedFilename()).toBe("chantier.png");
  await files.getByRole("button", { name: "Supprimer", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Annuler" })
    .click();
  await expect(files.getByText("chantier.png", { exact: true })).toBeVisible();
  await files.getByRole("button", { name: "Supprimer", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Supprimer", exact: true })
    .click();
  await expect(
    files.getByText("Fichier supprimé.", { exact: true }),
  ).toBeVisible();
  await expect(files.getByText("chantier.png", { exact: true })).toHaveCount(0);
  const pdf = new jsPDF();
  pdf.text("Project plan preview", 20, 30);
  await files.locator('input[type="file"]').setInputFiles({
    name: "plan.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(pdf.output("arraybuffer")),
  });
  await files.getByRole("button", { name: "Importer", exact: true }).click();
  await expect(
    files.getByText("Import terminé.", { exact: true }),
  ).toBeVisible();
  await files.getByRole("button", { name: "Aperçu", exact: true }).click();
  await expect(
    page.getByRole("dialog").locator('canvas[data-rendered="true"]'),
  ).toBeVisible();
  await page.screenshot({
    path: `/private/tmp/renvo-file-preview-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  await files.screenshot({
    path: `/private/tmp/renvo-files-${test.info().project.name}.png`,
  });
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
  if (test.info().project.name === "mobile")
    await page.getByRole("button", { name: "Navigation" }).click();
  await page.locator(".account-menu > summary").click();
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

test("tasks save, recover, schedule, conflict and delete", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-09-21T12:00:00Z"));
  await mockApi(page);
  const tasks: Array<{
    id: string;
    organization_id: string;
    project_id: string;
    title: string;
    status: string;
    notes: string;
    start_date: string | null;
    due_date: string | null;
    revision: number;
    created_at: string;
    projects: { name: string };
  }> = [];
  let lose = true,
    conflict = true;
  await page.route("**/rest/v1/project_tasks**", async (route) => {
    const url = new URL(route.request().url()),
      method = route.request().method();
    const taskId = url.searchParams.get("id")?.slice(3);
    const row = tasks.find((t) => t.id === taskId);
    if (method === "POST") {
      const input = route.request().postDataJSON();
      expect(input.organization_id).toBe(org);
      if (tasks.some((t) => t.id === input.id)) {
        await route.fulfill({ status: 409, json: { code: "23505" } });
        return;
      }
      const task = {
        ...input,
        revision: 1,
        created_at: "2026-09-21T12:00:00Z",
        projects: { name: "Task site" },
      };
      tasks.push(task);
      if (lose) {
        lose = false;
        await route.abort();
      } else await route.fulfill({ json: task });
      return;
    }
    expect(url.searchParams.get("organization_id")).toBe(`eq.${org}`);
    if (method === "PATCH") {
      if (conflict && row) {
        row.revision++;
        conflict = false;
      }
      if (!row || url.searchParams.get("revision") !== `eq.${row.revision}`) {
        await route.fulfill({ json: [] });
        return;
      }
      Object.assign(row, route.request().postDataJSON());
      await route.fulfill({ json: [row] });
      return;
    }
    if (method === "DELETE") {
      expect(url.searchParams.get("revision")).toBe(`eq.${row?.revision}`);
      if (!row) throw new Error("Missing delete fixture");
      tasks.splice(tasks.indexOf(row), 1);
      await route.fulfill({ json: [{ id: taskId }] });
      return;
    }
    let result = taskId ? tasks.filter((t) => t.id === taskId) : tasks;
    if (url.searchParams.get("due_date")?.startsWith("lt."))
      result = result.filter(
        (t) => t.due_date && t.due_date < "2026-09-21" && t.status !== "done",
      );
    if (url.searchParams.get("start_date") === "is.null")
      result = result.filter(
        (t) => !t.start_date && !t.due_date && t.status !== "done",
      );
    if (url.searchParams.has("or")) {
      result = url.searchParams.get("or")?.includes("2026-09-21")
        ? result.filter((t) => t.start_date || t.due_date)
        : [];
    }
    await route.fulfill({ json: result });
  });
  await login(page);
  await page.getByLabel("Nom de l’entreprise").fill("Atelier Tasks");
  await page.getByRole("button", { name: "Créer mon entreprise" }).click();
  await page.getByRole("button", { name: "Nouveau projet" }).click();
  await page.getByLabel("Nom du projet", { exact: true }).fill("Task site");
  await page.getByLabel("Client", { exact: true }).fill("Test Client");
  await page.getByLabel("Ville", { exact: true }).fill("Bruxelles");
  await page
    .getByRole("button", { name: "Créer le projet", exact: true })
    .click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page
    .getByRole("button", { name: "Créer le projet", exact: true })
    .click();
  await page.getByRole("link", { name: "Task site", exact: true }).click();
  const projectUrl = page.url();
  const panel = page.getByRole("region", { name: "Tâches du projet" });
  await panel.getByRole("button", { name: "Nouvelle tâche" }).click();
  await panel.getByLabel("Nom de la tâche").fill("Préparer le chantier");
  await panel.getByLabel("Date de début").fill("2026-09-23");
  await panel.getByLabel("Date limite").fill("2026-09-21");
  await panel.getByRole("button", { name: "Enregistrer la tâche" }).click();
  await expect(panel.getByRole("alert")).toContainText("Vérifiez");
  await panel.getByLabel("Date de début").fill("2026-09-21");
  await panel.getByLabel("Date limite").fill("2026-09-23");
  await panel.getByRole("button", { name: "Enregistrer la tâche" }).click();
  await expect(panel.getByRole("alert")).toContainText(
    "Enregistrement non confirmé",
  );
  await panel.getByRole("button", { name: "Enregistrer la tâche" }).click();
  await expect(panel.locator("article")).toHaveCount(1);
  expect(tasks).toHaveLength(1);
  await page.reload();
  await expect(
    panel.getByText("Préparer le chantier", { exact: true }),
  ).toBeVisible();
  await panel.getByRole("button", { name: "Modifier", exact: true }).click();
  await panel.getByLabel("Statut de la tâche").selectOption("in_progress");
  await panel.getByRole("button", { name: "Enregistrer la tâche" }).click();
  await expect(panel.getByRole("alert")).toContainText("La tâche a changé");
  await expect(panel.getByLabel("Statut de la tâche")).toHaveValue(
    "in_progress",
  );
  await panel.getByRole("button", { name: "Recharger les tâches" }).click();
  await panel.getByRole("button", { name: "Modifier", exact: true }).click();
  await panel.getByLabel("Statut de la tâche").selectOption("in_progress");
  await panel.getByRole("button", { name: "Enregistrer la tâche" }).click();
  await expect(panel.locator("article .status")).toHaveText("En cours");
  await page
    .getByRole("link", { name: "Planning", exact: true })
    .last()
    .click();
  await expect(page.locator(".week-grid .task-row")).toHaveCount(3);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `/private/tmp/renvo-schedule-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Semaine suivante", exact: true })
    .click();
  await expect(page.locator(".week-grid .task-row")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Semaine précédente", exact: true })
    .click();
  await expect(page.locator(".week-grid .task-row")).toHaveCount(3);
  await page.getByRole("button", { name: "En retard", exact: true }).click();
  await expect(page.getByText("Aucune tâche à afficher.")).toBeVisible();
  await page.getByRole("button", { name: "Sans date", exact: true }).click();
  await expect(page.getByText("Aucune tâche à afficher.")).toBeVisible();
  await page.goto(projectUrl);
  await panel.getByRole("button", { name: "Modifier", exact: true }).click();
  await panel.getByLabel("Date de début").fill("");
  await panel.getByLabel("Date limite").fill("2026-09-20");
  await panel.getByRole("button", { name: "Enregistrer la tâche" }).click();
  await expect(panel.getByText("En retard", { exact: true })).toBeVisible();
  await page
    .getByRole("link", { name: "Planning", exact: true })
    .last()
    .click();
  await page.getByRole("button", { name: "En retard", exact: true }).click();
  await expect(page.locator(".task-row")).toHaveCount(1);
  await page.goto(projectUrl);
  await panel.getByRole("button", { name: "Modifier", exact: true }).click();
  await panel.getByLabel("Date limite").fill("");
  await panel.getByRole("button", { name: "Enregistrer la tâche" }).click();
  await page
    .getByRole("link", { name: "Planning", exact: true })
    .last()
    .click();
  await page.getByRole("button", { name: "Sans date", exact: true }).click();
  await expect(page.locator(".task-row")).toHaveCount(1);
  await page.goto(projectUrl);
  await panel.getByRole("button", { name: "Modifier", exact: true }).click();
  await panel.getByLabel("Statut de la tâche").selectOption("done");
  await panel.getByRole("button", { name: "Enregistrer la tâche" }).click();
  await expect(panel.locator("article .status")).toHaveText("Terminée");
  await page
    .getByRole("link", { name: "Planning", exact: true })
    .last()
    .click();
  await page.getByRole("button", { name: "Sans date", exact: true }).click();
  await expect(page.locator(".task-row")).toHaveCount(0);
  await page.goto(projectUrl);
  await page.getByRole("combobox", { name: "Langue" }).selectOption("en");
  await expect(
    page
      .getByRole("region", { name: "Project tasks" })
      .getByText("Done", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("region", { name: "Project tasks" })
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel" })
    .click();
  await expect(page.locator("#project-tasks article")).toHaveCount(1);
  await page
    .locator("#project-tasks")
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await expect(page.locator("#project-tasks article")).toHaveCount(0);
});

test("company navigation keeps selection across reload and detail routes", async ({
  page,
}) => {
  await mockApi(page);
  const second = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  await page.route("**/rest/v1/organization_memberships**", (route) =>
    route.fulfill({
      json: [
        {
          organization_id: org,
          organizations: { id: org, name: "First company", country: "BE" },
        },
        {
          organization_id: second,
          organizations: { id: second, name: "Second company", country: "FR" },
        },
      ],
    }),
  );
  await page.route("**/rest/v1/projects**", (route) =>
    route.fulfill({ json: [] }),
  );
  async function openSidebar() {
    if (test.info().project.name === "mobile")
      await page
        .getByRole("button", { name: "Navigation", exact: true })
        .click();
  }
  await login(page);
  await openSidebar();
  await page.locator(".company-menu > summary").click();
  await page
    .getByRole("combobox", { name: "Entreprise", exact: true })
    .selectOption(second);
  await expect(page).toHaveURL(new RegExp(`company=${second}`));
  await page.reload();
  await openSidebar();
  await page.locator(".company-menu > summary").click();
  await expect(
    page.getByRole("combobox", { name: "Entreprise", exact: true }),
  ).toHaveValue(second);
  await page
    .getByRole("link", { name: "Ajouter une entreprise", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Créons votre entreprise." }),
  ).toBeVisible();
  await page.goto(
    `/workspace/${second}/projects/00000000-0000-4000-8000-000000000000`,
  );
  await openSidebar();
  await page.locator(".company-menu > summary").click();
  await expect(
    page.getByRole("combobox", { name: "Entreprise", exact: true }),
  ).toHaveValue(second);
  await page
    .getByRole("combobox", { name: "Entreprise", exact: true })
    .selectOption(org);
  await expect(page).toHaveURL(new RegExp(`company=${org}`));
  await expect(
    page.locator("main").getByText("Coordonnées pour les documents"),
  ).toHaveCount(0);
  await expect(
    page.locator("main").getByRole("button", { name: "Se déconnecter" }),
  ).toHaveCount(0);
});

test("company estimates search, pagination and saved draft links", async ({
  page,
}) => {
  await mockApi(page);
  await page.route("**/rest/v1/estimates**", async (route) => {
    const url = new URL(route.request().url());
    expect(url.searchParams.get("organization_id")).toBe(`eq.${org}`);
    const records = Array.from({ length: 21 }, (_, i) => ({
      id: `estimate-${i}`,
      project_id: "project-a",
      title: `Kitchen quote ${i}`,
      revision: 1,
      status: "draft",
      total_cents: 123456,
      projects: { name: "Maison Test", client_name: "Client Dupont" },
    }));
    const search = url.searchParams.get("or");
    if (search) {
      expect(url.searchParams.get("match.or")).toContain("client_name.ilike");
      expect(search).toContain("match.not.is.null");
    }
    const rows = search?.includes("absent") ? [] : records;
    const offset = Number(url.searchParams.get("offset") ?? 0);
    await route.fulfill({ json: rows.slice(offset, offset + 20) });
  });
  await login(page);
  await page.getByLabel("Nom de l’entreprise").fill("Estimates company");
  await page.getByRole("button", { name: "Créer mon entreprise" }).click();
  await expect(page).toHaveURL(new RegExp(`company=${org}`));
  if (test.info().project.name === "mobile")
    await page.getByRole("button", { name: "Navigation", exact: true }).click();
  await page.getByRole("link", { name: "Devis", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/workspace/${org}/estimates`));
  await expect(page.locator("tbody tr")).toHaveCount(20);
  await page.getByRole("button", { name: "Voir plus", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(21);
  await expect(
    page.getByRole("link", { name: "Kitchen quote 0", exact: true }),
  ).toHaveAttribute(
    "href",
    `/workspace/${org}/projects/project-a/estimates/estimate-0`,
  );
  await page
    .getByRole("textbox", { name: "Rechercher un devis, projet ou client" })
    .fill("absent");
  await page.getByRole("button", { name: "Rechercher", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(0);
  await page
    .getByRole("textbox", { name: "Rechercher un devis, projet ou client" })
    .fill("Dupont");
  await page.getByRole("button", { name: "Rechercher", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(20);
  await page.getByRole("combobox", { name: "Langue" }).selectOption("en");
  await expect(
    page.getByRole("heading", { name: "Estimates", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `/private/tmp/renvo-estimates-overview-${test.info().project.name}.png`,
    fullPage: true,
  });
});

test("project budget, cost recovery, conflict and void history", async ({
  page,
}) => {
  await mockApi(page);
  let budget: number | null = null,
    revision: number | null = null,
    lose = true,
    conflict = true;
  const costs: Array<{
    id: string;
    organization_id: string;
    project_id: string;
    description: string;
    category: string;
    amount_cents: number;
    incurred_on: string;
    notes: string;
    voided: boolean;
    revision: number;
  }> = [];
  await page.route("**/rest/v1/rpc/project_cost_summary", (route) => {
    const body = route.request().postDataJSON();
    expect(body.p_organization_id).toBe(org);
    const total = costs
      .filter((c) => !c.voided)
      .reduce((sum, c) => sum + c.amount_cents, 0);
    return route.fulfill({
      json: [
        {
          budget_cents: budget,
          budget_revision: revision,
          materials: String(total),
          labor: "0",
          subcontractors: "0",
          other: "0",
          total: String(total),
        },
      ],
    });
  });
  await page.route("**/rest/v1/project_budgets**", async (route) => {
    const body = route.request().postDataJSON();
    if (route.request().method() === "POST") {
      budget = body.budget_cents;
      revision = 1;
    } else {
      expect(new URL(route.request().url()).searchParams.get("revision")).toBe(
        `eq.${revision}`,
      );
      budget = body.budget_cents;
      revision = body.revision;
    }
    await route.fulfill({
      json:
        route.request().method() === "POST"
          ? { budget_cents: budget, revision }
          : [{ budget_cents: budget, revision }],
    });
  });
  await page.route("**/rest/v1/project_costs**", async (route) => {
    const url = new URL(route.request().url()),
      method = route.request().method();
    if (method === "POST") {
      const body = route.request().postDataJSON();
      expect(body.organization_id).toBe(org);
      if (costs.some((c) => c.id === body.id)) {
        await route.fulfill({ status: 409, json: { code: "23505" } });
        return;
      }
      const row = { ...body, revision: 1, voided: false };
      costs.push(row);
      if (lose) {
        lose = false;
        await route.abort();
      } else await route.fulfill({ json: row });
      return;
    }
    expect(url.searchParams.get("organization_id")).toBe(`eq.${org}`);
    const row = costs.find((c) => `eq.${c.id}` === url.searchParams.get("id"));
    if (method === "PATCH") {
      const body = route.request().postDataJSON();
      if (!row) throw new Error("Missing fixture");
      if (conflict && !body.voided) {
        row.revision++;
        conflict = false;
      }
      if (url.searchParams.get("revision") !== `eq.${row.revision}`) {
        await route.fulfill({ json: [] });
        return;
      }
      Object.assign(row, body);
      await route.fulfill({ json: [row] });
      return;
    }
    await route.fulfill({
      json: url.searchParams.has("id")
        ? costs.filter((c) => `eq.${c.id}` === url.searchParams.get("id"))
        : costs,
    });
  });
  await login(page);
  await page.getByLabel("Nom de l’entreprise").fill("Cost company");
  await page.getByRole("button", { name: "Créer mon entreprise" }).click();
  await page.getByRole("button", { name: "Nouveau projet" }).click();
  await page.getByLabel("Nom du projet", { exact: true }).fill("Cost site");
  await page.getByLabel("Client", { exact: true }).fill("Client");
  await page.getByLabel("Ville", { exact: true }).fill("Bruxelles");
  await page
    .getByRole("button", { name: "Créer le projet", exact: true })
    .click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page
    .getByRole("button", { name: "Créer le projet", exact: true })
    .click();
  await page.getByRole("link", { name: "Cost site", exact: true }).click();
  const panel = page.getByRole("region", {
    name: "Budget et coûts",
    exact: true,
  });
  await expect(panel.getByText("Non défini", { exact: true })).toBeVisible();
  await panel.getByRole("button", { name: "Modifier le budget" }).click();
  await panel.getByLabel("Budget de coûts", { exact: true }).fill("100.00");
  await panel.getByRole("button", { name: "Enregistrer le budget" }).click();
  await expect(
    panel.locator(".metrics").getByText("100,00 €", { exact: true }),
  ).toHaveCount(2);
  await panel.getByRole("button", { name: "Ajouter un coût" }).click();
  await panel.getByLabel("Description du coût").fill("Peinture");
  await panel.getByLabel("Montant HT (€)").fill("120,29");
  await panel.getByRole("button", { name: "Enregistrer le coût" }).click();
  await expect(panel.getByRole("alert")).toContainText(
    "Enregistrement non confirmé",
  );
  await panel.getByRole("button", { name: "Enregistrer le coût" }).click();
  await expect(panel.locator("article")).toHaveCount(1);
  expect(costs).toHaveLength(1);
  await expect(
    panel.locator(".metrics").getByText("20,29 €", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(panel.locator("article")).toHaveCount(1);
  await panel.getByRole("button", { name: "Modifier", exact: true }).click();
  await panel.getByLabel("Montant HT (€)").fill("90.29");
  await panel.getByRole("button", { name: "Enregistrer le coût" }).click();
  await expect(panel.getByRole("alert")).toContainText(
    "Les données ont changé",
  );
  await expect(panel.getByLabel("Montant HT (€)")).toHaveValue("90.29");
  await panel.getByRole("button", { name: "Recharger les coûts" }).click();
  await panel.getByRole("button", { name: "Modifier", exact: true }).click();
  await panel.getByLabel("Montant HT (€)").fill("90.29");
  await panel.getByRole("button", { name: "Enregistrer le coût" }).click();
  await expect(
    panel.locator(".metrics").getByText("9,71 €", { exact: true }),
  ).toBeVisible();
  await page.getByRole("combobox", { name: "Langue" }).selectOption("en");
  const english = page.getByRole("region", {
    name: "Budget and costs",
    exact: true,
  });
  await expect(
    english.locator(".metrics").getByText("€9.71", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.locator("main").focus();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `/private/tmp/renvo-costs-${test.info().project.name}.png`,
    fullPage: true,
  });
  await english.getByRole("button", { name: "Void cost", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await expect(english.locator("article")).toHaveCount(1);
  await english.getByRole("button", { name: "Void cost", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Void cost", exact: true })
    .click();
  await expect(english.getByText("Voided cost", { exact: true })).toBeVisible();
  await expect(
    english.locator(".metrics").getByText("€0.00", { exact: true }),
  ).toBeVisible();
  await expect(
    english.getByRole("button", { name: "Edit", exact: true }),
  ).toHaveCount(0);
});

test("clients and properties prefill a linked project", async ({
  page,
  isMobile,
}) => {
  await mockApi(page);
  const clients: Record<string, unknown>[] = [];
  const properties: Record<string, unknown>[] = [];
  let lost = false;
  for (const [table, rows] of [
    ["clients", clients],
    ["properties", properties],
  ] as const) {
    await page.route(`**/rest/v1/${table}**`, async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      expect(
        url.searchParams.get("organization_id") ??
          request.postDataJSON()?.organization_id,
      ).toBe(request.method() === "POST" ? org : `eq.${org}`);
      if (request.method() === "POST") {
        const body = request.postDataJSON();
        if (rows.some((row) => row.id === body.id))
          return route.fulfill({ status: 409, json: { code: "23505" } });
        rows.push({ ...body, revision: 1, created_at: "2026-09-20T00:00:00Z" });
        if (table === "clients" && !lost) {
          lost = true;
          return route.abort();
        }
        return route.fulfill({ json: rows.at(-1) });
      }
      await route.fulfill({
        json: url.searchParams.has("id")
          ? rows.filter((row) => `eq.${row.id}` === url.searchParams.get("id"))
          : rows,
      });
    });
  }
  await login(page);
  await page.getByLabel("Nom de l’entreprise").fill("Directory company");
  await page.getByRole("button", { name: "Créer mon entreprise" }).click();
  await expect(
    page.getByRole("button", { name: "Nouveau projet" }),
  ).toBeVisible();
  if (isMobile)
    await page.getByRole("button", { name: "Navigation", exact: true }).click();
  await page.getByRole("link", { name: "Clients", exact: true }).click();
  await page.getByRole("button", { name: "Ajouter un client" }).click();
  await page
    .getByLabel("Nom du client", { exact: true })
    .fill("Client exemple");
  await page.getByLabel("E-mail du client").fill("client@example.test");
  await page.getByRole("button", { name: "Enregistrer le client" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Enregistrement non confirmé",
  );
  await page.getByRole("button", { name: "Enregistrer le client" }).click();
  await page
    .getByRole("button", { name: "Client exemple", exact: true })
    .click();
  expect(clients).toHaveLength(1);
  await page.getByRole("button", { name: "Ajouter un bien" }).click();
  await page.getByLabel("Nom du bien").fill("Maison exemple");
  await page.getByLabel("Adresse du bien").fill("12 rue Exemple");
  await page.getByLabel("Ville du bien").fill("Namur");
  await page.getByRole("button", { name: "Enregistrer le bien" }).click();
  await expect(page.getByText("Maison exemple", { exact: true })).toBeVisible();
  await page.screenshot({
    path: `/private/tmp/renvo-directory-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("link", { name: "Retour aux projets" }).click();
  await page.getByRole("button", { name: "Nouveau projet" }).click();
  await page
    .getByLabel("Nom du projet", { exact: true })
    .fill("Rénovation exemple");
  await page
    .getByLabel("Client enregistré (facultatif)")
    .selectOption(String(clients[0].id));
  await page
    .getByLabel("Bien enregistré (facultatif)")
    .selectOption(String(properties[0].id));
  await expect(page.getByLabel("Client", { exact: true })).toHaveValue(
    "Client exemple",
  );
  await expect(page.getByLabel("Ville", { exact: true })).toHaveValue("Namur");
  await expect(page.getByLabel("Nom du projet", { exact: true })).toHaveValue(
    "Rénovation exemple",
  );
  const posted = page.waitForRequest(
    (request) =>
      request.method() === "POST" &&
      request.url().includes("/rest/v1/projects"),
  );
  await page
    .getByRole("button", { name: "Créer le projet", exact: true })
    .click();
  expect((await posted).postDataJSON()).toMatchObject({
    client_id: clients[0].id,
    property_id: properties[0].id,
    address: "12 rue Exemple",
  });
  await expect(page.getByRole("alert")).toBeVisible();
  await page
    .getByRole("button", { name: "Créer le projet", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Rénovation exemple", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
