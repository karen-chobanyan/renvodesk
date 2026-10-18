import { expect, type Page } from "@playwright/test";

export const org = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  project = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  uid = "11111111-1111-4111-8111-111111111111";
export const base = `/workspace/${org}/projects/${project}`;
export async function fixture(page: Page) {
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
