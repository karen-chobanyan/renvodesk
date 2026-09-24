import { readFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";

const org = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const project = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const uid = "11111111-1111-4111-8111-111111111111";
const sample = readFileSync("tests/fixtures/cad-sample.dxf");
const base = `/workspace/${org}/projects/${project}?tab=documents`;

async function renderedPixels(page: Page) {
  const canvas = page.locator(".dxf-stage .cad-render-surface canvas").first();
  const png = (await canvas.screenshot()).toString("base64");
  return page.evaluate(async (base64) => {
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();
    const target = document.createElement("canvas");
    target.width = image.width;
    target.height = image.height;
    const context = target.getContext("2d");
    if (!context) throw new Error("No image context");
    context.drawImage(image, 0, 0);
    const { data } = context.getImageData(0, 0, target.width, target.height);
    let walls = 0;
    let labels = 0;
    let dimensions = 0;
    let dimensionLeft = target.width;
    let dimensionRight = -1;
    for (let y = 10; y < target.height - 10; y++)
      for (let x = 10; x < target.width - 10; x++) {
        const ucs = x < target.width * 0.15 && y > target.height * 0.75;
        const i = (y * target.width + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        if (
          !ucs &&
          r > 100 &&
          g > 100 &&
          b > 100 &&
          Math.max(r, g, b) - Math.min(r, g, b) < 35
        )
          walls++;
        if (!ucs && g > 100 && r < 70 && b < 70) labels++;
        if (g > 100 && b > 100 && r < 70) {
          dimensions++;
          dimensionLeft = Math.min(dimensionLeft, x);
          dimensionRight = Math.max(dimensionRight, x);
        }
      }
    return {
      walls,
      labels,
      dimensions,
      dimensionWidth: Math.max(0, dimensionRight - dimensionLeft),
    };
  }, png);
}

async function fixture(page: Page, owner: boolean, locale = "en") {
  const user = {
    id: uid,
    aud: "authenticated",
    role: "authenticated",
    email: "dxf@example.test",
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
    invalid: false,
    oversized: false,
    failDownload: false,
    signed: 0,
    downloads: 0,
    uploaded: !owner,
    bytes: sample,
    file: owner
      ? null
      : ({
          id: uid,
          organization_id: org,
          project_id: project,
          original_name: "Plan.dxf",
          mime_type: "application/dxf",
          size_bytes: sample.length,
          object_key: `${org}/${project}/${uid}`,
          state: "ready",
          version: 1,
        } as Record<string, unknown> | null),
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
              ? { role: owner ? "owner" : "member" }
              : [
                  {
                    organization_id: org,
                    role: owner ? "owner" : "member",
                    organizations: {
                      id: org,
                      name: "DXF fixture",
                      country: "BE",
                    },
                  },
                ],
        });
      if (name === "projects")
        return route.fulfill({
          json: {
            id: project,
            organization_id: org,
            name: "DXF project",
            client_name: "Fictional client",
            city: "Brussels",
            address: "",
            status: "active",
            revision: 1,
            client_id: null,
            property_id: null,
          },
        });
      if (name === "project_files") {
        if (req.method() === "POST") {
          expect(owner).toBe(true);
          const body = req.postDataJSON();
          expect(body.organization_id).toBe(org);
          expect(body.project_id).toBe(project);
          expect(body.mime_type).toBe("application/dxf");
          state.file = {
            ...body,
            object_key: `${org}/${project}/${body.id}`,
            state: "pending",
            version: 1,
          };
          return route.fulfill({ json: state.file });
        }
        expect(url.searchParams.get("organization_id")).toBe(`eq.${org}`);
        expect(url.searchParams.get("project_id")).toBe(`eq.${project}`);
        if (req.method() === "PATCH") {
          expect(owner).toBe(true);
          const { state: next } = req.postDataJSON();
          if (next === "ready" && !state.uploaded)
            return route.fulfill({
              status: 400,
              json: { message: "Missing upload" },
            });
          state.file = { ...state.file, state: next };
          return route.fulfill({ json: state.file });
        }
        return route.fulfill({
          json:
            state.file && state.file.state !== "deleted" ? [state.file] : [],
        });
      }
      if (url.pathname.startsWith("/storage/v1/object/")) {
        if (req.method() === "POST" && url.pathname.includes("/sign/")) {
          expect(req.postDataJSON().expiresIn).toBe(3600);
          state.signed++;
          return route.fulfill({
            json: {
              signedURL: `/object/sign/project-files/fixture?token=private-${state.signed}`,
            },
          });
        }
        if (req.method() === "POST") {
          expect(owner).toBe(true);
          expect(req.headers()["content-type"]).toBe("application/dxf");
          expect(req.headers()["x-upsert"]).toBe("false");
          state.bytes = Buffer.from(req.postDataBuffer() ?? Buffer.alloc(0));
          expect(state.bytes.equals(sample)).toBe(true);
          state.uploaded = true;
          return route.fulfill({ json: { Key: state.file?.object_key } });
        }
        if (req.method() === "DELETE") {
          expect(owner).toBe(true);
          expect(state.file?.state).toBe("deleting");
          state.uploaded = false;
          return route.fulfill({ json: [] });
        }
        state.downloads++;
        return route.fulfill({
          status: state.failDownload ? 403 : 200,
          contentType: "application/dxf",
          body: state.oversized
            ? Buffer.alloc(10 * 1024 * 1024 + 1, 32)
            : state.invalid
              ? Buffer.from("<html>Not a drawing</html>")
              : state.bytes,
        });
      }
      if (name === "project_activity_tracking")
        return route.fulfill({ json: { started_at: "2026-09-23T00:00:00Z" } });
      return route.fulfill({ json: [] });
    },
  );
  return state;
}

