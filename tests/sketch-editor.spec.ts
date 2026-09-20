import { expect, test } from "@playwright/test";

test("Excalidraw imports images, autosaves, retries and blocks conflicts", async ({
  page,
}) => {
  await page.route("**/sketch-harness", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<html><head><meta name="viewport" content="width=device-width, initial-scale=1"/></head><body><div id="root"></div><script type="module">import RefreshRuntime from '/@react-refresh'; RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;await import('/tests/fixtures/sketch-harness.tsx');</script></body></html>`,
    }),
  );
  await page.goto("/sketch-harness");
  await expect(page.locator(".excalidraw canvas").first()).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByRole("status")).toHaveText("Saved", {
    timeout: 20000,
  });
  const png =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6mAAAAABJRU5ErkJggg==";
  const scene = {
    type: "excalidraw",
    version: 2,
    elements: [
      {
        id: "photo",
        type: "image",
        x: 0,
        y: 0,
        width: 120,
        height: 100,
        fileId: "asset",
        isDeleted: false,
        version: 1,
        versionNonce: 1,
        seed: 1,
        scale: [1, 1],
        status: "saved",
        angle: 0,
        strokeColor: "#000000",
        backgroundColor: "transparent",
        fillStyle: "solid",
        strokeWidth: 1,
        strokeStyle: "solid",
        roughness: 0,
        opacity: 100,
        groupIds: [],
        frameId: null,
        roundness: null,
        boundElements: null,
        updated: 1,
        link: null,
        locked: false,
      },
    ],
    appState: { viewBackgroundColor: "#ffffff" },
    files: {
      asset: { id: "asset", mimeType: "image/png", dataURL: png, created: 1 },
    },
  };
  await page.locator(".sketch-import input").setInputFiles({
    name: "photo.excalidraw",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(scene)),
  });
  await expect(page.getByRole("status")).toHaveText("Saved", {
    timeout: 20000,
  });
  const scenes = await page.evaluate(() =>
    (
      window as unknown as { sketchHarness: { saves: { scene: string }[] } }
    ).sketchHarness.saves.map((s) => JSON.parse(s.scene)),
  );
  expect(scenes.at(-1).files.asset.dataURL).toBe(png);
  await page.evaluate(() => {
    (
      window as unknown as { sketchHarness: { fail: boolean } }
    ).sketchHarness.fail = true;
  });
  await page.getByLabel("Sketch name").fill("Updated site sketch");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Save not confirmed");
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Saved");
  await page.evaluate(() => {
    (
      window as unknown as { sketchHarness: { conflict: boolean } }
    ).sketchHarness.conflict = true;
  });
  await page.getByLabel("Sketch name").fill("Conflicting sketch");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Another version was saved",
  );
  await expect(
    page.getByRole("button", { name: "Save", exact: true }),
  ).toBeDisabled();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export .excalidraw" }).click();
  expect((await download).suggestedFilename()).toBe(
    "Conflicting sketch.excalidraw",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `/private/tmp/renvo-sketch-editor-${test.info().project.name}.png`,
    fullPage: true,
  });
});
