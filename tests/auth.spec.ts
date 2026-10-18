import { expect, type Page, test } from "@playwright/test";
import { jsPDF } from "jspdf";
import { selectPersonalLanguage } from "./fixtures/personal-language";

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
  let accountUser = { ...user, user_metadata: { ...user.user_metadata } };
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
  let preferences = { default_language: "fr", settings_revision: 1 };
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
      if (url.pathname.endsWith("/clients")) {
        return route.fulfill({
          json:
            method === "POST"
              ? { ...route.request().postDataJSON(), revision: 1 }
              : [],
        });
      }
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
            user: accountUser,
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
        if (method === "PUT") {
          const body = route.request().postDataJSON();
          accountUser = {
            ...accountUser,
            user_metadata: { ...accountUser.user_metadata, ...body.data },
          };
          await route.fulfill({ json: { user: accountUser } });
        } else await route.fulfill({ json: accountUser });
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
                    doc.setFontSize(24);
                    doc.text("PROJECT DOCUMENT", 20, 30);
                    doc.setFontSize(12);
                    doc.text(
                      "Fictional renovation plan - PDF viewer verification",
                      20,
                      45,
                    );
                    doc.line(20, 55, 190, 55);
                    for (let line = 0; line < 12; line++) {
                      doc.text(
                        `Site detail ${line + 1} - materials and installation notes`,
                        20,
                        70 + line * 12,
                      );
                    }
                    doc.addPage();
                    doc.text("Second preview page", 20, 30);
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
          if (body.settings_revision) {
            expect(url.searchParams.get("settings_revision")).toBe(
              `eq.${preferences.settings_revision}`,
            );
            preferences = { ...preferences, ...body };
          } else {
            expect(url.searchParams.get("contact_revision")).toBe(
              `eq.${contacts.contact_revision}`,
            );
            contacts = { ...contacts, ...body };
          }
        }
        await route.fulfill({
          json: [
            {
              id: org,
              name: company,
              country: "BE",
              ...contacts,
              ...preferences,
            },
          ],
        });
        return;
      }
      if (url.pathname.endsWith("/rpc/team_members")) {
        await route.fulfill({
          json: [{ user_id: id, email: user.email, role: "owner" }],
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
                  role: "owner",
                  organizations: {
                    id: org,
                    name: company,
                    country: "BE",
                    default_language: "fr",
                  },
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
async function login(page: Page, dismissConsent = true) {
  await page.goto("/login");
  if (dismissConsent)
    await page
      .getByRole("button", { name: "Tout refuser", exact: true })
      .click();
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
  await login(page, true);
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
    .getByRole("link", {
      name: "Paramètres",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "Paramètres", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Langue par défaut")).toHaveValue("fr");
  await expect(page.getByLabel("Pays de l’entreprise")).toHaveValue("BE");
  await expect(page.getByText("EUR · €")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Abonnement" })).toHaveCount(
    0,
  );
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
  await page.goto(`/workspace?company=${org}`);
  await expect(
    page.getByText("Aucun projet pour le moment.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Nouveau projet" }).click();
  await page
    .getByLabel("Nom du projet", { exact: true })
    .fill("Rénovation cuisine");
  await page.getByLabel("Nom du client", { exact: true }).fill("Client Test");
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
  await selectPersonalLanguage(page, "en");
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
    register.getByRole("link", { name: "Open schedule" }),
  ).toBeVisible();
  await page.screenshot({
    path: `/private/tmp/renvo-projects-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page
    .getByRole("link", { name: "Rénovation cuisine", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Edit details", exact: true })
    .first()
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
  await page
    .getByRole("button", { name: "Edit details", exact: true })
    .first()
    .click();
  await expect(page.getByLabel("Project name", { exact: true })).toHaveValue(
    "Kitchen renovation",
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Close", exact: true })
    .click();
  await selectPersonalLanguage(page, "fr");
  await page
    .getByRole("button", { name: "Modifier les détails", exact: true })
    .first()
    .click();
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
  page.once("dialog", (dialog) => dialog.accept());
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
  await page.getByRole("link", { name: "Retour aux projets" }).click();
  await expect(
    page.getByRole("link", { name: "Reconciled project", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Reconciled project", exact: true })
    .click();
  await page
    .locator(".project-tabs")
    .getByRole("link", { name: "Devis", exact: true })
    .click();
  await expect(
    page.getByText("Aucun devis pour ce projet.", { exact: true }),
  ).toBeVisible();
  await page
    .locator(".project-tabs")
    .getByRole("link", { name: "Documents", exact: true })
    .click();
  const files = page.locator(".project-files");
  await expect(
    files.getByText("Aucun fichier pour ce projet.", { exact: true }),
  ).toBeVisible();
  await page.evaluate(() => {
    const streams: MediaStream[] = [];
    Object.assign(window, { captureStreams: streams });
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      if (constraints?.video) {
        const canvas = document.createElement("canvas");
        canvas.width = 320;
        canvas.height = 240;
        canvas.getContext("2d")?.fillRect(0, 0, 320, 240);
        const stream = canvas.captureStream(5);
        streams.push(stream);
        return stream;
      }
      const context = new AudioContext();
      const tone = context.createOscillator();
      const destination = context.createMediaStreamDestination();
      tone.connect(destination);
      tone.start();
      streams.push(destination.stream);
      return destination.stream;
    };
  });
  await page
    .locator(".project-tabs")
    .getByRole("link", { name: "Documents", exact: true })
    .click();
  await files.getByRole("button", { name: "Note vocale", exact: true }).click();
  await expect(page).toHaveURL(/\?tab=documents$/);
  await expect(page.getByRole("dialog", { name: "Note vocale" })).toBeVisible();
  await page
    .getByRole("dialog", { name: "Note vocale" })
    .getByRole("button", { name: "Annuler", exact: true })
    .last()
    .click();
  await expect(
    page
      .locator(".project-tabs")
      .getByRole("link", { name: "Documents", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await files
    .getByRole("button", { name: "Prendre une photo", exact: true })
    .click();
  await expect
    .poll(() =>
      page
        .locator("video")
        .evaluate((video: HTMLVideoElement) => video.videoWidth),
    )
    .toBeGreaterThan(0);
  await page
    .getByRole("button", { name: "Prendre la photo", exact: true })
    .click();
  await expect(page.getByRole("dialog").locator("img")).toBeVisible();
  page.once("dialog", (d) => d.dismiss());
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog").locator("img")).toBeVisible();
  await page.getByRole("button", { name: "Utiliser ce fichier" }).click();
  await expect(files.locator(".document-selected")).toContainText("photo-");
  page.once("dialog", (d) => d.accept());
  await files.getByRole("button", { name: "Note vocale", exact: true }).click();
  await page.getByRole("button", { name: "Démarrer l’enregistrement" }).click();
  await expect(page.getByRole("dialog").getByRole("status")).toContainText(
    "Enregistrement en cours",
  );
  await expect(page.getByRole("dialog").getByRole("status")).toContainText(
    "0:01",
  );
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.getByRole("dialog").locator("audio")).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.getByRole("dialog").locator("audio")).toBeVisible();
  await page.getByRole("button", { name: "Utiliser ce fichier" }).click();
  await expect(files.locator(".document-selected")).toContainText("voice-");
  expect(
    await page.evaluate(() =>
      (
        window as unknown as { captureStreams: MediaStream[] }
      ).captureStreams.every((stream) =>
        stream.getTracks().every((track) => track.readyState === "ended"),
      ),
    ),
  ).toBe(true);
  page.once("dialog", (d) => d.accept());
  await page.evaluate(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      throw new DOMException("Denied", "NotAllowedError");
    };
  });
  await files.getByRole("button", { name: "Note vocale", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "accès refusé",
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Annuler", exact: true })
    .last()
    .click();
  await files.locator('input[type="file"]').setInputFiles({
    name: "plan.heic",
    mimeType: "image/heic",
    buffer: Buffer.from("test"),
  });
  await expect(files.getByRole("alert")).toContainText("HEIC/HEIF");
  const droppedFiles = await page.evaluateHandle(() => {
    const transfer = new DataTransfer();
    const bytes = Uint8Array.from(
      atob(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j8ioAAAAASUVORK5CYII=",
      ),
      (char) => char.charCodeAt(0),
    );
    transfer.items.add(
      new File([bytes], "chantier.png", { type: "image/png" }),
    );
    return transfer;
  });
  const dropzone = files.locator(".document-upload-shell");
  await dropzone.dispatchEvent("dragenter", { dataTransfer: droppedFiles });
  await expect(dropzone).toHaveClass(/is-dragging/);
  await dropzone.dispatchEvent("drop", { dataTransfer: droppedFiles });
  await expect(dropzone).not.toHaveClass(/is-dragging/);
  await expect(dropzone.getByRole("status")).toContainText("chantier.png");
  await droppedFiles.dispose();
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
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `/private/tmp/project-documents-${test.info().project.name}.png`,
    fullPage: true,
  });
  const previewImage = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 800;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas unavailable");
    context.fillStyle = "#e9ede9";
    context.fillRect(0, 0, 1200, 800);
    context.fillStyle = "#244b63";
    context.fillRect(130, 120, 940, 540);
    context.fillStyle = "#bce5c5";
    context.fillRect(200, 195, 390, 310);
    context.fillStyle = "#ffffff";
    context.font = "40px sans-serif";
    context.fillText("Fictional site image", 220, 585);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  const imageRoute = "**/object/sign/project-files/preview.png?token=test";
  await page.route(imageRoute, (route) =>
    route.fulfill({
      body: Buffer.from(previewImage, "base64"),
      contentType: "image/png",
    }),
  );
  await files.getByRole("button", { name: "Aperçu", exact: true }).click();
  const imageDialog = page.getByRole("dialog");
  const image = imageDialog.getByRole("img", { name: "chantier.png" });
  await expect(image).toBeVisible();
  await expect
    .poll(() =>
      image.evaluate((element) => (element as HTMLImageElement).naturalWidth),
    )
    .toBe(1200);
  const imageBounds = await imageDialog.boundingBox();
  expect(imageBounds?.y).toBeGreaterThanOrEqual(0);
  expect(
    (imageBounds?.y ?? 0) + (imageBounds?.height ?? 0),
  ).toBeLessThanOrEqual((page.viewportSize()?.height ?? 0) + 1);
  const fittedWidth = await image.evaluate(
    (element) => element.getBoundingClientRect().width,
  );
  await imageDialog
    .getByRole("button", { name: "Agrandir", exact: true })
    .click();
  await expect
    .poll(() =>
      image.evaluate((element) => element.getBoundingClientRect().width),
    )
    .toBeGreaterThan(fittedWidth);
  const imageStage = imageDialog.getByRole("region", {
    name: "Image du projet",
  });
  await expect
    .poll(() =>
      imageStage.evaluate(
        (element) => element.scrollWidth > element.clientWidth,
      ),
    )
    .toBe(true);
  await imageStage.focus();
  await expect(imageStage).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect
    .poll(() => imageStage.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(0);
  await imageDialog
    .getByRole("button", { name: "Ajuster à la fenêtre", exact: true })
    .click();
  await expect
    .poll(() =>
      image.evaluate((element) => element.getBoundingClientRect().width),
    )
    .toBe(fittedWidth);
  const imageDownload = page.waitForEvent("download");
  await imageDialog
    .getByRole("button", { name: "Télécharger", exact: true })
    .click();
  expect((await imageDownload).suggestedFilename()).toBe("chantier.png");
  await page.screenshot({
    path: `/private/tmp/renvo-image-fr-${test.info().project.name}.png`,
    fullPage: false,
  });
  await page.keyboard.press("Escape");
  await selectPersonalLanguage(page, "en");
  await files.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("button", { name: "Fit to window", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("dialog").getByRole("img", { name: "chantier.png" }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page
        .getByRole("dialog")
        .evaluate((element) => getComputedStyle(element).opacity),
    )
    .toBe("1");
  await page.screenshot({
    path: `/private/tmp/renvo-image-en-${test.info().project.name}.png`,
    fullPage: false,
  });
  await page.keyboard.press("Escape");
  await selectPersonalLanguage(page, "fr");
  await page.unroute(imageRoute);
  await files.locator(".file-more-actions summary").click();
  const fileDownload = page.waitForEvent("download");
  await files.getByRole("button", { name: "Télécharger", exact: true }).click();
  expect((await fileDownload).suggestedFilename()).toBe("chantier.png");
  await files.locator(".file-more-actions summary").click();
  await files.getByRole("button", { name: "Supprimer", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Annuler" })
    .click();
  await expect(files.getByText("chantier.png", { exact: true })).toBeVisible();
  await files.locator(".file-more-actions summary").click();
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
  pdf.addPage();
  pdf.text("Second page", 20, 30);
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
  const pdfDialog = page.getByRole("dialog");
  const dialogBounds = await pdfDialog.boundingBox();
  expect(dialogBounds?.y).toBeGreaterThanOrEqual(0);
  expect(
    (dialogBounds?.y ?? 0) + (dialogBounds?.height ?? 0),
  ).toBeLessThanOrEqual((page.viewportSize()?.height ?? 0) + 1);
  const sheet = pdfDialog.locator("canvas");
  const initialWidth = await sheet.evaluate(
    (el) => el.getBoundingClientRect().width,
  );
  await pdfDialog
    .getByRole("button", { name: "Agrandir", exact: true })
    .click();
  await expect
    .poll(() => sheet.evaluate((el) => el.getBoundingClientRect().width))
    .toBeGreaterThan(initialWidth);
  await pdfDialog
    .getByRole("button", { name: "Ajuster la largeur", exact: true })
    .click();
  await expect
    .poll(() => sheet.evaluate((el) => el.getBoundingClientRect().width))
    .toBe(initialWidth);
  await pdfDialog
    .getByRole("button", { name: "Suivante", exact: true })
    .click();
  await expect(sheet).toHaveAttribute("aria-label", "plan.pdf - 2");
  await expect(sheet).toHaveAttribute("data-rendered", "true");
  await expect(
    pdfDialog.getByRole("button", { name: "Suivante", exact: true }),
  ).toBeDisabled();
  await pdfDialog
    .getByRole("button", { name: "Précédente", exact: true })
    .click();
  await expect(sheet).toHaveAttribute("aria-label", "plan.pdf - 1");
  await expect(sheet).toHaveAttribute("data-rendered", "true");
  await page.screenshot({
    path: `/private/tmp/renvo-file-preview-${test.info().project.name}.png`,
    fullPage: false,
  });
  await page.keyboard.press("Escape");
  await selectPersonalLanguage(page, "en");
  await files.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(
    page.getByRole("dialog").locator('canvas[data-rendered="true"]'),
  ).toBeVisible();
  const pdfDownload = page.waitForEvent("download");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Download", exact: true })
    .click();
  expect((await pdfDownload).suggestedFilename()).toBe("plan.pdf");
  const viewport = page.getByRole("region", { name: "PDF document page" });
  await viewport.focus();
  await expect(viewport).toBeFocused();
  await page.keyboard.press("PageDown");
  await expect(
    page.getByRole("button", { name: "Fit width", exact: true }),
  ).toBeInViewport();
  await page.screenshot({
    path: `/private/tmp/renvo-pdf-en-${test.info().project.name}.png`,
    fullPage: false,
  });
  await page.keyboard.press("Escape");
  await selectPersonalLanguage(page, "fr");
  await files.screenshot({
    path: `/private/tmp/renvo-files-${test.info().project.name}.png`,
  });
  await page
    .locator(".project-tabs")
    .getByRole("link", { name: "Devis", exact: true })
    .click();
  await page
    .locator("#project-estimates")
    .getByRole("button", { name: "Nouveau devis", exact: true })
    .first()
    .click();
  await page
    .getByLabel("Titre du devis", { exact: true })
    .fill("Rénovation étage");
  await page.getByRole("button", { name: "Créer le brouillon" }).click();
  await expect(
    page.getByText("Création non confirmée.", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Réessayer", exact: true })
    .click();
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
  page.once("dialog", (prompt) => prompt.accept());
  await page
    .getByRole("button", { name: "Recharger et remplacer mes champs" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Other estimate edit" }),
  ).toBeVisible();
  await selectPersonalLanguage(page, "en");
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
  await page
    .locator(".estimate-breadcrumbs")
    .getByRole("link", { name: "Reconciled project", exact: true })
    .click();
  await page
    .locator(".project-tabs")
    .getByRole("link", { name: "Estimates", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Other estimate edit", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Back to projects" }).click();
  const footer = page.locator(".app-footer");
  const cookieSettings = footer.getByRole("button", {
    name: "Cookie Settings",
    exact: true,
  });
  await expect(cookieSettings).toHaveCSS("position", "static");
  await expect(footer.locator('a[href="/design-system"]')).toHaveCount(0);
  await expect(page.locator(".privacy-controls-floating")).toHaveCount(0);
  await cookieSettings.click();
  await expect(page.locator("#privacy-panel")).toBeVisible();
  await page.getByRole("button", { name: "Reject all", exact: true }).click();
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
  await page.getByRole("button", { name: "Tout refuser" }).click();
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
test("account settings save profile language and change password", async ({
  page,
}, testInfo) => {
  await mockApi(page);
  let accountUser = { ...user, user_metadata: { ...user.user_metadata } };
  let passwordUpdates = 0;
  await page.route(
    "https://oripsywzngftarbprlgk.supabase.co/auth/v1/user",
    async (route) => {
      if (route.request().method() !== "PUT") {
        await route.fulfill({ json: accountUser });
        return;
      }
      const body = route.request().postDataJSON();
      if (body.data) {
        expect(body.data).toEqual({
          full_name: "Camille Laurent",
          preferred_language: "en",
        });
        accountUser = {
          ...accountUser,
          user_metadata: { ...accountUser.user_metadata, ...body.data },
        };
      } else if (body.password) {
        passwordUpdates++;
        expect(body.current_password).toBe("current-password");
        expect(body.password).toBe("new-password-123");
        if (passwordUpdates === 1) {
          await route.fulfill({
            status: 400,
            headers: {
              "x-supabase-api-version": "2024-01-01",
              "access-control-expose-headers": "x-supabase-api-version",
            },
            json: { code: "invalid_credentials", msg: "Invalid credentials" },
          });
          return;
        }
      }
      await route.fulfill({ json: { user: accountUser } });
    },
  );
  await page.goto("/login");
  await page.getByRole("button", { name: "Tout refuser" }).click();
  await page.getByRole("textbox", { name: "Adresse e-mail" }).fill(user.email);
  await page.getByLabel("Mot de passe", { exact: true }).fill("test-password");
  await page.getByRole("button", { name: "Se connecter", exact: true }).click();
  await expect(page).toHaveURL(/\/workspace/);
  if (testInfo.project.name === "mobile")
    await page.getByRole("button", { name: "Navigation" }).click();
  await page.locator(".account-menu > summary").click();
  await page.getByRole("link", { name: "Paramètres du compte" }).click();
  await expect(page).toHaveURL(/\/workspace\/account$/);
  await page
    .getByRole("textbox", { name: "Nom complet" })
    .fill("Camille Laurent");
  await page
    .getByRole("combobox", { name: "Langue préférée" })
    .selectOption("en");
  await page.getByRole("button", { name: "Enregistrer le profil" }).click();
  await expect(page.getByRole("status")).toContainText("Profile saved");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Full name" })).toHaveValue(
    "Camille Laurent",
  );
  await expect(
    page.getByRole("combobox", { name: "Preferred language" }),
  ).toHaveValue("en");
  await page
    .getByRole("button", { name: "Change password", exact: true })
    .click();
  await page
    .getByLabel("Current password", { exact: true })
    .fill("current-password");
  await page
    .getByLabel("New password", { exact: true })
    .fill("new-password-123");
  await page
    .getByLabel("Confirm new password", { exact: true })
    .fill("different-password-123");
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page.getByRole("alert")).toContainText("do not match");
  expect(passwordUpdates).toBe(0);
  await page
    .getByLabel("Confirm new password", { exact: true })
    .fill("new-password-123");
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "current password is incorrect",
  );
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(
    page
      .getByRole("region", { name: "Password", exact: true })
      .getByRole("status"),
  ).toContainText("Password updated");
  expect(passwordUpdates).toBe(2);
  await expect(
    page.getByLabel("Current password", { exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Change password", exact: true })
    .click();
  await expect(
    page.getByLabel("Current password", { exact: true }),
  ).toHaveValue("");
});
test("live pages share the shell content bounds", async ({
  page,
}, testInfo) => {
  await mockApi(page);
  if (testInfo.project.name === "desktop")
    await page.setViewportSize({ width: 2200, height: 1000 });
  const projectId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
  await page.route("**/rest/v1/organization_memberships**", (route) =>
    route.fulfill({
      json: [
        {
          organization_id: org,
          role: "owner",
          organizations: {
            id: org,
            name: "Atelier du Parc",
            country: "BE",
            default_language: "fr",
          },
        },
      ],
    }),
  );
  await page.route("**/rest/v1/projects**", (route) =>
    route.fulfill({
      json: [
        {
          id: projectId,
          organization_id: org,
          name: "Maison du Parc",
          client_name: "Camille Laurent",
          city: "Bruxelles",
          address: "12 rue Exemple",
          status: "active",
          revision: 1,
        },
      ],
    }),
  );
  await page.route("**/rest/v1/estimates**", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route("**/rest/v1/project_files**", (route) =>
    route.fulfill({ json: [] }),
  );
  await login(page, true);
  await expect(page).toHaveURL(/\/workspace/);
  for (const [path, selector] of [
    [`/workspace?company=${org}`, ".connected-workspace"],
    ["/workspace/account", ".account-settings-page"],
    [`/workspace/${org}/settings`, ".connected-workspace"],
    [`/workspace/${org}/clients`, ".clients-register"],
    [`/workspace/${org}/schedule`, ".schedule-workspace"],
    [`/workspace/${org}/estimates`, ".estimates-register"],
    [`/workspace/${org}/team`, ".team-directory"],
    [`/workspace/${org}/projects/${projectId}`, ".project-detail-workspace"],
    [
      `/workspace/${org}/projects/${projectId}/estimates/${projectId}`,
      ".live-estimate",
    ],
  ] as const) {
    await page.goto(path);
    const content = page.locator(selector);
    await expect(content).toBeVisible();
    const bounds = await page.locator(".app-content").evaluate((main) => {
      const rect = main.getBoundingClientRect();
      const style = getComputedStyle(main);
      return {
        left: rect.left + Number.parseFloat(style.paddingLeft),
        right: rect.right - Number.parseFloat(style.paddingRight),
      };
    });
    const rect = await content.boundingBox();
    expect(rect, path).not.toBeNull();
    expect(Math.abs((rect?.x ?? 0) - bounds.left), path).toBeLessThan(2);
    expect(
      Math.abs((rect?.x ?? 0) + (rect?.width ?? 0) - bounds.right),
      path,
    ).toBeLessThan(2);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      path,
    ).toBe(true);
  }
});
test("signup and recovery explain the email step without sending mail", async ({
  page,
}) => {
  await mockApi(page);
  await page.goto("/signup");
  await page.getByRole("button", { name: "Tout refuser" }).click();
  await page
    .getByRole("textbox", { name: "Adresse e-mail" })
    .fill("test@example.test");
  await page
    .getByLabel("Mot de passe", { exact: true })
    .fill("long-test-password");
  const terms = page.getByRole("checkbox", {
    name: /J’accepte les Conditions d’utilisation/,
  });
  await expect(terms).not.toBeChecked();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await expect(terms).toBeFocused();
  await expect(page.getByRole("status")).toHaveCount(0);
  await page.getByRole("combobox", { name: "Langue" }).selectOption("en");
  await expect(
    page.getByRole("link", { name: "Terms of Service", exact: true }),
  ).toHaveAttribute("href", "/en/terms/");
  await expect(
    page.getByRole("link", { name: "Privacy Policy", exact: true }),
  ).toHaveAttribute("target", "_blank");
  await page.getByRole("checkbox").focus();
  await page.keyboard.press("Space");
  await page.getByRole("combobox", { name: "Language" }).selectOption("fr");
  const signupRequest = page.waitForRequest((request) =>
    new URL(request.url()).pathname.endsWith("/auth/v1/signup"),
  );
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  expect(
    new URL((await signupRequest).url()).searchParams.get("redirect_to"),
  ).toBe(`${new URL(page.url()).origin}/auth/callback`);
  await expect(page.getByRole("status")).toContainText(
    "Consultez votre boîte mail",
  );
  await page.goto("/auth/forgot");
  await page
    .getByRole("textbox", { name: "Adresse e-mail" })
    .fill("test@example.test");
  const recoveryRequest = page.waitForRequest((request) =>
    new URL(request.url()).pathname.endsWith("/auth/v1/recover"),
  );
  await page.getByRole("button", { name: "Envoyer le lien" }).click();
  expect(
    new URL((await recoveryRequest).url()).searchParams.get("redirect_to"),
  ).toBe(`${new URL(page.url()).origin}/auth/reset`);
  await expect(page.getByRole("status")).toContainText(
    "Si un compte correspond",
  );
  const inviteId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
  await page.goto(`/signup?next=${encodeURIComponent(`/invite/${inviteId}`)}`);
  await page
    .getByRole("textbox", { name: "Adresse e-mail" })
    .fill("test@example.test");
  await page
    .getByLabel("Mot de passe", { exact: true })
    .fill("long-test-password");
  await page.getByRole("checkbox").check();
  const inviteSignupRequest = page.waitForRequest((request) =>
    new URL(request.url()).pathname.endsWith("/auth/v1/signup"),
  );
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  expect(
    new URL((await inviteSignupRequest).url()).searchParams.get("redirect_to"),
  ).toBe(
    `${new URL(page.url()).origin}/auth/callback?next=${encodeURIComponent(`/invite/${inviteId}`)}`,
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
    conflict = true,
    failSchedule = false;
  await page.route("**/rest/v1/project_tasks**", async (route) => {
    const url = new URL(route.request().url()),
      method = route.request().method();
    const taskId = url.searchParams.get("id")?.slice(3);
    const row = tasks.find((t) => t.id === taskId);
    if (method === "POST") {
      const input = route.request().postDataJSON();
      expect(input.organization_id).toBe(org);
      expect(input.assignee_id).toBe(id);
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
    if (failSchedule && url.searchParams.has("or")) {
      await route.fulfill({ status: 400, json: { message: "Unavailable" } });
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
  await page.getByLabel("Nom du client", { exact: true }).fill("Test Client");
  await page.getByLabel("Ville", { exact: true }).fill("Bruxelles");
  await page
    .getByRole("button", { name: "Créer le projet", exact: true })
    .click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page
    .getByRole("button", { name: "Créer le projet", exact: true })
    .click();
  await page.getByRole("link", { name: "Task site", exact: true }).click();
  const projectUrl = `${page.url()}?tab=tasks`;
  await page
    .locator(".project-tabs")
    .getByRole("link", { name: "Tâches", exact: true })
    .click();
  const panel = page.getByRole("region", { name: "Tâches du projet" });
  const editor = page.getByRole("dialog");
  await panel.getByRole("button", { name: "Nouvelle tâche" }).click();
  await editor.getByLabel("Nom de la tâche").fill("Préparer le chantier");
  await editor.getByLabel("Responsable", { exact: true }).selectOption(id);
  await editor.getByLabel("Date de début").fill("2026-09-23");
  await editor.getByLabel("Date limite").fill("2026-09-21");
  await editor.getByRole("button", { name: "Enregistrer la tâche" }).click();
  await expect(editor.getByRole("alert")).toContainText("Vérifiez");
  await editor.getByLabel("Date de début").fill("2026-09-21");
  await editor.getByLabel("Date limite").fill("2026-09-23");
  await editor.getByRole("button", { name: "Enregistrer la tâche" }).click();
  await expect(editor.getByRole("alert")).toContainText(
    "Enregistrement non confirmé",
  );
  await editor.getByRole("button", { name: "Enregistrer la tâche" }).click();
  await expect(panel.locator("article")).toHaveCount(1);
  expect(tasks).toHaveLength(1);
  await page.reload();
  await expect(
    panel.getByText("Préparer le chantier", { exact: true }),
  ).toBeVisible();
  await panel.getByRole("button", { name: "Modifier", exact: true }).click();
  await editor.getByLabel("Statut de la tâche").selectOption("in_progress");
  await editor.getByRole("button", { name: "Enregistrer la tâche" }).click();
  await expect(editor.getByRole("alert")).toContainText("La tâche a changé");
  await expect(editor.getByLabel("Statut de la tâche")).toHaveValue(
    "in_progress",
  );
  page.once("dialog", (dialog) => dialog.accept());
  await editor.getByRole("button", { name: "Recharger les tâches" }).click();
  await panel.getByRole("button", { name: "Modifier", exact: true }).click();
  await editor.getByLabel("Statut de la tâche").selectOption("in_progress");
  await editor.getByRole("button", { name: "Enregistrer la tâche" }).click();
  await expect(panel.locator("article .status")).toHaveText("En cours");
  await page
    .getByRole("link", {
      name: "Ouvrir le planning de l’entreprise",
      exact: true,
    })
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
  await expect(page.locator(".week-day")).toHaveCount(7);
  await expect(
    page.getByRole("heading", { name: "Aucune tâche cette semaine" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Voir les projets" }),
  ).toBeVisible();
  failSchedule = true;
  await page
    .getByRole("button", { name: "Semaine précédente", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Impossible de charger les tâches",
  );
  failSchedule = false;
  await page.getByRole("button", { name: "Réessayer", exact: true }).click();
  await expect(page.locator(".week-grid .task-row")).toHaveCount(3);
  const taskLink = page
    .getByRole("link", { name: "Préparer le chantier", exact: true })
    .first();
  await taskLink.focus();
  await expect(taskLink).toBeFocused();
  await taskLink.press("Enter");
  await expect(page).toHaveURL(/\?tab=tasks$/);
  await expect(
    panel.getByRole("button", { name: "Modifier", exact: true }),
  ).toBeVisible();
  await page.goBack();
  await page.getByRole("button", { name: "En retard", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Aucune tâche en retard" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sans date", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Aucune tâche sans date" }),
  ).toBeVisible();
  await page.goto(projectUrl);
  await panel.getByRole("button", { name: "Modifier", exact: true }).click();
  await editor.getByLabel("Date de début").fill("");
  await editor.getByLabel("Date limite").fill("2026-09-20");
  await editor.getByRole("button", { name: "Enregistrer la tâche" }).click();
  await expect(panel.getByText("En retard", { exact: true })).toBeVisible();
  await page
    .getByRole("link", {
      name: "Ouvrir le planning de l’entreprise",
      exact: true,
    })
    .last()
    .click();
  await page.getByRole("button", { name: "En retard", exact: true }).click();
  await expect(page.locator(".task-row")).toHaveCount(1);
  await page.goto(projectUrl);
  await panel.getByRole("button", { name: "Modifier", exact: true }).click();
  await editor.getByLabel("Date limite").fill("");
  await editor.getByRole("button", { name: "Enregistrer la tâche" }).click();
  await page
    .getByRole("link", {
      name: "Ouvrir le planning de l’entreprise",
      exact: true,
    })
    .last()
    .click();
  await page.getByRole("button", { name: "Sans date", exact: true }).click();
  await expect(page.locator(".task-row")).toHaveCount(1);
  await page.goto(projectUrl);
  await panel.getByRole("button", { name: "Modifier", exact: true }).click();
  await editor.getByLabel("Statut de la tâche").selectOption("done");
  await editor.getByRole("button", { name: "Enregistrer la tâche" }).click();
  await expect(panel.locator("article .status")).toHaveText("Terminée");
  await page
    .getByRole("link", {
      name: "Ouvrir le planning de l’entreprise",
      exact: true,
    })
    .last()
    .click();
  await page.getByRole("button", { name: "Sans date", exact: true }).click();
  await expect(page.locator(".task-row")).toHaveCount(0);
  await page.goto(projectUrl);
  await selectPersonalLanguage(page, "en");
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
      json:
        new URL(route.request().url()).searchParams.get("select") === "role"
          ? [{ role: "owner" }]
          : [
              {
                organization_id: org,
                role: "owner",
                organizations: {
                  id: org,
                  name: "First company",
                  country: "BE",
                },
              },
              {
                organization_id: second,
                role: "owner",
                organizations: {
                  id: second,
                  name: "Second company",
                  country: "FR",
                },
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

test("workspace navigation keeps its shell and cached company content", async ({
  page,
}) => {
  await mockApi(page);
  let membershipReads = 0;
  let organizationReads = 0;
  let projectReads = 0;
  await page.route("**/rest/v1/organization_memberships**", async (route) => {
    membershipReads++;
    await route.fallback();
  });
  await page.route("**/rest/v1/organizations**", async (route) => {
    if (route.request().method() === "GET") {
      organizationReads++;
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    await route.fallback();
  });
  await page.route("**/rest/v1/projects**", async (route) => {
    if (route.request().method() === "GET") projectReads++;
    await route.fallback();
  });
  await login(page, true);
  await page.getByLabel("Nom de l’entreprise").fill("Atelier stable");
  await page.getByRole("button", { name: "Créer mon entreprise" }).click();
  await expect(page.getByText("Aucun projet pour le moment.")).toBeVisible();
  await page
    .getByRole("textbox", { name: "Rechercher un projet ou un client…" })
    .fill("chantier futur");
  async function revealSidebar() {
    if (
      test.info().project.name === "mobile" &&
      !(await page.locator(".company-menu").isVisible())
    )
      await page.getByRole("button", { name: "Navigation" }).click();
  }
  await revealSidebar();
  await expect(page.locator(".company-menu > summary")).toContainText(
    "Atelier stable",
  );
  await page.locator(".app-shell").evaluate((node) => {
    node.setAttribute("data-navigation-test", "same-shell");
  });
  const initialMembershipReads = membershipReads;
  const initialProjectReads = projectReads;
  async function openSettings() {
    await revealSidebar();
    await page.locator(".company-menu > summary").click();
    await page.getByRole("link", { name: "Paramètres", exact: true }).click();
  }
  await openSettings();
  await expect(page.locator(".app-shell")).toHaveAttribute(
    "data-navigation-test",
    "same-shell",
  );
  await expect(page.getByLabel("Langue par défaut")).toHaveValue("fr");
  expect(organizationReads).toBe(1);
  await revealSidebar();
  await page
    .locator(`.sidebar nav a[href="/workspace?company=${org}"]`)
    .click();
  await expect(page.getByText("Aucun projet pour le moment.")).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Rechercher un projet ou un client…" }),
  ).toHaveValue("chantier futur");
  expect(projectReads).toBe(initialProjectReads);
  await openSettings();
  await expect(page.getByLabel("Langue par défaut")).toBeVisible();
  expect(organizationReads).toBe(1);
  expect(membershipReads).toBe(initialMembershipReads);
  await expect(page.locator(".app-shell")).toHaveAttribute(
    "data-navigation-test",
    "same-shell",
  );
});

test("company estimates search, pagination and saved draft links", async ({
  page,
}) => {
  await mockApi(page);
  const records = Array.from({ length: 22 }, (_, i) => ({
    id: `estimate-${i}`,
    project_id: "project-a",
    organization_id: org,
    lines: [],
    currency: "EUR",
    title: `Kitchen quote ${i}`,
    revision: 1,
    status: i === 21 ? "accepted" : "draft",
    total_cents: 123456,
    projects: { name: "Maison Test", client_name: "Client Dupont" },
  }));
  await page.route("**/rest/v1/estimates**", async (route) => {
    const url = new URL(route.request().url());
    expect(url.searchParams.get("organization_id")).toBe(`eq.${org}`);
    const recordId = url.searchParams.get("id")?.slice(3);
    if (recordId) {
      const record = records.find((row) => row.id === recordId);
      if (route.request().method() === "PATCH") {
        Object.assign(record ?? {}, route.request().postDataJSON());
        return route.fulfill({ json: [record] });
      }
      return route.fulfill({ json: record });
    }
    const search = url.searchParams.get("or");
    if (search) {
      expect(url.searchParams.get("match.or")).toContain("client_name.ilike");
      expect(search).toContain("match.not.is.null");
    }
    const status = url.searchParams.get("status")?.slice(3);
    const rows = search?.includes("absent")
      ? []
      : records.filter((row) => !status || row.status === status);
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
  await expect(page.locator("tbody tr")).toHaveCount(22);
  await expect(
    page.getByRole("link", { name: "Kitchen quote 0", exact: true }),
  ).toHaveAttribute(
    "href",
    `/workspace/${org}/projects/project-a/estimates/estimate-0`,
  );
  await page.getByRole("button", { name: "Acceptés", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.locator("tbody tr")).toContainText("Kitchen quote 21");
  await expect(page.locator(".estimate-register-footer")).toContainText(
    "Devis chargés: 1",
  );
  await page
    .getByRole("textbox", { name: "Rechercher un devis, projet ou client" })
    .fill("absent");
  await page.getByRole("button", { name: "Rechercher", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Aucun devis ne correspond" }),
  ).toBeVisible();
  await page
    .locator(".estimate-register-empty")
    .getByRole("button", { name: "Réinitialiser" })
    .click();
  await expect(
    page.getByRole("textbox", {
      name: "Rechercher un devis, projet ou client",
    }),
  ).toBeFocused();
  await expect(
    page.getByRole("button", { name: "Tous", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("textbox", { name: "Rechercher un devis, projet ou client" })
    .fill("Dupont");
  await page.getByRole("button", { name: "Rechercher", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(20);
  expect(
    await page
      .locator(".table-scroll")
      .evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
  await expect(
    page.locator("tbody tr").first().locator(".estimate-status"),
  ).toBeVisible();
  await expect(
    page.locator("tbody tr").first().locator(".estimate-amount"),
  ).toBeVisible();
  await selectPersonalLanguage(page, "en");
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
  await page
    .getByRole("link", { name: "Kitchen quote 0", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Estimate title" })
    .fill("Kitchen quote updated");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByText("Draft saved.", { exact: true })).toBeVisible();
  await page.goBack();
  await expect(
    page.getByRole("link", { name: "Kitchen quote updated", exact: true }),
  ).toBeVisible();
});

test("estimate register creates a draft with paginated project selection and retry recovery", async ({
  page,
}) => {
  await mockApi(page);
  const projects = Array.from({ length: 21 }, (_, i) => ({
    id: `project-${i}`,
    organization_id: org,
    name: `Maison ${i}`,
    client_name: `Client ${i}`,
    city: "Namur",
    address: "",
    status: "planning",
    revision: 1,
    created_at: "2026-10-18T12:00:00Z",
  }));
  let projectsFail = true;
  await page.route("**/rest/v1/projects**", async (route) => {
    const url = new URL(route.request().url());
    expect(url.searchParams.get("organization_id")).toBe(`eq.${org}`);
    if (projectsFail)
      return route.fulfill({ status: 400, json: { message: "Unavailable" } });
    const offset = Number(url.searchParams.get("offset") ?? 0);
    return route.fulfill({ json: projects.slice(offset, offset + 20) });
  });
  let saved: Record<string, unknown> | null = null;
  const requests: Record<string, unknown>[] = [];
  let releaseCreate: () => void = () => {};
  const createPending = new Promise<void>((resolve) => {
    releaseCreate = resolve;
  });
  await page.route("**/rest/v1/estimates**", async (route) => {
    const url = new URL(route.request().url());
    if (route.request().method() === "POST") {
      const body = route.request().postDataJSON();
      expect(body.organization_id).toBe(org);
      expect(body.project_id).toBe("project-20");
      requests.push(body);
      if (saved) return route.fulfill({ status: 409, json: { code: "23505" } });
      saved = {
        ...body,
        lines: [],
        total_cents: 0,
        revision: 1,
        status: "draft",
        currency: "EUR",
      };
      await createPending;
      return route.abort();
    }
    expect(url.searchParams.get("organization_id")).toBe(`eq.${org}`);
    if (url.searchParams.has("id")) {
      expect(url.searchParams.get("project_id")).toBe("eq.project-20");
      expect(url.searchParams.get("id")).toBe(`eq.${saved?.id}`);
      return route.fulfill({ json: saved });
    }
    return route.fulfill({ json: saved ? [saved] : [] });
  });
  await login(page);
  await page.getByLabel("Nom de l’entreprise").fill("Atelier Devis");
  await page.getByRole("button", { name: "Créer mon entreprise" }).click();
  await page.goto(`/workspace/${org}/estimates`);
  await expect(
    page.getByRole("heading", { name: "Aucun devis pour le moment" }),
  ).toBeVisible();
  const newButton = page.locator("#estimate-new");
  await newButton.click();
  const dialog = page.getByRole("dialog", { name: "Nouveau devis" });
  await expect(dialog.getByRole("alert")).toContainText(
    "Impossible de charger les projets",
  );
  projectsFail = false;
  await dialog.getByRole("button", { name: "Réessayer", exact: true }).click();
  await expect(
    dialog
      .getByRole("combobox", { name: "Projet", exact: true })
      .locator("option"),
  ).toHaveCount(21);
  await dialog.getByRole("button", { name: "Charger plus de projets" }).click();
  await expect(
    dialog
      .getByRole("combobox", { name: "Projet", exact: true })
      .locator("option"),
  ).toHaveCount(22);
  await dialog
    .getByRole("combobox", { name: "Projet", exact: true })
    .selectOption("project-20");
  await dialog.getByLabel("Titre du devis").fill("Aménagement du grenier");
  await dialog.getByRole("button", { name: "Créer le brouillon" }).click();
  await expect(dialog.getByRole("button", { name: "Annuler" })).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  releaseCreate();
  await expect(dialog.getByRole("alert")).toContainText(
    "Création non confirmée",
  );
  await expect(
    dialog.getByRole("combobox", { name: "Projet", exact: true }),
  ).toBeDisabled();
  await expect(dialog.getByLabel("Titre du devis")).toBeDisabled();
  await dialog.getByRole("button", { name: "Réessayer", exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/project-20\/estimates\//);
  await expect(
    page.getByRole("textbox", { name: "Titre du devis" }),
  ).toHaveValue("Aménagement du grenier");
  expect(requests).toHaveLength(2);
  expect(requests[1]).toEqual(requests[0]);
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
  await page.getByLabel("Nom du client", { exact: true }).fill("Client");
  await page.getByLabel("Ville", { exact: true }).fill("Bruxelles");
  await page
    .getByRole("button", { name: "Créer le projet", exact: true })
    .click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page
    .getByRole("button", { name: "Créer le projet", exact: true })
    .click();
  await page.getByRole("link", { name: "Cost site", exact: true }).click();
  await page
    .locator(".project-tabs")
    .getByRole("link", { name: "Budget et coûts", exact: true })
    .click();
  const panel = page.locator("#project-costs");
  const dialog = page.getByRole("dialog");
  await expect(panel.getByText("Non défini", { exact: true })).toBeVisible();
  await panel.getByRole("button", { name: "Définir le budget" }).click();
  await dialog.getByLabel("Budget de coûts", { exact: true }).fill("100.00");
  await dialog.getByRole("button", { name: "Enregistrer le budget" }).click();
  await expect(
    panel.locator(".metrics").getByText("100,00 €", { exact: true }),
  ).toHaveCount(2);
  await panel.getByRole("button", { name: "Ajouter un coût" }).click();
  await dialog.getByLabel("Description du coût").fill("Peinture");
  await dialog.getByLabel("Montant HT (€)").fill("120,29");
  await dialog.getByRole("button", { name: "Enregistrer le coût" }).click();
  await expect(dialog.getByRole("alert")).toContainText(
    "Enregistrement non confirmé",
  );
  await dialog.getByRole("button", { name: "Enregistrer le coût" }).click();
  await expect(panel.locator(".cost-row")).toHaveCount(1);
  expect(costs).toHaveLength(1);
  await expect(
    panel.locator(".metrics").getByText("20,29 €", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(panel.locator(".cost-row")).toHaveCount(1);
  await panel
    .getByRole("button", { name: "Modifier — Peinture", exact: true })
    .click();
  await dialog.getByLabel("Montant HT (€)").fill("90.29");
  await dialog.getByRole("button", { name: "Enregistrer le coût" }).click();
  await expect(dialog.getByRole("alert")).toContainText(
    "Les données ont changé",
  );
  await expect(dialog.getByLabel("Montant HT (€)")).toHaveValue("90.29");
  page.once("dialog", (d) => d.accept());
  await dialog.getByRole("button", { name: "Recharger les coûts" }).click();
  await expect(dialog.getByLabel("Montant HT (€)")).toHaveValue("120.29");
  await dialog.getByLabel("Montant HT (€)").fill("90.29");
  await dialog.getByRole("button", { name: "Enregistrer le coût" }).click();
  await expect(
    panel.locator(".metrics").getByText("9,71 €", { exact: true }),
  ).toBeVisible();
  await selectPersonalLanguage(page, "en");
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
  await english.getByLabel("More actions — Peinture").click();
  await english.getByRole("button", { name: "Void cost", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await expect(english.locator(".cost-row")).toHaveCount(1);
  await english.getByLabel("More actions — Peinture").click();
  await english.getByRole("button", { name: "Void cost", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Void cost", exact: true })
    .click();
  await expect(
    english.getByText("Voided cost · Excluded from totals", { exact: true }),
  ).toBeVisible();
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
  let releaseFirstCreate = () => {};
  const firstCreatePending = new Promise<void>((resolve) => {
    releaseFirstCreate = resolve;
  });
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
          await firstCreatePending;
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
  await page.getByRole("button", { name: "Entreprise", exact: true }).click();
  await page.getByRole("button", { name: "Ajouter un client" }).click();
  await expect(
    page.getByRole("dialog", { name: "Ajouter un client" }),
  ).toBeVisible();
  await expect(page.getByLabel("Nom du client", { exact: true })).toBeFocused();
  await page
    .getByLabel("Nom du client", { exact: true })
    .fill("Client exemple");
  await page.getByLabel("E-mail du client").fill("client@example.test");
  await page.getByRole("button", { name: "Enregistrer le client" }).click();
  await expect(
    page.getByLabel("Nom du client", { exact: true }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: "Ajouter un client" }),
  ).toBeVisible();
  releaseFirstCreate();
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
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Fermer", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Client exemple", exact: true }),
  ).toBeFocused();
  await expect(page.getByRole("table")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Tous les clients", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("link", { name: "client@example.test" }),
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
  await page.screenshot({
    path: `/private/tmp/renvo-client-table-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("link", { name: "Mon espace", exact: true }).click();
  await page.getByRole("button", { name: "Nouveau projet" }).click();
  await page
    .getByLabel("Nom du projet", { exact: true })
    .fill("Rénovation exemple");
  await page.getByLabel("Client existant").selectOption(String(clients[0].id));
  await expect(page.getByLabel("E-mail du client")).toHaveValue(
    "client@example.test",
  );
  await expect(
    page.getByRole("button", { name: "Enregistrer le client" }),
  ).toHaveCount(0);
  await expect(page.getByLabel("Rechercher un client")).toHaveCount(0);
  await page
    .getByLabel("Bien enregistré (facultatif)")
    .selectOption(String(properties[0].id));
  await expect(page.getByLabel("Nom du client", { exact: true })).toHaveValue(
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

test("owner invites with recovery, revokes and removes a teammate", async ({
  page,
  isMobile,
}) => {
  await mockApi(page);
  const teammate = "22222222-2222-4222-8222-222222222222";
  let members = [
    { user_id: id, email: user.email, role: "owner" },
    { user_id: teammate, email: "teammate@example.test", role: "member" },
  ];
  const invitations: Record<string, unknown>[] = [];
  let lost = false;
  await page.route("**/rest/v1/rpc/team_members", async (route) => {
    expect(route.request().postDataJSON().p_org).toBe(org);
    await route.fulfill({ json: members });
  });
  await page.route("**/rest/v1/team_invitations**", async (route) => {
    expect(
      new URL(route.request().url()).searchParams.get("organization_id"),
    ).toBe(`eq.${org}`);
    await route.fulfill({ json: invitations });
  });
  await page.route("**/rest/v1/rpc/team_invite", async (route) => {
    const body = route.request().postDataJSON();
    expect(body.p_org).toBe(org);
    if (!invitations.some((i) => i.id === body.p_id))
      invitations.push({
        id: body.p_id,
        email: body.p_email,
        role: "member",
        organization_id: org,
        created_at: "2026-09-20T12:00:00Z",
        expires_at: "2099-09-27T12:00:00Z",
        accepted_at: null,
        revoked_at: null,
      });
    if (!lost) {
      lost = true;
      await route.abort();
    } else await route.fulfill({ json: body.p_id });
  });
  await page.route("**/rest/v1/rpc/team_revoke", async (route) => {
    const body = route.request().postDataJSON();
    expect(body.p_org).toBe(org);
    const row = invitations.find((i) => i.id === body.p_id);
    if (!row) throw new Error("Invitation fixture missing");
    row.revoked_at = "2026-09-20T13:00:00Z";
    await route.fulfill({ json: null });
  });
  await page.route("**/rest/v1/rpc/team_remove", async (route) => {
    const body = route.request().postDataJSON();
    expect(body.p_org).toBe(org);
    expect(body.p_user).toBe(teammate);
    members = members.filter((m) => m.user_id !== teammate);
    await route.fulfill({ json: null });
  });
  await login(page);
  await page.getByLabel("Nom de l’entreprise").fill("Team company");
  await page.getByRole("button", { name: "Créer mon entreprise" }).click();
  await expect(
    page.getByRole("button", { name: "Nouveau projet" }),
  ).toBeVisible();
  if (isMobile)
    await page.getByRole("button", { name: "Navigation", exact: true }).click();
  await page.locator(".company-menu > summary").click();
  await page.getByRole("link", { name: "Équipe", exact: true }).click();
  await page.getByRole("button", { name: "Inviter un coéquipier" }).click();
  await expect(page.getByLabel("E-mail du coéquipier")).toBeFocused();
  await page.getByLabel("E-mail du coéquipier").fill("invited@example.test");
  await page.getByRole("button", { name: "Créer une invitation" }).click();
  await expect(page.getByRole("alert")).toContainText("Action non confirmée");
  await page.getByRole("button", { name: "Créer une invitation" }).click();
  expect(invitations).toHaveLength(1);
  await expect(
    page.getByRole("textbox", { name: "Lien d’invitation", exact: true }),
  ).toHaveValue(new RegExp(`/invite/${invitations[0].id}$`));
  await page.keyboard.press("Escape");
  await expect(page.locator("#team-invite")).toBeFocused();
  await page
    .getByRole("button", { name: "Lien d’invitation", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Révoquer", exact: true }).click();
  await page.locator(".team-history summary").click();
  await expect(page.getByText("Révoquée", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Retirer le membre", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Annuler", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Retirer le membre", exact: true }),
  ).toBeFocused();
  await expect(
    page.getByText("teammate@example.test", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Retirer le membre", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Retirer le membre", exact: true })
    .click();
  await expect(
    page.getByText("teammate@example.test", { exact: true }),
  ).toHaveCount(0);
  await selectPersonalLanguage(page, "en");
  await expect(
    page.getByRole("heading", { name: "Team", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.locator("main").focus();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `/private/tmp/renvo-team-${test.info().project.name}.png`,
    fullPage: true,
  });
});

test("invitation returns after login and requires explicit acceptance", async ({
  page,
}) => {
  await mockApi(page);
  const inviteId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
  let accepted = false;
  await page.route("**/rest/v1/rpc/team_invitation", async (route) => {
    const body = route.request().postDataJSON();
    expect(body.p_id).toBe(inviteId);
    if (body.p_accept) accepted = true;
    await route.fulfill({
      json: [
        {
          organization_id: org,
          company_name: "Inviting company",
          member_role: "member",
        },
      ],
    });
  });
  await page.route("**/rest/v1/organization_memberships**", async (route) => {
    await route.fulfill({
      json: accepted
        ? [
            {
              organization_id: org,
              role: "member",
              organizations: {
                id: org,
                name: "Inviting company",
                country: "BE",
              },
            },
          ]
        : [],
    });
  });
  await page.goto(`/invite/${inviteId}`);
  await page.getByRole("button", { name: "Tout refuser" }).click();
  await page.getByRole("link", { name: "Se connecter", exact: true }).click();
  await page.getByLabel("Adresse e-mail").fill("test@example.test");
  await page
    .getByLabel("Mot de passe", { exact: true })
    .fill("long-test-password");
  await page.getByRole("button", { name: "Se connecter", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Inviting company", exact: true }),
  ).toBeVisible();
  expect(accepted).toBe(false);
  await page
    .getByRole("button", { name: "Accepter l’invitation", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`/workspace\\?company=${org}$`));
  expect(accepted).toBe(true);
  await expect(
    page.getByRole("button", { name: "Nouveau projet" }),
  ).toHaveCount(0);
  await page.goto(`/workspace/${org}/estimates`);
  await expect(
    page.getByRole("heading", { name: "Accès réservé au propriétaire" }),
  ).toBeVisible();
  await page.route("**/rest/v1/rpc/team_invitation", (route) =>
    route.fulfill({
      status: 403,
      json: { code: "42501", message: "Invitation unavailable" },
    }),
  );
  await page.goto(`/invite/${inviteId}`);
  await expect(page.getByRole("alert")).toContainText(
    "Invitation indisponible",
  );
  await expect(
    page.getByRole("button", { name: "Accepter l’invitation", exact: true }),
  ).toHaveCount(0);
});

test("member edits only assigned tasks and sees no owner controls", async ({
  page,
  isMobile,
}) => {
  await mockApi(page);
  const projectId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
  const project = {
    id: projectId,
    organization_id: org,
    name: "Member site",
    client_name: "Client",
    city: "Namur",
    address: "12 rue Exemple",
    status: "active",
    revision: 1,
  };
  const tasks = [
    {
      id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      organization_id: org,
      project_id: projectId,
      title: "My task",
      notes: "",
      status: "todo",
      start_date: null,
      due_date: null,
      revision: 1,
      assignee_id: id,
      projects: { name: project.name },
    },
    {
      id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      organization_id: org,
      project_id: projectId,
      title: "Other task",
      notes: "",
      status: "todo",
      start_date: null,
      due_date: null,
      revision: 1,
      assignee_id: null,
      projects: { name: project.name },
    },
  ];
  await page.route("**/rest/v1/organization_memberships**", (route) =>
    route.fulfill({
      json: [
        {
          organization_id: org,
          role: "member",
          organizations: { id: org, name: "Member company", country: "BE" },
        },
      ],
    }),
  );
  await page.route("**/rest/v1/rpc/team_members", (route) =>
    route.fulfill({
      json: [{ user_id: id, email: user.email, role: "member" }],
    }),
  );
  await page.route("**/rest/v1/projects**", (route) =>
    route.fulfill({ json: [project] }),
  );
  await page.route("**/rest/v1/project_files**", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route("**/rest/v1/organizations**", (route) =>
    route.fulfill({
      json: [{ id: org, name: "Member company", country: "BE" }],
    }),
  );
  let edits = 0;
  await page.route("**/rest/v1/project_tasks**", async (route) => {
    const url = new URL(route.request().url());
    expect(url.searchParams.get("organization_id")).toBe(`eq.${org}`);
    if (route.request().method() === "PATCH") {
      expect(url.searchParams.get("id")).toBe(`eq.${tasks[0].id}`);
      expect(url.searchParams.get("revision")).toBe("eq.1");
      expect(route.request().postDataJSON().assignee_id).toBe(id);
      Object.assign(tasks[0], route.request().postDataJSON());
      edits++;
      await route.fulfill({ json: [tasks[0]] });
    } else
      await route.fulfill({
        json: url.searchParams.has("assignee_id") ? [tasks[0]] : tasks,
      });
  });
  await login(page, true);
  await expect(page).toHaveURL(/\/workspace/);
  await page.goto("/workspace/account");
  await expect(
    page.getByRole("heading", { name: "Paramètres du compte" }),
  ).toBeVisible();
  await page.goto(`/workspace?company=${org}`);
  await expect(
    page.getByRole("link", { name: "Member site", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Nouveau projet" }),
  ).toHaveCount(0);
  if (isMobile)
    await page.getByRole("button", { name: "Navigation", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Clients", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Devis", exact: true }),
  ).toHaveCount(0);
  if (isMobile) await page.keyboard.press("Escape");
  await page.getByRole("link", { name: "Member site", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Enregistrer une note vocale" }),
  ).toHaveCount(0);
  await page
    .locator(".project-tabs")
    .getByRole("link", { name: "Documents", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Transcrire avec l’IA" }),
  ).toHaveCount(0);
  await page
    .locator(".project-tabs")
    .getByRole("link", { name: "Tâches", exact: true })
    .click();
  const panel = page.getByRole("region", { name: "Tâches du projet" });
  await expect(panel.locator("article")).toHaveCount(2);
  await expect(
    panel.getByRole("button", { name: "Nouvelle tâche" }),
  ).toHaveCount(0);
  await expect(
    panel.getByRole("button", { name: "Modifier", exact: true }),
  ).toHaveCount(1);
  await expect(
    panel.getByRole("button", { name: "Supprimer", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Budget et coûts" }),
  ).toHaveCount(0);
  await expect(page.locator("#project-estimates")).toHaveCount(0);
  await expect(page.locator("#project-file-input")).toHaveCount(0);
  await panel.getByRole("button", { name: "Modifier", exact: true }).click();
  const editor = page.getByRole("dialog");
  await expect(editor.getByLabel("Responsable", { exact: true })).toHaveCount(
    0,
  );
  await editor.getByLabel("Statut de la tâche").selectOption("in_progress");
  await editor.getByRole("button", { name: "Enregistrer la tâche" }).click();
  await expect(panel.locator("article").first().locator(".status")).toHaveText(
    "En cours",
  );
  expect(edits).toBe(1);
  await page
    .getByRole("link", {
      name: "Ouvrir le planning de l’entreprise",
      exact: true,
    })
    .last()
    .click();
  await page.getByRole("button", { name: "Sans date", exact: true }).click();
  await expect(page.locator(".task-row")).toHaveCount(2);
  const filtered = page.waitForRequest(
    (r) =>
      r.url().includes("/project_tasks?") &&
      new URL(r.url()).searchParams.get("assignee_id") === `eq.${id}`,
  );
  await page.getByLabel("Mes tâches uniquement").check();
  await filtered;
  await expect(
    page.locator(".task-row").filter({ hasText: "My task" }),
  ).toHaveCount(1);
  await expect(
    page.locator(".task-row").filter({ hasText: "Other task" }),
  ).toHaveCount(0);
  await page.goto(`/workspace/${org}/clients`);
  await expect(
    page.getByRole("heading", { name: "Accès réservé au propriétaire" }),
  ).toBeVisible();
});

async function mockVoiceNoteProject(page: Page) {
  await mockApi(page);
  const projectId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
  const fileId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
  const project = {
    id: projectId,
    organization_id: org,
    name: "Kitchen site",
    client_name: "Client",
    city: "Namur",
    address: null,
    status: "active",
    revision: 1,
  };
  const savedTasks: Record<string, unknown>[] = [];
  await page.route("**/rest/v1/organization_memberships**", (route) =>
    route.fulfill({
      json: [
        {
          organization_id: org,
          role: "owner",
          organizations: { id: org, name: "Test company", country: "BE" },
        },
      ],
    }),
  );
  await page.route("**/rest/v1/projects**", (route) =>
    route.fulfill({ json: [project] }),
  );
  await page.route("**/rest/v1/project_files**", (route) =>
    route.fulfill({
      json: [
        {
          id: fileId,
          organization_id: org,
          project_id: projectId,
          original_name: "site-note.webm",
          mime_type: "audio/webm",
          size_bytes: 2048,
          state: "ready",
          object_key: `${org}/${projectId}/${fileId}`,
          created_at: "2026-09-26T12:00:00Z",
        },
      ],
    }),
  );
  await page.route("**/rest/v1/project_tasks**", async (route) => {
    if (route.request().method() === "POST") {
      const body = route.request().postDataJSON();
      expect(body.organization_id).toBe(org);
      expect(body.project_id).toBe(projectId);
      savedTasks.push({
        ...body,
        revision: 1,
        projects: { name: project.name },
      });
      await route.fulfill({ json: savedTasks.at(-1) });
    } else await route.fulfill({ json: savedTasks });
  });
  const teammate = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
  await page.route("**/rest/v1/rpc/team_members", (route) =>
    route.fulfill({
      json: [{ user_id: teammate, email: "marc@example.test", role: "member" }],
    }),
  );
  return { projectId, savedTasks, teammate };
}

test("owner reviews an AI voice-note proposal before creating a task", async ({
  page,
}) => {
  const { projectId, savedTasks, teammate } = await mockVoiceNoteProject(page);
  const analysisId = "ffffffff-ffff-4fff-8fff-ffffffffffff";
  let analyzed = 0;
  let polls = 0;
  await page.route("**/api/v1/organizations/*/ai-status", (route) =>
    route.fulfill({ json: { configured: true, enabled: true, remaining: 7 } }),
  );
  await page.route("**/api/v1/**/ai-analysis", (route) => {
    analyzed++;
    expect(route.request().headers().authorization).toMatch(/^Bearer /);
    const body = route.request().postDataJSON();
    expect(body.today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(body.requestId).toMatch(/^[0-9a-f-]{36}$/);
    return route.fulfill({
      status: 202,
      json: { analysisId, status: "queued" },
    });
  });
  await page.route(`**/api/v1/**/ai-analyses/${analysisId}`, (route) => {
    polls++;
    return route.fulfill({
      json:
        polls === 1
          ? { id: analysisId, status: "transcribing" }
          : {
              id: analysisId,
              status: "ready",
              result: {
                transcript: "Vérifier la fenêtre de la cuisine.",
                summary: "Une fenêtre doit être vérifiée.",
                omittedTaskCount: 1,
                proposalStatus: "ready",
                tasks: [
                  {
                    title: "Vérifier la fenêtre",
                    notes: "Cuisine",
                    evidence: "Vérifier la fenêtre de la cuisine",
                    assigneeId: teammate,
                    startDate: null,
                    dueDate: "2026-10-02",
                  },
                ],
              },
            },
    });
  });
  await login(page, true);
  await expect(page).toHaveURL(/\/workspace/);
  await page.goto(`/workspace/${org}/projects/${projectId}?tab=documents`);
  await expect(
    page.getByText("Analyses restantes aujourd’hui : 7"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Transcrire avec l’IA" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Transcrire avec l’IA" })
    .click();
  await expect(page.getByText("Transcription en cours…")).toBeVisible();
  const dialog = page.getByRole("dialog", { name: "Analyser la note vocale" });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByText("Vérifier la fenêtre de la cuisine."),
  ).toBeVisible();
  await expect(
    dialog.getByText(/Certaines suggestions n’ont pas été affichées/),
  ).toBeVisible();
  expect(analyzed).toBe(1);
  expect(savedTasks).toHaveLength(0);
  await expect(dialog.getByLabel("Responsable")).toHaveValue(teammate);
  await expect(dialog.getByLabel("Date de début")).toHaveValue("");
  await expect(dialog.getByLabel("Date limite")).toHaveValue("2026-10-02");
  await dialog.getByLabel("Date de début").fill("2026-10-01");
  let warning = "";
  page.once("dialog", (prompt) => {
    warning = prompt.message();
    void prompt.dismiss();
  });
  await page.keyboard.press("Escape");
  await expect.poll(() => warning).toMatch(/pas été créées/);
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Date de début")).toHaveValue("2026-10-01");
  await dialog
    .getByLabel("Titre de la tâche")
    .fill("Contrôler la fenêtre de la cuisine");
  await dialog.getByRole("button", { name: "Créer cette tâche" }).click();
  await expect(dialog.getByText("Tâche créée")).toBeVisible();
  expect(savedTasks).toHaveLength(1);
  expect(savedTasks[0].title).toBe("Contrôler la fenêtre de la cuisine");
  expect(savedTasks[0]).toMatchObject({
    assignee_id: teammate,
    start_date: "2026-10-01",
    due_date: "2026-10-02",
    status: "todo",
  });
  await expect(dialog.getByLabel("Responsable")).toBeDisabled();
  await dialog.getByRole("button", { name: "Fermer" }).last().click();
  await page
    .locator(".project-tabs")
    .getByRole("link", { name: "Tâches" })
    .click();
  await expect(
    page.getByText("Contrôler la fenêtre de la cuisine"),
  ).toBeVisible();
});

test("AI analysis retries keep the request ID and explain limits", async ({
  page,
}) => {
  const { projectId } = await mockVoiceNoteProject(page);
  const requestIds: string[] = [];
  const replies = [
    {
      status: 503,
      json: { error: "service_unavailable", reason: "data_upstream" },
    },
    { status: 429, json: { error: "limit_reached", limit: "company_daily" } },
    { status: 429, json: { error: "limit_reached", limit: "user_running" } },
  ];
  let enabled = true;
  await page.route("**/api/v1/organizations/*/ai-status", (route) =>
    route.fulfill({ json: { configured: true, enabled, remaining: 0 } }),
  );
  await page.route("**/api/v1/**/ai-analysis", (route) => {
    requestIds.push(route.request().postDataJSON().requestId);
    return route.fulfill(replies[requestIds.length - 1]);
  });
  await login(page, true);
  await expect(page).toHaveURL(/\/workspace/);
  await page.goto(`/workspace/${org}/projects/${projectId}?tab=documents`);
  const analyze = page.getByRole("button", { name: "Transcrire avec l’IA" });
  await analyze.click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Transcrire avec l’IA" })
    .click();
  await expect(page.getByText(/la même demande sera reprise/)).toBeVisible();
  await analyze.click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Transcrire avec l’IA" })
    .click();
  await expect(page.getByText(/limite quotidienne/)).toBeVisible();
  // An unknown outcome reuses the request ID; a refusal starts a new one.
  expect(requestIds[1]).toBe(requestIds[0]);
  await analyze.click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Transcrire avec l’IA" })
    .click();
  await expect(
    page.getByText(/Une autre analyse est déjà en cours/),
  ).toBeVisible();
  expect(requestIds[2]).not.toBe(requestIds[1]);
  enabled = false;
  await page.reload();
  // Disabled companies see no AI action or notice at all.
  await expect(page.getByText("site-note.webm")).toBeVisible();
  await expect(analyze).toHaveCount(0);
  await expect(page.getByText(/Analyses restantes/)).toHaveCount(0);
  await expect(page.getByText(/pas activée/)).toHaveCount(0);
});

test("project overview navigation, retained drafts, isolated failures and legacy links", async ({
  page,
}) => {
  await mockApi(page);
  await page.route("**/rest/v1/project_sketches**", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route("**/rest/v1/project_tasks**", (route) =>
    route.fulfill({
      json: new URL(route.request().url()).searchParams.has("limit")
        ? [
            {
              id: "preview-task",
              title: "Confirmer les matériaux de finition",
              due_date: "2026-09-23",
              status: "todo",
              assignee_id: null,
            },
          ]
        : [],
    }),
  );
  let failCosts = false;
  await page.route("**/rest/v1/rpc/project_cost_summary", (route) =>
    route.fulfill(
      failCosts
        ? { status: 500, json: { message: "fixture unavailable" } }
        : {
            json: [
              {
                budget_cents: 1845000,
                budget_revision: 1,
                total: "674350",
                materials: "492000",
                labor: "182350",
                subcontractors: "0",
                other: "0",
              },
            ],
          },
    ),
  );
  await login(page, true);
  await page.getByLabel("Nom de l’entreprise").fill("Atelier du Parc");
  await page.getByRole("button", { name: "Créer mon entreprise" }).click();
  await page.getByRole("button", { name: "Nouveau projet" }).click();
  await page
    .getByLabel("Nom du projet", { exact: true })
    .fill("Rénovation de la maison du Parc");
  await page
    .getByLabel("Nom du client", { exact: true })
    .fill("Camille Laurent");
  await page.getByLabel("Ville", { exact: true }).fill("Bruxelles");
  await page
    .getByRole("button", { name: "Créer le projet", exact: true })
    .click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page
    .getByRole("button", { name: "Créer le projet", exact: true })
    .click();
  await page
    .getByRole("link", { name: "Rénovation de la maison du Parc", exact: true })
    .click();
  const base = page.url(),
    nav = page.locator(".project-tabs");
  await expect(nav).toBeVisible();
  await expect(
    nav.getByRole("link", { name: "Vue d’ensemble" }),
  ).toHaveAttribute("aria-current", "page");
  await expect(page.locator(".metrics")).toContainText("18");
  const bounds = await nav.boundingBox();
  expect(bounds).not.toBeNull();
  expect((bounds?.y ?? 9999) + (bounds?.height ?? 0)).toBeLessThan(
    page.viewportSize()?.height ?? 0,
  );
  await expect(page.getByLabel("Nom du projet", { exact: true })).toHaveCount(
    0,
  );
  await expect(
    page.getByText("Confirmer les matériaux de finition", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Aucun croquis. Dessinez votre première idée depuis Documents.",
      { exact: true },
    ),
  ).toBeVisible();
  // Overlay-scrollbar browsers also verify the reserved-gutter policy.
  expect(
    await page.evaluate(
      () => getComputedStyle(document.documentElement).scrollbarGutter,
    ),
  ).toBe("stable");
  // Compare tab boundaries with forced and content-dependent vertical scrolling.
  await page.addStyleTag({
    content: "html::-webkit-scrollbar { width: 16px; }",
  });
  await page.evaluate(() => {
    document.documentElement.style.overflowY = "scroll";
  });
  const boundaries = async () =>
    page
      .locator(".project-header, .project-tabs, .project-panel")
      .evaluateAll((elements) =>
        elements.map((element) => {
          const { x, width } = element.getBoundingClientRect();
          return { x, width };
        }),
      );
  const expectedBoundaries = await boundaries();
  await page.evaluate(() => {
    document.documentElement.style.overflowY = "auto";
  });
  for (const tab of [
    "Vue d’ensemble",
    "Tâches",
    "Budget et coûts",
    "Devis",
    "Documents",
  ]) {
    await nav.getByRole("link", { name: tab, exact: true }).click();
    await expect(
      nav.getByRole("link", { name: tab, exact: true }),
    ).toHaveAttribute("aria-current", "page");
    await expect.poll(boundaries).toEqual(expectedBoundaries);
  }
  await nav.getByRole("link", { name: "Vue d’ensemble" }).click();
  await page.screenshot({
    path: `/private/tmp/project-overview-new-${test.info().project.name}.png`,
    fullPage: true,
  });
  await nav.getByRole("link", { name: "Tâches", exact: true }).click();
  await page
    .getByRole("button", { name: "Nouvelle tâche", exact: true })
    .click();
  const taskDialog = page.getByRole("dialog", {
    name: "Nouvelle tâche",
    exact: true,
  });
  await taskDialog
    .getByLabel("Nom de la tâche")
    .fill("Préparer les protections");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.keyboard.press("Escape");
  await expect(taskDialog.getByLabel("Nom de la tâche")).toHaveValue(
    "Préparer les protections",
  );
  page.once("dialog", (dialog) => dialog.accept());
  await taskDialog
    .getByRole("button", { name: "Annuler", exact: true })
    .click();
  await expect(taskDialog).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Nouvelle tâche", exact: true }),
  ).toBeFocused();
  await nav.getByRole("link", { name: "Documents", exact: true }).click();
  await expect(page.locator("#project-sketches input")).not.toBeVisible();
  await page
    .locator("#project-sketches")
    .getByRole("button", { name: "Nouveau croquis" })
    .click();
  await page.getByLabel("Nom du croquis").fill("Cuisine – implantation");
  page.once("dialog", (d) => d.dismiss());
  await page.keyboard.press("Escape");
  await expect(page.getByLabel("Nom du croquis")).toHaveValue(
    "Cuisine – implantation",
  );
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Annuler", exact: true })
    .first()
    .click();
  await page.goto(`${base}#project-tasks`);
  await expect(
    page.getByRole("region", { name: "Tâches du projet" }),
  ).toBeVisible();
  await page.goto(`${base}#site-details`);
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByLabel("Nom du projet", { exact: true })
    .fill("Modification non enregistrée");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Fermer", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Fermer", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".project-header button")).toBeFocused();
  failCosts = true;
  await page.goto(base);
  await expect(page.getByRole("alert")).toContainText(
    "Impossible de charger les coûts",
  );
  await expect(page.locator(".project-header")).toContainText(
    "Camille Laurent",
  );
  await expect(nav).toBeVisible();
  await selectPersonalLanguage(page, "en");
  await expect(
    nav.getByRole("link", { name: "Overview", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("team lists recover independently and preserve invitation pagination", async ({
  page,
}) => {
  await mockApi(page);
  const rows = Array.from({ length: 21 }, (_, i) => ({
    id: `invitation-${i}`,
    organization_id: org,
    email: `invite-${i}@example.test`,
    role: "member",
    created_at: "2026-01-01T00:00:00Z",
    expires_at: i === 20 ? "2099-01-08T00:00:00Z" : "2026-01-08T00:00:00Z",
    accepted_at: null,
    revoked_at: null,
  }));
  let fail = true;
  await page.route("**/rest/v1/rpc/team_members", (route) =>
    route.fulfill({
      json: [{ user_id: id, email: user.email, role: "owner" }],
    }),
  );
  await page.route("**/rest/v1/team_invitations**", (route) => {
    const params = new URL(route.request().url()).searchParams;
    expect(params.get("organization_id")).toBe(`eq.${org}`);
    if (fail)
      return route.fulfill({ status: 400, json: { message: "Unavailable" } });
    const offset = Number(params.get("offset") ?? 0);
    return route.fulfill({ json: rows.slice(offset, offset + 20) });
  });
  await login(page);
  await page.getByLabel("Nom de l’entreprise").fill("Atelier des Pins");
  await page.getByRole("button", { name: "Créer mon entreprise" }).click();
  await page.goto(`/workspace/${org}/team`);
  const members = page.getByRole("region", { name: "Membres", exact: true });
  const invitations = page.getByRole("region", {
    name: "Invitations",
    exact: true,
  });
  await expect(members.getByText(user.email, { exact: true })).toBeVisible();
  await expect(invitations.getByRole("alert")).toBeVisible();
  fail = false;
  await invitations.getByRole("button", { name: "Réessayer" }).click();
  await expect(invitations.getByText("Chargés: 20")).toBeVisible();
  await expect(
    invitations.getByText(
      "Aucune invitation en attente parmi les invitations chargées.",
    ),
  ).toBeVisible();
  await invitations.locator("summary").click();
  await expect(invitations.getByText(/Expirée le:/).first()).toBeVisible();
  fail = true;
  await invitations.getByRole("button", { name: "Charger plus" }).click();
  await expect(invitations.getByRole("alert")).toBeVisible();
  await expect(
    invitations.getByText("invite-0@example.test", { exact: true }),
  ).toBeVisible();
  fail = false;
  await invitations.getByRole("button", { name: "Réessayer" }).click();
  await expect(invitations.getByText("Chargés: 21")).toBeVisible();
  await expect(
    invitations.getByText("invite-20@example.test", { exact: true }),
  ).toBeVisible();
});

async function openAccountForUxTest(page: Page) {
  await mockApi(page);
  await page.goto("/login");
  await page.getByRole("button", { name: "Tout refuser", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Adresse e-mail", exact: true })
    .fill(user.email);
  await page.getByLabel("Mot de passe", { exact: true }).fill("test-password");
  await page.getByRole("button", { name: "Se connecter", exact: true }).click();
  await expect(page).toHaveURL(/\/workspace/);
  await page.goto("/workspace/account");
  await expect(
    page.getByRole("heading", { name: "Paramètres du compte", exact: true }),
  ).toBeVisible();
}

test("account profile retries, cancels and keeps password edits through language changes", async ({
  page,
}) => {
  await openAccountForUxTest(page);
  let profileSaves = 0;
  await page.route("**/auth/v1/user", async (route) => {
    if (route.request().method() !== "PUT") {
      await route.fulfill({ json: user });
      return;
    }
    const body = route.request().postDataJSON();
    expect(body).not.toHaveProperty("password");
    expect(body.data.full_name).toBe("Camille Laurent");
    expect(body.data.preferred_language).toBe("en");
    profileSaves++;
    if (profileSaves === 1) {
      await route.fulfill({
        status: 429,
        json: { code: "over_request_rate_limit", msg: "Try later" },
      });
      return;
    }
    await route.fulfill({
      json: { user: { ...user, user_metadata: body.data } },
    });
  });
  const profile = page.getByRole("region", { name: "Profil", exact: true });
  await expect(profile.getByText(user.email, { exact: true })).toBeVisible();
  await expect(profile.getByRole("textbox")).toHaveCount(1);
  await expect(
    profile.getByRole("button", { name: "Enregistrer le profil" }),
  ).toBeDisabled();
  await page.getByLabel("Nom complet", { exact: true }).fill("   ");
  await profile.getByRole("button", { name: "Enregistrer le profil" }).click();
  await expect(page.getByLabel("Nom complet", { exact: true })).toBeFocused();
  await expect(page.getByLabel("Nom complet", { exact: true })).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  expect(profileSaves).toBe(0);
  await profile.getByRole("button", { name: "Annuler", exact: true }).click();
  await expect(page.getByLabel("Nom complet", { exact: true })).toHaveValue("");
  await page
    .getByRole("button", { name: "Changer le mot de passe", exact: true })
    .click();
  await expect(
    page.getByLabel("Mot de passe actuel", { exact: true }),
  ).toBeFocused();
  await page
    .getByLabel("Mot de passe actuel", { exact: true })
    .fill("synthetic-current-123");
  await page
    .getByRole("button", {
      name: "Afficher — Mot de passe actuel",
      exact: true,
    })
    .click();
  await expect(
    page.getByLabel("Mot de passe actuel", { exact: true }),
  ).toHaveAttribute("type", "text");
  await page.getByLabel("Nom complet", { exact: true }).fill("Camille Laurent");
  await page.getByLabel("Langue préférée", { exact: true }).selectOption("en");
  await profile.getByRole("button", { name: "Enregistrer le profil" }).click();
  await expect(profile.getByRole("alert")).toContainText("Trop de tentatives");
  await expect(page.getByLabel("Nom complet", { exact: true })).toHaveValue(
    "Camille Laurent",
  );
  await profile.getByRole("button", { name: "Enregistrer le profil" }).click();
  const englishProfile = page.getByRole("region", {
    name: "Profile",
    exact: true,
  });
  await expect(englishProfile.getByRole("status")).toHaveText("Profile saved.");
  await expect(
    page.getByLabel("Current password", { exact: true }),
  ).toHaveValue("synthetic-current-123");
  await page.getByLabel("Full name", { exact: true }).fill("Unsaved profile");
  await expect(englishProfile.getByRole("status")).toHaveText(
    "Unsaved changes",
  );
  await page
    .getByRole("region", { name: "Password", exact: true })
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Change password", exact: true }),
  ).toBeFocused();
  await expect(page.getByLabel("Full name", { exact: true })).toHaveValue(
    "Unsaved profile",
  );
  await page
    .getByRole("button", { name: "Change password", exact: true })
    .click();
  await expect(
    page.getByLabel("Current password", { exact: true }),
  ).toHaveValue("");
  await expect(
    page.getByLabel("Current password", { exact: true }),
  ).toHaveAttribute("type", "password");
  await englishProfile
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await expect(page.getByLabel("Full name", { exact: true })).toHaveValue(
    "Camille Laurent",
  );
  await expect(page.getByLabel("Full name", { exact: true })).toBeFocused();
  expect(profileSaves).toBe(2);
});

test("account password errors focus fields and recovery warns once before discarding both drafts", async ({
  page,
}) => {
  await openAccountForUxTest(page);
  let passwordRequests = 0;
  const responses = [
    "invalid_credentials",
    "same_password",
    "reauthentication_needed",
  ];
  await page.route("**/auth/v1/user", async (route) => {
    if (route.request().method() !== "PUT") {
      await route.fulfill({ json: user });
      return;
    }
    const body = route.request().postDataJSON();
    expect(body.current_password).toBe("synthetic-current-123");
    expect(body.password).toBe("synthetic-new-1234");
    expect(body).not.toHaveProperty("data");
    const code = responses[passwordRequests++];
    await route.fulfill({
      status: 400,
      headers: {
        "x-supabase-api-version": "2024-01-01",
        "access-control-expose-headers": "x-supabase-api-version",
      },
      json: { code, msg: "Synthetic error" },
    });
  });
  await page
    .getByRole("button", { name: "Changer le mot de passe", exact: true })
    .click();
  const password = page.getByRole("region", {
    name: "Mot de passe",
    exact: true,
  });
  await expect(
    password.getByRole("link", { name: "Mot de passe oublié ?", exact: true }),
  ).toBeVisible();
  const submit = password.getByRole("button", {
    name: "Changer le mot de passe",
    exact: true,
  });
  await submit.click();
  await expect(
    page.getByLabel("Mot de passe actuel", { exact: true }),
  ).toBeFocused();
  await page
    .getByLabel("Mot de passe actuel", { exact: true })
    .fill("synthetic-current-123");
  await page.getByLabel("Nouveau mot de passe", { exact: true }).fill("short");
  await submit.click();
  await expect(
    page.getByLabel("Nouveau mot de passe", { exact: true }),
  ).toBeFocused();
  await page
    .getByLabel("Nouveau mot de passe", { exact: true })
    .fill("synthetic-new-1234");
  await page
    .getByLabel("Confirmer le nouveau mot de passe", { exact: true })
    .fill("does-not-match-123");
  await submit.click();
  await expect(
    page.getByLabel("Confirmer le nouveau mot de passe", { exact: true }),
  ).toBeFocused();
  await expect(
    page.getByLabel("Confirmer le nouveau mot de passe", { exact: true }),
  ).toHaveAttribute("aria-describedby", "account-confirm-password-error");
  expect(passwordRequests).toBe(0);
  await page
    .getByLabel("Confirmer le nouveau mot de passe", { exact: true })
    .fill("synthetic-new-1234");
  await submit.click();
  await expect(password.getByRole("alert")).toHaveText(
    "Le mot de passe actuel est incorrect.",
  );
  await expect(
    page.getByLabel("Mot de passe actuel", { exact: true }),
  ).toBeFocused();
  await submit.click();
  await expect(password.getByRole("alert")).toContainText(
    "doit être différent",
  );
  await expect(
    page.getByLabel("Nouveau mot de passe", { exact: true }),
  ).toBeFocused();
  await submit.click();
  await expect(password.getByRole("alert")).toContainText(
    "Une nouvelle vérification",
  );
  await expect(password.getByRole("alert")).toBeFocused();
  await page.getByLabel("Nom complet", { exact: true }).fill("Unrecorded name");
  let dialogs = 0;
  page.on("dialog", async (dialog) => {
    dialogs++;
    await dialog.dismiss();
  });
  await password
    .getByRole("link", { name: "Mot de passe oublié ?", exact: true })
    .click();
  await expect(page).toHaveURL(/\/workspace\/account$/);
  expect(dialogs).toBe(1);
  await page.evaluate(() => location.reload());
  await expect.poll(() => dialogs).toBe(2);
  await expect(
    page.getByLabel("Nouveau mot de passe", { exact: true }),
  ).toHaveValue("synthetic-new-1234");
  page.removeAllListeners("dialog");
  page.once("dialog", (dialog) => dialog.accept());
  await password
    .getByRole("link", { name: "Mot de passe oublié ?", exact: true })
    .click();
  await expect(page).toHaveURL(/\/auth\/forgot$/);
  expect(passwordRequests).toBe(3);
});
