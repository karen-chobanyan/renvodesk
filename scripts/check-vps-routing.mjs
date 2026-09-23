import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const binary = process.env.CADDY_BIN || "caddy";
const dir = await mkdtemp(path.join(tmpdir(), "renvodesk-routing-"));
const config = (await readFile("deploy/Caddyfile", "utf8"))
  .replace(/^www\.renvodesk\.com \{[\s\S]*?\}\n\n/, "")
  .replace("renvodesk.com {", "http://127.0.0.1:4187 {")
  .replace("/var/www/renvodesk/current", path.resolve("dist"));
await writeFile(
  path.join(dir, "Caddyfile"),
  `{\n admin off\n auto_https off\n}\n${config}`,
);
const child = spawn(
  binary,
  ["run", "--config", path.join(dir, "Caddyfile"), "--adapter", "caddyfile"],
  {
    stdio: ["ignore", "ignore", "pipe"],
    env: { ...process.env, XDG_DATA_HOME: dir, XDG_CONFIG_HOME: dir },
  },
);
let error = "";
child.stderr.on("data", (data) => {
  error += data;
});
child.on("error", (e) => {
  error += e.message;
});
try {
  let ready = false;
  for (let i = 0; i < 50; i++) {
    try {
      await fetch("http://127.0.0.1:4187/");
      ready = true;
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  assert.ok(ready, error);
  for (const route of [
    "/",
    "/en/",
    "/privacy/",
    "/en/privacy/",
    "/terms/",
    "/en/terms/",
  ]) {
    const response = await fetch(`http://127.0.0.1:4187${route}`);
    assert.equal(response.status, 200, route);
    assert.match(await response.text(), /<h1/);
  }
  for (const route of [
    "/en",
    "/privacy",
    "/en/privacy",
    "/terms",
    "/en/terms",
  ]) {
    const response = await fetch(`http://127.0.0.1:4187${route}`, {
      redirect: "manual",
    });
    assert.equal(response.status, 308, route);
    assert.equal(response.headers.get("location"), `${route}/`);
  }
  for (const route of [
    "/signup",
    "/auth/callback?code=secret",
    "/workspace/org/projects/project?tab=activity",
    "/workspace/org/projects/project/estimates/estimate",
  ]) {
    const response = await fetch(`http://127.0.0.1:4187${route}`);
    assert.equal(response.status, 200, route);
    assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow");
    const html = await response.text();
    assert.match(html, /noindex/);
    assert.ok(!html.includes("<h1"), route);
  }
  for (const route of [
    "/unknown",
    "/assets/missing.js",
    "/.vite/manifest.json",
    "/app.html",
    "/index.html",
    "/.env",
    "/assets/private.js.map",
  ]) {
    assert.equal(
      (await fetch(`http://127.0.0.1:4187${route}`)).status,
      404,
      route,
    );
  }
  console.log(
    "Caddy public pages, privacy redirects, private SPA routes and real 404s passed.",
  );
} finally {
  child.kill("SIGTERM");
  await new Promise((resolve) => child.once("close", resolve));
  await rm(dir, { recursive: true, force: true });
}
