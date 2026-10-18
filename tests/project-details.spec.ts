import { expect, test } from "@playwright/test";
import { base, fixture } from "./fixtures/project-details";

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
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel", exact: true })
    .first()
    .click();
  await nav.getByRole("link", { name: "Overview", exact: true }).click();
  await page.getByRole("link", { name: "Set budget", exact: true }).click();
  await expect(page.getByLabel("Cost budget", { exact: true })).toHaveValue("");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
});
