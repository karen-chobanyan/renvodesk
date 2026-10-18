import { expect, type Page, test } from "@playwright/test";
import { base, fixture, org, project } from "./fixtures/project-details";

async function documentsFixture(page: Page, count = 1) {
  await fixture(page);
  const files = Array.from({ length: count }, (_, index) => ({
    id: `dddddddd-dddd-4ddd-8ddd-${String(index).padStart(12, "0")}`,
    organization_id: org,
    project_id: project,
    original_name: `Site document ${index + 1}.txt`,
    mime_type: "text/plain",
    size_bytes: 1024,
    state: "ready",
    object_key: `fixture/${index}.txt`,
  }));
  const sketches = [
    {
      id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      organization_id: org,
      project_id: project,
      title: "Kitchen layout",
      revision: 0,
      current_save_id: null,
    },
  ];
  const state = {
    fileError: false,
    moreError: false,
    sketchError: false,
    uploadError: false,
    offsets: [] as number[],
    requests: [] as string[],
    sketchRequests: [] as { id: string; title: string }[],
  };
  await page.route("**/api/v1/organizations/*/ai-status", (route) =>
    route.fulfill({ json: { configured: true, enabled: true, remaining: 7 } }),
  );
  await page.route("**/rest/v1/project_files**", (route) => {
    const req = route.request(),
      url = new URL(req.url());
    if (req.method() === "POST") {
      const input = req.postDataJSON();
      state.requests.push(input.id);
      expect(input.organization_id).toBe(org);
      expect(input.project_id).toBe(project);
      if (state.uploadError)
        return route.fulfill({
          status: 500,
          json: { message: "Fixture unavailable" },
        });
      const row = {
        ...input,
        state: "pending",
        object_key: `fixture/${input.id}`,
      };
      files.unshift(row);
      return route.fulfill({ json: row });
    }
    expect(url.searchParams.get("organization_id")).toBe(`eq.${org}`);
    expect(url.searchParams.get("project_id")).toBe(`eq.${project}`);
    const id = url.searchParams.get("id"),
      row = files.find((row) => `eq.${row.id}` === id);
    if (req.method() === "PATCH") {
      if (!row) throw new Error("Missing fixture");
      Object.assign(row, req.postDataJSON());
      return route.fulfill({ json: row });
    }
    if (id) return route.fulfill({ json: row ?? null });
    const offset = Number(url.searchParams.get("offset") ?? 0);
    state.offsets.push(offset);
    if (state.fileError || (offset > 0 && state.moreError))
      return route.fulfill({
        status: 500,
        json: { message: "Fixture unavailable" },
      });
    return route.fulfill({ json: files.slice(offset, offset + 20) });
  });
  await page.route("**/rest/v1/project_sketches**", (route) => {
    if (route.request().method() === "POST") {
      state.sketchRequests.push(route.request().postDataJSON());
      return route.fulfill({
        status: 500,
        json: { message: "Fixture unavailable" },
      });
    }
    if (state.sketchError)
      return route.fulfill({
        status: 500,
        json: { message: "Fixture unavailable" },
      });
    return route.fulfill({ json: sketches });
  });
  return { state, files, sketches };
}
const selected = {
  name: "Site plan with a long filename for the documents layout.txt",
  mimeType: "text/plain",
  buffer: Buffer.from("Fictional site notes"),
};

async function focusWindow(page: Page) {
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
}

