import { expect, type Page, test } from "@playwright/test";
import { base, fixture, org, project } from "./fixtures/project-details";

async function costsFixture(page: Page, count = 1) {
  const state = await fixture(page);
  const costs = Array.from({ length: count }, (_, index) => ({
    id: `dddddddd-dddd-4ddd-8ddd-${String(index).padStart(12, "0")}`,
    organization_id: org,
    project_id: project,
    description: `Materials ${index + 1}`,
    category: "materials",
    amount_cents: 12345,
    incurred_on: "2026-10-18",
    notes: "Supplier receipt",
    revision: 1,
    voided: false,
  }));
  const reads = {
    summary: false,
    list: false,
    more: false,
    single: false,
    offsets: [] as number[],
    writes: [] as string[],
    budgetWrites: [] as string[],
  };
  await page.route("**/rest/v1/rpc/project_cost_summary", (route) => {
    if (reads.summary)
      return route.fulfill({
        status: 500,
        json: { message: "Fixture unavailable" },
      });
    const total = String(
      costs
        .filter((row) => !row.voided)
        .reduce((sum, row) => sum + BigInt(row.amount_cents), 0n),
    );
    return route.fulfill({
      json: [
        {
          budget_cents: state.budget,
          budget_revision: state.budgetRevision,
          total,
          materials: total,
          labor: "0",
          subcontractors: "0",
          other: "0",
        },
      ],
    });
  });
  await page.route("**/rest/v1/project_budgets**", (route) => {
    const request = route.request(),
      url = new URL(request.url());
    reads.budgetWrites.push(url.searchParams.get("revision") ?? "insert");
    if (
      request.method() === "PATCH" &&
      url.searchParams.get("revision") !== `eq.${state.budgetRevision}`
    )
      return route.fulfill({ json: [] });
    state.budget = request.postDataJSON().budget_cents;
    state.budgetRevision = (state.budgetRevision ?? 0) + 1;
    return route.fulfill({
      json: { budget_cents: state.budget, revision: state.budgetRevision },
    });
  });
  await page.route("**/rest/v1/project_costs**", (route) => {
    const request = route.request(),
      url = new URL(request.url());
    expect(url.searchParams.get("organization_id")).toBe(`eq.${org}`);
    expect(url.searchParams.get("project_id")).toBe(`eq.${project}`);
    const id = url.searchParams.get("id"),
      row = costs.find((row) => `eq.${row.id}` === id);
    if (request.method() === "PATCH") {
      const revision = url.searchParams.get("revision") ?? "";
      reads.writes.push(revision);
      if (!row || revision !== `eq.${row.revision}`)
        return route.fulfill({ json: [] });
      Object.assign(row, request.postDataJSON());
      return route.fulfill({ json: row });
    }
    if (id)
      return reads.single
        ? route.fulfill({
            status: 500,
            json: { message: "Fixture unavailable" },
          })
        : route.fulfill({ json: row ? [row] : [] });
    const offset = Number(url.searchParams.get("offset") ?? 0);
    reads.offsets.push(offset);
    if (reads.list || (offset > 0 && reads.more))
      return route.fulfill({
        status: 500,
        json: { message: "Fixture unavailable" },
      });
    return route.fulfill({ json: costs.slice(offset, offset + 20) });
  });
  return { state, costs, reads };
}

async function focusWindow(page: Page) {
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
}

test("cost summary, ledger and next-page failures recover independently", async ({
  page,
}) => {
  const { reads } = await costsFixture(page, 21);
  reads.summary = true;
  await page.goto(`${base}?tab=budget`);
  const panel = page.locator("#project-costs"),
    ledger = panel.locator(".cost-ledger");
  await expect(panel.locator(".cost-row")).toHaveCount(20);
  await expect(panel.getByRole("alert")).toContainText(
    "Could not refresh the budget",
  );
  reads.summary = false;
  await panel.getByRole("button", { name: "Try again" }).click();
  await expect(panel.locator(".metrics")).toContainText("€2,592.45");
  reads.more = true;
  await ledger.getByRole("button", { name: "Load more" }).click();
  await expect(ledger.getByRole("alert")).toContainText("Could not load more");
  await expect(ledger.locator(".cost-row")).toHaveCount(20);
  reads.more = false;
  await ledger.getByRole("button", { name: "Try again" }).click();
  await expect(ledger.locator(".cost-row")).toHaveCount(21);
  expect(reads.offsets.filter((offset) => offset === 20)).toHaveLength(2);
  reads.list = true;
  await focusWindow(page);
  await expect(ledger.getByRole("alert")).toContainText(
    "Could not refresh the list",
  );
  await expect(ledger.locator(".cost-row")).toHaveCount(21);
  await expect(panel.locator(".metrics")).toContainText("€2,592.45");
  reads.list = false;
  await ledger.getByRole("button", { name: "Try again" }).click();
  await expect(ledger.getByRole("alert")).toHaveCount(0);
  await expect(ledger.locator(".cost-row")).toHaveCount(21);
});