async function openPlan(page: Page) {
  await page
    .locator(".project-files")
    .getByRole("button", { name: "Open plan", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("status")).toHaveText(
    "Plan opened",
    { timeout: 30000 },
  );
  await expect(
    page.locator(".dxf-stage .cad-render-surface canvas").first(),
  ).toBeVisible();
}

test("owner uploads DXF, reopens saved plan, uses controls and deletes original", async ({
  page,
}) => {
  test.setTimeout(90000);
  const state = await fixture(page, true);
  await page.goto(base);
  await page.getByRole("button", { name: "Reject all", exact: true }).click();
  const files = page.locator(".project-files");
  await files.locator('input[type="file"]').setInputFiles({
    name: "Plan.DXF",
    mimeType: "application/octet-stream",
    buffer: sample,
  });
  await files.getByRole("button", { name: "Upload", exact: true }).click();
  await expect(files.getByText("Upload complete.")).toBeVisible();
  await page.reload();
  await openPlan(page);
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator("iframe")).toHaveCount(0);
  await expect
    .poll(async () => (await renderedPixels(page)).walls)
    .toBeGreaterThan(200);
  const initial = await renderedPixels(page);
  expect(initial.labels).toBeGreaterThan(100);
  expect(initial.dimensions).toBeGreaterThan(100);
  await dialog.getByRole("button", { name: "Zoom out", exact: true }).click();
  await expect
    .poll(
      async () =>
        (await renderedPixels(page)).dimensionWidth / initial.dimensionWidth,
    )
    .toBeGreaterThan(0.77);
  await expect
    .poll(
      async () =>
        (await renderedPixels(page)).dimensionWidth / initial.dimensionWidth,
    )
    .toBeLessThan(0.83);
  await dialog.getByRole("button", { name: "Zoom in", exact: true }).click();
  await expect
    .poll(async () =>
      Math.abs(
        (await renderedPixels(page)).dimensionWidth - initial.dimensionWidth,
      ),
    )
    .toBeLessThan(4);
  await dialog
    .getByRole("button", { name: "Fit to screen", exact: true })
    .click();
  await expect
    .poll(async () => (await renderedPixels(page)).dimensions)
    .toBeGreaterThan(100);
  const layersToggle = dialog
    .locator(".dxf-controls")
    .getByRole("button", { name: "Layers", exact: true });
  if ((await layersToggle.getAttribute("aria-expanded")) === "false")
    await layersToggle.click();
  const layer = dialog.getByRole("checkbox", { name: "WALLS", exact: true });
  await layer.focus();
  await page.keyboard.press("Space");
  await expect(layer).not.toBeChecked();
  await page.keyboard.press("Space");
  await expect(layer).toBeChecked();
  if (test.info().project.name === "mobile") {
    const canvasBox = await dialog.locator(".dxf-stage").boundingBox();
    const layersBox = await dialog.locator(".dxf-layers").boundingBox();
    const toolsBox = await dialog.locator(".dxf-controls").boundingBox();
    if (!canvasBox || !layersBox || !toolsBox)
      throw new Error("Missing viewer panel");
    expect(canvasBox.height).toBeGreaterThan(180);
    expect(layersBox.y).toBeGreaterThanOrEqual(
      canvasBox.y + canvasBox.height - 1,
    );
    expect(toolsBox.y).toBeGreaterThanOrEqual(
      layersBox.y + layersBox.height - 1,
    );
  }

  await expect(dialog.locator(".dxf-layer-color").first()).toBeVisible();
  await expect(
    dialog
      .locator(".dxf-layer-row")
      .filter({
        has: page.getByRole("checkbox", { name: "LABELS", exact: true }),
      })
      .locator(".dxf-layer-color"),
  ).toHaveCSS("background-color", "rgb(0, 255, 0)");
  await layersToggle.click();
  await expect(layer).toHaveCount(0);
  await layersToggle.click();
  await expect(
    dialog.getByText("Read only · DXF", { exact: true }),
  ).toHaveCount(0);
  await dialog
    .getByRole("button", { name: "Plan information", exact: true })
    .click();
  await expect(
    dialog.getByText("Read only · DXF", { exact: true }),
  ).toBeVisible();
  await dialog
    .getByRole("button", { name: "Plan information", exact: true })
    .click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await dialog.evaluate((element) => {
    element.scrollTop = 0;
  });
  await page.screenshot({
    path: `/private/tmp/project-dxf-${test.info().project.name}.png`,
    fullPage: false,
  });
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.locator(".cad-render-surface")).toHaveCount(0);
  await openPlan(page);
  expect(state.signed).toBe(2);
  await page.keyboard.press("Escape");
  const download = page.waitForEvent("download");
  await files.getByRole("button", { name: "Download", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("Plan.DXF");
  await files.getByRole("button", { name: "Delete", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await expect(files.getByText("File deleted.")).toBeVisible();
});

test("member can view DXF; errors recover and loaded plans survive link expiry", async ({
  page,
}) => {
  test.setTimeout(90000);
  const state = await fixture(page, false);
  await page.goto(base);
  await page.getByRole("button", { name: "Reject all", exact: true }).click();
  const files = page.locator(".project-files");
  await expect(
    files.getByRole("button", { name: "Open plan", exact: true }),
  ).toBeVisible();
  await expect(files.locator('input[type="file"]')).toHaveCount(0);
  await expect(
    files.getByRole("button", { name: "Delete", exact: true }),
  ).toHaveCount(0);
  for (const failure of ["invalid", "oversized", "failDownload"] as const) {
    state[failure] = true;
    await files.getByRole("button", { name: "Open plan", exact: true }).click();
    await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
      "could not be displayed",
    );
    await expect(page.locator(".cad-render-surface")).toHaveCount(0);
    await page.keyboard.press("Escape");
    state[failure] = false;
  }
  await openPlan(page);
  await page.clock.install();
  // Timers created before installation remain native; close/reopen under mocked clock.
  await page.keyboard.press("Escape");
  await openPlan(page);
  const downloads = state.downloads;
  const signed = state.signed;
  await page.clock.fastForward(3601000);
  await expect(page.getByRole("dialog").getByRole("status")).toHaveText(
    "Plan opened",
  );
  await expect(
    page.locator(".dxf-stage .cad-render-surface canvas").first(),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Zoom in", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Fit to screen", exact: true })
    .click();
  expect(state.downloads).toBe(downloads);
  expect(state.signed).toBe(signed);
  await page.keyboard.press("Escape");
  await expect(page.locator(".cad-render-surface")).toHaveCount(0);
  await openPlan(page);
  expect(state.signed).toBe(signed + 1);
});

test("French preview closes during download and can be opened again", async ({
  page,
}) => {
  await fixture(page, false, "fr");
  let release = () => {};
  let fetching = false;
  const wait = new Promise<void>((resolve) => {
    release = resolve;
  });
  const pattern = "**/storage/v1/object/sign/project-files/fixture?*";
  await page.route(pattern, async (route) => {
    fetching = true;
    await wait;
    await route
      .fulfill({ contentType: "application/dxf", body: sample })
      .catch(() => {});
  });
  await page.goto(base);
  await page.getByRole("button", { name: "Tout refuser", exact: true }).click();
  await page
    .locator(".project-files")
    .getByRole("button", { name: "Ouvrir le plan", exact: true })
    .click();
  await expect.poll(() => fetching).toBe(true);
  await expect(page.getByRole("dialog").getByRole("status")).toHaveText(
    "Ouverture du plan…",
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Fermer", exact: true })
    .click();
  release();
  await page.unroute(pattern);
  await expect(page.locator(".cad-render-surface")).toHaveCount(0);
  await page
    .locator(".project-files")
    .getByRole("button", { name: "Ouvrir le plan", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("status")).toHaveText(
    "Plan ouvert",
    { timeout: 30000 },
  );
  await expect(
    page
      .getByRole("dialog")
      .getByRole("button", { name: "Agrandir", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Informations du plan", exact: true })
    .click();
  await expect(
    page.getByRole("dialog").getByText("Lecture seule · DXF", { exact: true }),
  ).toBeVisible();
});

test("saved plan supports drag pan and mobile pinch", async ({
  page,
  context,
  isMobile,
}) => {
  await fixture(page, false);
  await page.goto(base);
  await page.getByRole("button", { name: "Reject all", exact: true }).click();
  await openPlan(page);
  const canvas = page.locator(".dxf-stage .cad-render-surface canvas").first();
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("No canvas bounds");
  const before = (await canvas.screenshot()).toString("base64");
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  if (isMobile) {
    const cdp = await context.newCDPSession(page);
    const points = (distance: number) => [
      { x: x - distance, y, id: 1 },
      { x: x + distance, y, id: 2 },
    ];
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: points(30),
    });
    for (let distance = 35; distance <= 80; distance += 5)
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: points(distance),
      });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await cdp.detach();
  } else {
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 70, y + 40, { steps: 10 });
    await page.mouse.up();
  }
  await expect
    .poll(async () => (await canvas.screenshot()).toString("base64"))
    .not.toBe(before);
});