test("documents retain loaded pages and selected file through independent read failures", async ({
  page,
}) => {
  const { state } = await documentsFixture(page, 21);
  await page.goto(`${base}?tab=documents`);
  const panel = page.locator("#project-files"),
    sketches = page.locator("#project-sketches");
  await expect(panel.locator("tbody tr")).toHaveCount(20);
  await expect(panel.getByText(/Transcription sends/)).toHaveCount(0);
  await expect(
    panel.getByRole("button", { name: "Upload file", exact: true }),
  ).toHaveCount(0);
  await panel.locator('input[type="file"]').setInputFiles(selected);
  state.moreError = true;
  await panel.getByRole("button", { name: "Load more", exact: true }).click();
  await expect(panel.getByRole("alert")).toContainText("Could not load more");
  await expect(panel.locator("tbody tr")).toHaveCount(20);
  state.moreError = false;
  await panel.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(panel.locator("tbody tr")).toHaveCount(21);
  expect(state.offsets.filter((offset) => offset === 20)).toHaveLength(2);
  state.fileError = true;
  await focusWindow(page);
  await expect(panel.getByRole("alert")).toContainText("Could not load files");
  await expect(panel.locator("tbody tr")).toHaveCount(21);
  await expect(panel.locator(".document-selected")).toContainText(
    selected.name,
  );
  await expect(sketches.locator(".sketch-list-row")).toHaveCount(1);
  state.fileError = false;
  await panel.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(panel.getByRole("alert")).toHaveCount(0);
  state.sketchError = true;
  await focusWindow(page);
  await expect(sketches.getByRole("alert")).toContainText(
    "Could not load sketches",
  );
  await expect(panel.locator("tbody tr")).toHaveCount(21);
  await expect(panel.locator(".document-selected")).toContainText(
    selected.name,
  );
  state.sketchError = false;
  await sketches.getByRole("button", { name: "Try again" }).click();
  await expect(sketches.getByRole("alert")).toHaveCount(0);
});

test("uploader guards selection changes and navigation, preserves failed upload identity", async ({
  page,
}) => {
  const { state } = await documentsFixture(page, 0);
  await page.goto(base);
  await page
    .locator(".project-tabs")
    .getByRole("link", { name: "Documents", exact: true })
    .click();
  const panel = page.locator("#project-files"),
    input = panel.locator('input[type="file"]');
  const choose = panel.getByRole("button", {
    name: "Choose a file",
    exact: true,
  });
  await choose.focus();
  const picker = page.waitForEvent("filechooser");
  await choose.press("Enter");
  await (await picker).setFiles(selected);
  await expect(panel.locator(".document-selected")).toContainText(
    "Not uploaded yet",
  );
  page.once("dialog", (d) => d.dismiss());
  await panel.getByRole("button", { name: "Remove selection" }).click();
  await expect(panel.locator(".document-selected")).toContainText(
    selected.name,
  );
  await input.setInputFiles({
    name: "bad.heic",
    mimeType: "image/heic",
    buffer: Buffer.from("invalid"),
  });
  await expect(panel.getByRole("alert")).toContainText("HEIC/HEIF");
  await expect(panel.locator(".document-selected")).toContainText(
    selected.name,
  );
  page.once("dialog", (d) => d.dismiss());
  await page.evaluate(() => history.back());
  await expect(page).toHaveURL(/tab=documents/);
  state.uploadError = true;
  await panel.getByRole("button", { name: "Upload", exact: true }).click();
  await expect(
    panel.locator(".document-upload").getByRole("alert"),
  ).toContainText("operation did not finish");
  await expect(panel.locator(".document-selected")).toContainText(
    selected.name,
  );
  state.uploadError = false;
  await panel.getByRole("button", { name: "Upload", exact: true }).click();
  await expect(panel.getByText("Upload complete.")).toBeVisible();
  expect(state.requests).toHaveLength(2);
  expect(state.requests[0]).toBe(state.requests[1]);
  await expect(panel.locator(".document-selected")).toHaveCount(0);
  await input.setInputFiles(selected);
  page.once("dialog", (d) => d.accept());
  await page.evaluate(() => history.back());
  await expect(page).toHaveURL(base);
  await page
    .locator(".project-tabs")
    .getByRole("link", { name: "Documents", exact: true })
    .click();
  await expect(panel.locator(".document-selected")).toHaveCount(0);
});

