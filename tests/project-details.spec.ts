import { expect, type Page, test } from "@playwright/test";

const org = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  project = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  uid = "11111111-1111-4111-8111-111111111111";
const base = `/workspace/${org}/projects/${project}`;
async function fixture(page: Page) {
  const user = {
    id: uid,
    aud: "authenticated",
    role: "authenticated",
    email: "project@example.test",
    email_confirmed_at: "2026-01-01T00:00:00Z",
    app_metadata: { provider: "email" },
    user_metadata: {},
    created_at: "2026-01-01T00:00:00Z",
  };
  const encode = (v: unknown) =>
    Buffer.from(JSON.stringify(v)).toString("base64url");
  const token = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: uid, role: "authenticated", exp: 4102444800 })}.test`;
  await page.addInitScript(
    ({ user, token }) => {
      localStorage.setItem("renvodesk-locale", "en");
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
    { user, token },
  );
  const state = {
    project: {
      id: project,
      organization_id: org,
      name: "Maison du Parc",
      client_name: "Camille Laurent",
      city: "Bruxelles",
      address: "Rue des Ateliers 24",
      status: "active",
      revision: 1,
      client_id: null,
      property_id: null,
    },
    failRead: false,
    failSave: false,
    revisions: [] as string[],
    budget: 100000 as number | null,
    budgetRevision: 1 as number | null,
    task: {
      id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      organization_id: org,
      project_id: project,
      title: "Check the roof",
      notes: "Check the flashing",
      status: "todo",
      start_date: null,
      due_date: "2026-10-01",
      assignee_id: uid,
      revision: 1,
    },
    file: {
      id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      organization_id: org,
      project_id: project,
      original_name: "Roof notes.txt",
      mime_type: "text/plain",
      state: "ready",
      size_bytes: 12,
      object_key: "fixture/notes.txt",
    },
    scopedTaskReads: 0,
    scopedFileReads: 0,
  };
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
              ? { role: "owner" }
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
          const revision = url.searchParams.get("revision") ?? "";
          state.revisions.push(revision);
          if (state.failSave)
            return route.fulfill({
              status: 500,
              json: { message: "Fixture unavailable" },
            });
          if (revision !== `eq.${state.project.revision}`)
            return route.fulfill({ json: [] });
          state.project = { ...state.project, ...req.postDataJSON() };
          return route.fulfill({ json: state.project });
        }
        if (state.failRead)
          return route.fulfill({
            status: 500,
            json: { message: "Fixture unavailable" },
          });
        return route.fulfill({
          json: url.searchParams.has("id") ? state.project : [state.project],
        });
      }
      if (name === "team_members")
        return route.fulfill({
          json: [{ user_id: uid, email: user.email, role: "owner" }],
        });
      if (name === "project_tasks") {
        expect(url.searchParams.get("organization_id")).toBe(`eq.${org}`);
        expect(url.searchParams.get("project_id")).toBe(`eq.${project}`);
        if (req.method() === "PATCH") {
          state.task = { ...state.task, ...req.postDataJSON() };
          return route.fulfill({ json: state.task });
        }
        if (url.searchParams.has("id")) {
          state.scopedTaskReads++;
          return route.fulfill({ json: [state.task] });
        }
        return route.fulfill({
          json:
            url.searchParams.has("status") && state.task.status !== "done"
              ? [state.task]
              : [],
        });
      }
      if (name === "project_files") {
        expect(url.searchParams.get("organization_id")).toBe(`eq.${org}`);
        expect(url.searchParams.get("project_id")).toBe(`eq.${project}`);
        if (url.searchParams.has("id")) {
          state.scopedFileReads++;
          return route.fulfill({ json: state.file });
        }
        return route.fulfill({
          json:
            url.searchParams.get("state") === "eq.ready" ? [state.file] : [],
        });
      }
      if (name === "project_cost_summary")
        return route.fulfill({
          json: [
            {
              budget_cents: state.budget,
              budget_revision: state.budgetRevision,
              total: "0",
              materials: "0",
              labor: "0",
              subcontractors: "0",
              other: "0",
            },
          ],
        });
      if (name === "project_budgets") {
        state.budget = req.postDataJSON().budget_cents;
        state.budgetRevision = (state.budgetRevision ?? 0) + 1;
        return route.fulfill({
          json: {
            ...req.postDataJSON(),
            project_id: project,
            organization_id: org,
          },
        });
      }
      if (name === "project_activity_tracking")
        return route.fulfill({ json: { started_at: "2026-09-22T08:00:00Z" } });
      return route.fulfill({ json: [] });
    },
  );
  return state;
}

test("project editor keeps its revision and draft through background refresh and failed reload", async ({
  page,
}) => {
  const state = await fixture(page);
  await page.clock.install();
  await page.goto(base);
  await page.getByRole("button", { name: "Edit details", exact: true }).click();
  const dialog = page.getByRole("dialog"),
    save = dialog.getByRole("button", { name: "Save changes" });
  await expect(save).toBeDisabled();
  await dialog
    .getByLabel("Project name", { exact: true })
    .fill("My working draft");
  state.project = { ...state.project, name: "Another editor", revision: 2 };
  await page.clock.fastForward(61000);
  await page.evaluate(() =>
    window.dispatchEvent(new Event("visibilitychange")),
  );
  await expect(page.locator(".project-heading-title")).toContainText(
    "Another editor",
  );
  await expect(dialog.getByLabel("Project name", { exact: true })).toHaveValue(
    "My working draft",
  );
  await save.click();
  await expect(dialog.getByRole("alert")).toContainText("The project changed");
  expect(state.revisions).toEqual(["eq.1"]);
  state.failRead = true;
  page.once("dialog", (d) => d.accept());
  await dialog
    .getByRole("button", { name: "Reload and replace my fields" })
    .click();
  await expect(dialog.getByRole("alert")).toContainText("Could not reload");
  await expect(dialog.getByLabel("Project name", { exact: true })).toHaveValue(
    "My working draft",
  );
  await expect(save).toBeDisabled();
  state.failRead = false;
  page.once("dialog", (d) => d.dismiss());
  await dialog
    .getByRole("button", { name: "Reload and replace my fields" })
    .click();
  await expect(dialog.getByLabel("Project name", { exact: true })).toHaveValue(
    "My working draft",
  );
  page.once("dialog", (d) => d.accept());
  await dialog
    .getByRole("button", { name: "Reload and replace my fields" })
    .click();
  await expect(dialog.getByLabel("Project name", { exact: true })).toHaveValue(
    "Another editor",
  );
  await dialog
    .getByLabel("Project name", { exact: true })
    .fill("Reconciled site");
  await save.click();
  await expect(dialog.getByRole("status")).toHaveText("Changes saved.");
  expect(state.revisions).toEqual(["eq.1", "eq.2"]);
  await dialog.getByLabel("Project name", { exact: true }).fill("Next draft");
  await expect(dialog.getByRole("status")).toHaveText("Unsaved changes");
  const reloadPrompt = page.waitForEvent("dialog").then((d) => d.dismiss());
  await page.evaluate(() => location.reload());
  await reloadPrompt;
  await expect(dialog.getByLabel("Project name", { exact: true })).toHaveValue(
    "Next draft",
  );
  page.once("dialog", (d) => d.dismiss());
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(dialog).toBeVisible();
  page.once("dialog", (d) => d.accept());
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Edit details", exact: true }),
  ).toBeFocused();
});

test("project overview follows scoped task and file links and refreshes after budget and task edits", async ({
  page,
}) => {
  const state = await fixture(page);
  await page.goto(base);
  const nav = page.locator(".project-tabs");
  await page.getByRole("link", { name: /Check the roof/ }).click();
  const task = page.locator(`#task-${state.task.id}`);
  await expect(task).toBeFocused();
  expect(state.scopedTaskReads).toBe(1);
  await task.getByRole("button", { name: "Edit", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Task status", exact: true })
    .selectOption("done");
  await page.getByRole("button", { name: "Save task", exact: true }).click();
  await nav.getByRole("link", { name: "Overview", exact: true }).click();
  await expect(page.getByRole("link", { name: /Check the roof/ })).toHaveCount(
    0,
  );
  await page
    .getByRole("link", { name: "View budget and costs", exact: true })
    .click();
  await page.getByRole("button", { name: "Edit budget", exact: true }).click();
  await page.getByLabel("Cost budget", { exact: true }).fill("2500");
  await page.getByRole("button", { name: "Save budget", exact: true }).click();
  await nav.getByRole("link", { name: "Overview", exact: true }).click();
  await expect(page.locator(".project-budget-preview")).toContainText(
    "€2,500.00",
  );
  await page.getByRole("link", { name: "Roof notes.txt", exact: true }).click();
  const file = page.locator(`#file-${state.file.id}`);
  await expect(file).toBeFocused();
  expect(state.scopedFileReads).toBe(1);
  await file.locator("summary").click();
  await expect(
    file.getByRole("button", { name: "Download", exact: true }),
  ).toBeVisible();
  await expect(
    file.getByRole("button", { name: "Delete", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("project editor validates fields and retains failed saves", async ({
  page,
}) => {
  const state = await fixture(page);
  await page.goto(base);
  await page.getByRole("button", { name: "Edit details", exact: true }).click();
  const dialog = page.getByRole("dialog"),
    name = dialog.getByLabel("Project name", { exact: true });
  await name.fill("   ");
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(name).toBeFocused();
  await expect(name).toHaveAttribute("aria-invalid", "true");
  expect(state.revisions).toHaveLength(0);
  await name.fill("New site name");
  state.failSave = true;
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(dialog.getByRole("alert")).toContainText("Save not confirmed");
  await expect(name).toHaveValue("New site name");
  state.failSave = false;
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(dialog.getByRole("status")).toHaveText("Changes saved.");
});

test("project empty actions open task, estimate, sketch and unset budget controls", async ({
  page,
}) => {
  const state = await fixture(page);
  state.task.status = "done";
  state.budget = null;
  state.budgetRevision = null;
  await page.goto(base);
  const nav = page.locator(".project-tabs");
  await page.getByRole("link", { name: "New task", exact: true }).click();
  await expect(page.getByLabel("Task name", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await nav.getByRole("link", { name: "Overview", exact: true }).click();
  await page.getByRole("link", { name: "New estimate", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByLabel("Estimate title", { exact: true }),
  ).toBeVisible();
  await expect(dialog.getByRole("combobox")).toHaveCount(0);
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await nav.getByRole("link", { name: "Overview", exact: true }).click();
  await page.getByRole("link", { name: "New sketch", exact: true }).click();
  await expect(page.getByLabel("Sketch name", { exact: true })).toBeVisible();
  await nav.getByRole("link", { name: "Overview", exact: true }).click();
  await page.getByRole("link", { name: "Set budget", exact: true }).click();
  await expect(page.getByLabel("Cost budget", { exact: true })).toHaveValue("");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
});
