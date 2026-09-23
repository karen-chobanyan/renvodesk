import { expect, type Page, test } from "@playwright/test";

const org = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  project = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  uid = "11111111-1111-4111-8111-111111111111";
const base = `/workspace/${org}/projects/${project}`;
async function fixture(page: Page, owner = true, locale = "en") {
  const user = {
    id: uid,
    aud: "authenticated",
    role: "authenticated",
    email: "journal@example.test",
    email_confirmed_at: "2026-01-01T00:00:00Z",
    app_metadata: { provider: "email" },
    user_metadata: {},
    created_at: "2026-01-01T00:00:00Z",
  };
  const encode = (v: unknown) =>
    Buffer.from(JSON.stringify(v)).toString("base64url");
  const token = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: uid, role: "authenticated", exp: 4102444800 })}.test`;
  await page.addInitScript(
    ({ user, token, locale }) => {
      localStorage.setItem("renvodesk-locale", locale);
      localStorage.setItem(
        "renvodesk-privacy-v1",
        JSON.stringify({
          version: 1,
          analytics: false,
          diagnostics: false,
          savedAt: Date.now(),
        }),
      );
      localStorage.setItem(
        "sb-oripsywzngftarbprlgk-auth-token",
        JSON.stringify({
          access_token: token,
          refresh_token: "fixture",
          expires_at: 4102444800,
          expires_in: 3600,
          token_type: "bearer",
          user,
        }),
      );
    },
    { user, token, locale },
  );
  const state = {
    fail: false,
    failOlder: false,
    reads: 0,
    financialReads: 0,
    empty: false,
    updated: false,
  };
  let revision = 1;
  const events = Array.from({ length: 24 }, (_, i) => ({
    organization_id: org,
    project_id: project,
    id: `cccccccc-cccc-4ccc-8ccc-${String(100 - i).padStart(12, "0")}`,
    actor_user_id: i % 2 ? "22222222-2222-4222-8222-222222222222" : uid,
    occurred_at: "2026-09-22T09:30:00.123456+00:00",
    event_type:
      i === 0
        ? "task.updated"
        : i === 1
          ? "estimate.accepted"
          : i === 2
            ? "cost.created"
            : i === 3
              ? "file.deleted"
              : "task.created",
    category:
      i === 1
        ? "estimates"
        : i === 2
          ? "costs"
          : i === 3
            ? "documents"
            : "tasks",
    visibility: i === 1 || i === 2 ? "owner" : "member",
    entity_type:
      i === 1 ? "estimate" : i === 2 ? "cost" : i === 3 ? "file" : "task",
    entity_id: project,
    source_key: `fixture:${i}`,
    payload_version: 1,
    payload: {
      label:
        i === 0
          ? "Préparation des murs et vérification des finitions de la salle de bains"
          : i === 1
            ? "Private estimate"
            : i === 2
              ? "Materials"
              : i === 3
                ? "Removed.pdf"
                : `Task ${i}`,
      ...(i === 0
        ? { from_status: "todo", to_status: "done", changed_fields: ["status"] }
        : {}),
      ...(i === 2 ? { amount_cents: "24500" } : {}),
    },
  }));
  await page.route(
    "https://oripsywzngftarbprlgk.supabase.co/**",
    async (route) => {
      const req = route.request(),
        url = new URL(req.url()),
        name = url.pathname.split("/").pop();
      if (name === "user") return route.fulfill({ json: user });
      if (name === "organization_memberships")
        return route.fulfill({
          json:
            url.searchParams.get("select") === "role"
              ? { role: owner ? "owner" : "member" }
              : [
                  {
                    organization_id: org,
                    organizations: {
                      id: org,
                      name: "Atelier du Parc",
                      country: "BE",
                    },
                  },
                ],
        });
      if (name === "projects") {
        if (req.method() === "PATCH") {
          revision++;
          state.updated = true;
        }
        return route.fulfill({
          json: {
            id: project,
            organization_id: org,
            name: state.updated ? "Updated site" : "Maison du Parc",
            client_name: "Camille Laurent",
            city: "Bruxelles",
            address: "Rue des Ateliers 24",
            status: "active",
            revision,
            client_id: null,
            property_id: null,
          },
        });
      }
      if (name === "project_activity_tracking")
        return route.fulfill({ json: { started_at: "2026-09-22T08:00:00Z" } });
      if (name === "team_members")
        return route.fulfill({
          json: [
            {
              user_id: uid,
              email: user.email,
              role: owner ? "owner" : "member",
            },
            {
              user_id: "22222222-2222-4222-8222-222222222222",
              email: "teammate@example.test",
              role: "member",
            },
          ],
        });
      if (name === "project_activity") {
        state.reads++;
        expect(url.searchParams.get("organization_id")).toBe(`eq.${org}`);
        expect(url.searchParams.get("project_id")).toBe(`eq.${project}`);
        expect(url.searchParams.get("order")).toBe("occurred_at.desc,id.desc");
        if (state.fail || (state.failOlder && url.searchParams.has("or")))
          return route.fulfill({
            status: 500,
            json: { message: "Fixture unavailable" },
          });
        let rows = state.empty
          ? []
          : events.filter((r) => owner || r.visibility === "member");
        if (state.updated)
          rows = [
            {
              ...events[0],
              id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
              event_type: "project.updated",
              category: "project",
              entity_type: "project",
              payload: { label: "Updated site" },
            },
            ...rows,
          ];
        const category = url.searchParams.get("category");
        if (category)
          rows = rows.filter((r) => `eq.${r.category}` === category);
        const cursor = url.searchParams.get("or")?.match(/id.lt.([\w-]+)/)?.[1];
        if (cursor) rows = rows.filter((r) => r.id < cursor);
        return route.fulfill({
          json: rows.slice(0, Number(url.searchParams.get("limit"))),
        });
      }
      if (
        ["project_cost_summary", "estimates", "project_costs"].includes(
          name ?? "",
        )
      ) {
        state.financialReads++;
        if (name === "project_cost_summary")
          return route.fulfill({
            json: [
              {
                budget_cents: 400000,
                total: "125000",
                materials: "125000",
                labor: "0",
                subcontractors: "0",
                other: "0",
                budget_revision: 1,
              },
            ],
          });
      }
      return route.fulfill({ json: [] });
    },
  );
  return state;
}
test("journal sidebar, full history, filters, retry, pagination and keyboard", async ({
  page,
}, testInfo) => {
  const state = await fixture(page);
  await page.goto(base);
  const journal = page.getByRole("region", { name: "Project journal" });
  await expect(journal.locator("li")).toHaveCount(5);
  await expect(journal).toContainText(
    "Activity recorded since 22 September 2026",
  );
  await expect(journal).toContainText("To do → Done");
  await expect(journal).toContainText("€245.00");
  await expect(journal).toContainText("teammate@example.test");
  await expect(
    journal.getByRole("link", { name: "Open: Removed.pdf" }),
  ).toHaveCount(0);
  await page.screenshot({
    path: testInfo.outputPath("journal-overview.png"),
    fullPage: true,
  });
  await page
    .locator(".project-tabs")
    .getByRole("link", { name: "Activity", exact: true })
    .click();
  await expect(page).toHaveURL(/tab=activity/);
  await expect(journal.locator("li")).toHaveCount(20);
  state.failOlder = true;
  await journal.getByRole("button", { name: "Load older activity" }).click();
  await expect(journal.getByRole("alert")).toBeVisible();
  await expect(journal.locator("li")).toHaveCount(20);
  state.failOlder = false;
  await journal.getByRole("button", { name: "Try again" }).click();
  await expect(journal.locator("li")).toHaveCount(24);
  await expect(
    journal.getByRole("button", { name: "Load older activity" }),
  ).toHaveCount(0);
  await page.getByLabel("Activity type").selectOption("costs");
  await expect(journal.locator("li")).toHaveCount(1);
  await expect(journal).toContainText("Expense added");
  state.empty = true;
  await journal.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(journal).toContainText("No activity of this type");
  state.empty = false;
  state.fail = true;
  await page.getByLabel("Activity type").selectOption("all");
  await expect(journal.getByRole("alert")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Maison du Parc", exact: true }),
  ).toBeVisible();
  state.fail = false;
  await journal.getByRole("button", { name: "Try again" }).click();
  await expect(journal.locator("li")).toHaveCount(20);
  const filter = page.getByLabel("Activity type");
  await filter.focus();
  await expect(filter).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    journal.getByRole("button", { name: "Refresh", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(journal.getByRole("link").first()).toBeFocused();
  await page.screenshot({
    path: testInfo.outputPath("journal-activity.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.reload();
  await expect(
    page
      .locator(".project-tabs")
      .getByRole("link", { name: "Activity", exact: true }),
  ).toHaveAttribute("aria-current", "page");
});
test("member journal in French omits financial navigation and requests", async ({
  page,
}, testInfo) => {
  const state = await fixture(page, false, "fr");
  await page.goto(`${base}?tab=activity`);
  const journal = page.getByRole("region", { name: "Journal du projet" });
  await expect(journal.locator("li")).toHaveCount(20);
  await expect(journal).toContainText("À faire → Terminée");
  await expect(page.getByLabel("Type d’activité").locator("option")).toHaveText(
    ["Toute l’activité", "Projet", "Tâches", "Documents"],
  );
  await expect(journal).not.toContainText("Private estimate");
  await expect(journal).not.toContainText("245");
  expect(state.financialReads).toBe(0);
  await page.screenshot({
    path: testInfo.outputPath("journal-member-fr.png"),
    fullPage: true,
  });
});
test("project edit refreshes journal and tab navigation preserves task drafts", async ({
  page,
}) => {
  const state = await fixture(page);
  await page.goto(`${base}?tab=activity`);
  const journal = page.getByRole("region", { name: "Project journal" });
  await expect(journal.locator("li")).toHaveCount(20);
  const initial = state.reads;
  await page.getByRole("button", { name: "Edit details", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Project name", { exact: true })
    .fill("Updated site");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Changes saved");
  await page.keyboard.press("Escape");
  await expect(journal).toContainText("Updated site");
  expect(state.reads).toBeGreaterThan(initial);
  await page
    .locator(".project-tabs")
    .getByRole("link", { name: "Tasks", exact: true })
    .click();
  await page.getByRole("button", { name: "New task", exact: true }).click();
  await page.getByLabel("Task name", { exact: true }).fill("Keep my draft");
  await page
    .locator(".project-tabs")
    .getByRole("link", { name: "Activity", exact: true })
    .click();
  await journal.getByRole("button", { name: "Refresh", exact: true }).click();
  await page
    .locator(".project-tabs")
    .getByRole("link", { name: "Tasks", exact: true })
    .click();
  await expect(page.getByLabel("Task name", { exact: true })).toHaveValue(
    "Keep my draft",
  );
});
