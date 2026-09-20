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
  let requests = 0;
  const projects: Record<string, unknown>[] = [];
  let loseResponse = true;
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
              created_at: "2026-09-20T00:00:00Z",
            });
            if (loseResponse) {
              loseResponse = false;
              await route.abort();
            } else await route.fulfill({ json: projects.at(-1) });
          }
        } else {
          expect(url.searchParams.get("organization_id")).toBe(`eq.${org}`);
          await route.fulfill({
            json: url.searchParams.has("id") ? projects[0] : projects,
          });
        }
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