test("a delayed file preview cannot reopen after leaving Documents", async ({
  page,
}) => {
  const { files } = await documentsFixture(page);
  files[0].original_name = "Site photo.png";
  files[0].mime_type = "image/png";
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const endpoint = "**/storage/v1/object/sign/project-files/**";
  await page.route(endpoint, async (route) => {
    await gate;
    await route.fulfill({
      json: {
        signedURL: "/object/sign/project-files/fixture.png?token=fictional",
      },
    });
  });
  await page.goto(`${base}?tab=documents`);
  const panel = page.locator("#project-files");
  const request = page.waitForRequest(endpoint);
  await panel.getByRole("button", { name: "Preview", exact: true }).click();
  await request;
  await page
    .locator(".project-tabs")
    .getByRole("link", { name: "Overview", exact: true })
    .click();
  const response = page.waitForResponse(endpoint);
  release();
  await response;
  await expect(
    panel.getByRole("button", {
      name: "Preview",
      exact: true,
      includeHidden: true,
    }),
  ).toBeEnabled();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .locator(".project-tabs")
    .getByRole("link", { name: "Documents", exact: true })
    .click();
  await expect(
    panel.getByRole("button", { name: "Preview", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("new sketch modal protects its draft and retries the same creation", async ({
  page,
}) => {
  const { state, sketches } = await documentsFixture(page);
  await page.goto(`${base}?tab=documents`);
  const add = page.getByRole("button", { name: "New sketch", exact: true });
  await add.click();
  const dialog = page.getByRole("dialog"),
    name = dialog.getByLabel("Sketch name", { exact: true });
  await expect(name).toBeFocused();
  await name.fill("My working sketch");
  page.once("dialog", (d) => d.dismiss());
  await page.keyboard.press("Escape");
  await expect(name).toHaveValue("My working sketch");
  sketches[0].title = "Updated elsewhere";
  await focusWindow(page);
  await expect(
    page.locator("#project-sketches .sketch-list-row"),
  ).toContainText("Updated elsewhere");
  await expect(name).toHaveValue("My working sketch");
  await dialog.getByRole("button", { name: "Create sketch" }).click();
  await expect(dialog.getByRole("alert")).toContainText(
    "Creation not confirmed",
  );
  await expect(name).toBeDisabled();
  await dialog.getByRole("button", { name: "Try again" }).click();
  await expect(dialog.getByRole("alert")).toContainText(
    "Creation not confirmed",
  );
  expect(state.sketchRequests).toHaveLength(2);
  expect(state.sketchRequests[0]).toEqual(state.sketchRequests[1]);
  page.once("dialog", (d) => d.accept());
  await dialog
    .getByRole("button", { name: "Cancel", exact: true })
    .first()
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(add).toBeFocused();
});

test("Documents demo matches the restored uploader and responsive file library in both languages", async ({
  page,
}) => {
  await page.goto("/projects/maison-ixelles?tab=documents");
  await page.getByRole("button", { name: "Tout refuser", exact: true }).click();
  const panel = page.locator("#project-files");
  await expect(
    panel.getByRole("button", { name: "Choisir un fichier" }),
  ).toBeVisible();
  await expect(
    panel.getByRole("button", { name: "Ajouter un fichier" }),
  ).toHaveCount(0);
  await expect(page.getByText(/La transcription envoie/)).toHaveCount(0);
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `/private/tmp/renvo-documents-fr-${test.info().project.name}.png`,
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Nouveau croquis" }).click();
  await expect(
    page.getByRole("dialog").getByRole("button", { name: "Créer le croquis" }),
  ).toBeDisabled();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Annuler", exact: true })
    .first()
    .click();
  await page.locator(".language-picker select").selectOption("en");
  await expect(
    panel.getByRole("button", { name: "Choose a file" }),
  ).toBeVisible();
  await page.screenshot({
    path: `/private/tmp/renvo-documents-en-${test.info().project.name}.png`,
    fullPage: true,
    animations: "disabled",
  });
});
