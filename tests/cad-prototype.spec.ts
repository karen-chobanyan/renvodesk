import { readFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";

async function pixels(page: Page) {
  const canvas = page.frameLocator("iframe").locator("canvas").first();
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
    let walls = 0,
      labels = 0,
      dimensions = 0;
    let dimensionLeft = target.width,
      dimensionRight = -1;
    // Exclude the UCS indicator in the bottom-left corner.
    for (let y = 10; y < target.height - 10; y++)
      for (let x = 10; x < target.width - 10; x++) {
        const ucs = x < target.width * 0.15 && y > target.height * 0.75;
        const i = (y * target.width + x) * 4,
          r = data[i],
          g = data[i + 1],
          b = data[i + 2];
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

test("local DXF renders geometry, text and dimensions; controls and reopen work", async ({
  page,
}, testInfo) => {
  const errors: string[] = [],
    external: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (
      /^https?:/.test(request.url()) &&
      new URL(request.url()).hostname !== "127.0.0.1"
    )
      external.push(request.url());
  });
  await page.goto("/cad-prototype.html");
  await expect(page.getByRole("heading", { name: "Plans DXF" })).toBeVisible();
  await page.getByRole("button", { name: "English", exact: true }).click();
  await page.getByRole("button", { name: "Open sample plan" }).click();
  await expect(page.getByRole("status")).toContainText("Plan opened", {
    timeout: 25000,
  });
  await expect
    .poll(async () => (await pixels(page)).walls)
    .toBeGreaterThan(200);
  const initial = await pixels(page);
  expect(initial.labels).toBeGreaterThan(100);
  expect(initial.dimensions).toBeGreaterThan(100);
  const walls = page.getByRole("checkbox", { name: "WALLS", exact: true });
  await walls.focus();
  await page.keyboard.press("Space");
  await expect(walls).not.toBeChecked();
  await expect
    .poll(async () => (await pixels(page)).walls)
    .toBeLessThan(initial.walls / 2);
  await page.keyboard.press("Space");
  await expect
    .poll(async () => (await pixels(page)).walls)
    .toBeGreaterThan(200);
  await page.getByRole("button", { name: "Zoom out", exact: true }).click();
  await expect
    .poll(
      async () => (await pixels(page)).dimensionWidth / initial.dimensionWidth,
    )
    .toBeGreaterThan(0.77);
  await expect
    .poll(
      async () => (await pixels(page)).dimensionWidth / initial.dimensionWidth,
    )
    .toBeLessThan(0.83);
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await expect
    .poll(async () =>
      Math.abs((await pixels(page)).dimensionWidth - initial.dimensionWidth),
    )
    .toBeLessThan(4);
  await page.getByRole("button", { name: "Fit to screen" }).click();
  await expect
    .poll(async () => (await pixels(page)).dimensions)
    .toBeGreaterThan(100);
  await page.screenshot({
    path: testInfo.outputPath("cad.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Close plan" }).click();
  await expect(page.locator("iframe")).toHaveCount(0);
  await page.getByRole("button", { name: "Open sample plan" }).click();
  await expect(page.getByRole("status")).toContainText("Plan opened", {
    timeout: 25000,
  });
  await expect
    .poll(async () => (await pixels(page)).walls)
    .toBeGreaterThan(200);
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});

test("invalid files recover, local DXF opens, close cancels loading", async ({
  page,
}) => {
  await page.goto("/cad-prototype.html");
  const input = page.getByLabel("Choisir un fichier DXF");
  for (const [name, buffer] of [
    ["plan.dwg", Buffer.from("not DWG")],
    ["broken.dxf", Buffer.from("broken")],
    ["large.dxf", Buffer.alloc(10 * 1024 * 1024 + 1)],
  ] as const) {
    await input.setInputFiles({
      name,
      mimeType: "application/octet-stream",
      buffer,
    });
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.locator("iframe")).toHaveCount(0);
  }
  await input.setInputFiles({
    name: "local.dxf",
    mimeType: "application/dxf",
    buffer: readFileSync("src/features/cad-prototype/sample.dxf"),
  });
  await expect(page.getByRole("status")).toContainText("Plan ouvert", {
    timeout: 25000,
  });
  await expect
    .poll(async () => (await pixels(page)).labels)
    .toBeGreaterThan(100);
  await page.getByRole("button", { name: "Ouvrir le plan exemple" }).click();
  await page.getByRole("button", { name: "Fermer le plan" }).click();
  await expect(page.locator("iframe")).toHaveCount(0);
  await expect(page.getByRole("status")).toContainText("Choisissez un plan");
});

test("pan and mobile pinch change the view", async ({
  page,
  context,
  isMobile,
}) => {
  await page.goto("/cad-prototype.html");
  await page.getByRole("button", { name: "Ouvrir le plan exemple" }).click();
  await expect(page.getByRole("status")).toContainText("Plan ouvert", {
    timeout: 25000,
  });
  const canvas = page.frameLocator("iframe").locator("canvas").first();
  await canvas.scrollIntoViewIfNeeded();
  await expect
    .poll(async () => (await pixels(page)).walls)
    .toBeGreaterThan(200);
  const box = await canvas.boundingBox();
  if (!box) throw new Error("No canvas bounds");
  const before = (await canvas.screenshot()).toString("base64");
  const x = box.x + box.width / 2,
    y = box.y + box.height / 2;
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
