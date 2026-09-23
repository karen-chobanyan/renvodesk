import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { chromium } from "@playwright/test";

// Verify the emitted pages without relying on a hosting provider's SPA fallback.
const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, "http://localhost").pathname;
  const file = path.resolve(
    "dist",
    `.${pathname.endsWith("/") ? `${pathname}index.html` : pathname}`,
  );
  if (!file.startsWith(`${path.resolve("dist")}/`)) {
    response.writeHead(403).end();
    return;
  }
  try {
    const body = await readFile(file);
    const mime = {
      ".html": "text/html",
      ".js": "text/javascript",
      ".css": "text/css",
      ".jpg": "image/jpeg",
    }[path.extname(file)];
    response
      .writeHead(200, { "Content-Type": mime ?? "application/octet-stream" })
      .end(body);
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
try {
  for (const locale of ["fr", "en"]) {
    const route = locale === "fr" ? "/" : "/en/";
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(base + route);
    assert.equal(await page.locator("html").getAttribute("lang"), locale);
    assert.equal(await page.locator("h1").count(), 1);
    assert.ok((await page.locator("h1").innerText()).length > 20);
    assert.ok(await page.locator('a[href="/signup"]').count());
    await page.locator("summary").first().click();
    assert.equal(
      await page.locator("details").first().getAttribute("open"),
      "",
    );
    const robots = await page
      .locator('meta[name="robots"]')
      .getAttribute("content");
    const canonical = page.locator('link[rel="canonical"]');
    if (process.env.SITE_URL) {
      assert.ok(robots.startsWith("index,"));
      assert.equal(
        await canonical.getAttribute("href"),
        process.env.SITE_URL + route,
      );
      assert.equal(await page.locator("link[hreflang]").count(), 3);
    } else {
      assert.ok(robots.startsWith("noindex,"));
      assert.equal(await canonical.count(), 0);
    }
    await context.close();
    const hydrated = await browser.newPage();
    const errors = [];
    hydrated.on("pageerror", (error) => errors.push(error.message));
    hydrated.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await hydrated.goto(base + route);
    await hydrated.locator('[aria-pressed="false"]').click();
    assert.equal(await hydrated.locator('[aria-pressed="true"]').count(), 1);
    assert.deepEqual(errors, []);
    await hydrated.close();
  }
  for (const locale of ["fr", "en"]) {
    for (const kind of ["terms", "privacy"]) {
      const context = await browser.newContext({ javaScriptEnabled: false });
      const page = await context.newPage();
      const route = `${locale === "en" ? "/en" : ""}/${kind}/`;
      const response = await page.goto(base + route);
      assert.equal(response.status(), 200);
      assert.equal(await page.locator("h1").count(), 1);
      assert.ok((await page.locator(".legal-body section").count()) >= 13);
      assert.equal(await page.locator("html").getAttribute("lang"), locale);
      assert.ok(
        (await page.locator('meta[name="description"]').getAttribute("content"))
          .length > 50,
      );
      await context.close();
      const hydrated = await browser.newPage();
      const errors = [];
      hydrated.on("pageerror", (error) => errors.push(error.message));
      hydrated.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      await hydrated.goto(base + route);
      await hydrated.locator('.legal-contents a[href="#operator"]').click();
      assert.deepEqual(errors, []);
      await hydrated.close();
    }
  }
  const shell = await readFile("dist/app.html", "utf8");
  assert.match(shell, /noindex, nofollow/);
  assert.ok(!shell.includes("<h1"));
  if (process.env.SITE_URL) {
    const sitemap = await readFile("dist/sitemap.xml", "utf8");
    assert.equal((sitemap.match(/<loc>/g) ?? []).length, 2);
    assert.ok(sitemap.includes(`${process.env.SITE_URL}/en/`));
  }
  console.log(
    "FR/EN static content, no-JavaScript FAQ, metadata, hydration and private shell passed.",
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