test("cost modal preserves draft and revision through refresh, failed reload and conflict", async ({
  page,
}) => {
  const { costs, reads } = await costsFixture(page);
  await page.goto(`${base}?tab=budget`);
  const edit = page.getByRole("button", { name: "Edit — Materials 1" });
  await edit.click();
  const dialog = page.getByRole("dialog"),
    amount = dialog.getByLabel("Amount excl. tax (€)");
  await amount.fill("150.25");
  costs[0].revision = 2;
  costs[0].amount_cents = 14000;
  await focusWindow(page);
  await expect(page.locator("#project-costs .metrics")).toContainText(
    "€140.00",
  );
  await expect(amount).toHaveValue("150.25");
  await dialog.getByRole("button", { name: "Save cost" }).click();
  await expect(dialog.getByRole("alert")).toContainText("The data changed");
  expect(reads.writes).toEqual(["eq.1"]);
  reads.single = true;
  page.once("dialog", (d) => d.accept());
  await dialog.getByRole("button", { name: "Reload costs" }).click();
  await expect(
    dialog.getByText("Could not reload. Your fields are preserved."),
  ).toBeVisible();
  await expect(amount).toHaveValue("150.25");
  await expect(
    dialog.getByRole("button", { name: "Save cost" }),
  ).toBeDisabled();
  reads.single = false;
  page.once("dialog", (d) => d.dismiss());
  await dialog.getByRole("button", { name: "Reload costs" }).click();
  await expect(amount).toHaveValue("150.25");
  page.once("dialog", (d) => d.accept());
  await dialog.getByRole("button", { name: "Reload costs" }).click();
  await expect(amount).toHaveValue("140.00");
  await amount.fill("150.25");
  await dialog.getByRole("button", { name: "Save cost" }).click();
  await expect(dialog).toHaveCount(0);
  expect(reads.writes).toEqual(["eq.1", "eq.2"]);
  await expect(edit).toBeFocused();
});

test("budget modal distinguishes zero, guards drafts and recovers with a frozen revision", async ({
  page,
}) => {
  const { state, reads } = await costsFixture(page, 0);
  state.budget = null;
  state.budgetRevision = null;
  await page.goto(`${base}?tab=budget`);
  await page.getByRole("button", { name: "Set budget", exact: true }).click();
  const dialog = page.getByRole("dialog"),
    input = dialog.getByLabel("Cost budget", { exact: true });
  await input.fill("0");
  await dialog.getByRole("button", { name: "Save budget" }).click();
  await expect(
    page.locator("#project-costs .metrics").getByText("€0.00", { exact: true }),
  ).toHaveCount(3);
  const edit = page.getByRole("button", { name: "Edit budget" });
  await edit.click();
  await input.fill("200");
  page.once("dialog", (d) => d.dismiss());
  await page.keyboard.press("Escape");
  await expect(input).toHaveValue("200");
  state.budget = 10000;
  state.budgetRevision = 2;
  await focusWindow(page);
  await expect(page.locator("#project-costs .metrics")).toContainText(
    "€100.00",
  );
  await expect(input).toHaveValue("200");
  await dialog.getByRole("button", { name: "Save budget" }).click();
  await expect(dialog.getByRole("alert")).toContainText("The data changed");
  expect(reads.budgetWrites).toEqual(["insert", "eq.1"]);
  reads.summary = true;
  page.once("dialog", (d) => d.accept());
  await dialog.getByRole("button", { name: "Reload costs" }).click();
  await expect(
    dialog.getByText("Could not reload. Your fields are preserved."),
  ).toBeVisible();
  await expect(input).toHaveValue("200");
  reads.summary = false;
  page.once("dialog", (d) => d.accept());
  await dialog.getByRole("button", { name: "Reload costs" }).click();
  await expect(input).toHaveValue("100.00");
  await input.fill("200");
  await dialog.getByRole("button", { name: "Save budget" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(edit).toBeFocused();
  expect(reads.budgetWrites).toEqual(["insert", "eq.1", "eq.2"]);
});

test("returning to budget updates reads and void confirmation identifies the exact cost", async ({
  page,
}) => {
  const { costs } = await costsFixture(page);
  await page.goto(`${base}?tab=budget`);
  await expect(page.locator("#project-costs .cost-row")).toHaveCount(1);
  await page
    .locator(".project-tabs")
    .getByRole("link", { name: "Overview", exact: true })
    .click();
  costs[0].amount_cents = 9900;
  await page
    .locator(".project-tabs")
    .getByRole("link", { name: "Budget and costs", exact: true })
    .click();
  await expect(page.locator("#project-costs .metrics")).toContainText("€99.00");
  await expect(
    page.locator("#project-costs").getByRole("button", { name: "Refresh" }),
  ).toHaveCount(0);
  await page.getByLabel("More actions — Materials 1").click();
  await page.getByRole("button", { name: "Void cost", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Materials 1 · €99.00");
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(costs[0].voided).toBe(false);
  await page.getByLabel("More actions — Materials 1").click();
  await page.getByRole("button", { name: "Void cost", exact: true }).click();
  await dialog.getByRole("button", { name: "Void cost", exact: true }).click();
  await expect(page.locator(".cost-row-voided")).toContainText(
    "Excluded from totals",
  );
  await expect(page.locator("#project-costs .metrics")).toContainText("€0.00");
});

test("cost draft survives cancelled browser navigation and closes after confirmed navigation", async ({
  page,
}) => {
  await costsFixture(page);
  await page.goto(base);
  await page
    .locator(".project-tabs")
    .getByRole("link", { name: "Budget and costs", exact: true })
    .click();
  await page.getByRole("button", { name: "Add cost", exact: true }).click();
  const dialog = page.getByRole("dialog"),
    name = dialog.getByLabel("Cost description");
  await expect(name).toBeFocused();
  await name.fill("Working draft");
  page.once("dialog", (d) => d.dismiss());
  await page.evaluate(() => history.back());
  await expect(page).toHaveURL(/tab=budget/);
  await expect(name).toHaveValue("Working draft");
  page.once("dialog", (d) => d.accept());
  await page.evaluate(() => history.back());
  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL(base);
});
