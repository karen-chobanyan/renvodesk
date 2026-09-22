import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build, loadEnv } from "vite";

const temporary = path.resolve(".cache/landing-prerender");
try {
  await build({
    configFile: false,
    logLevel: "warn",
    esbuild: { jsx: "automatic" },
    build: {
      ssr: "src/features/landing/prerender.tsx",
      outDir: temporary,
      emptyOutDir: true,
      rollupOptions: { output: { entryFileNames: "render.mjs" } },
    },
  });
  const { renderLanding, renderPrivacy, landingHead, siteOrigin, sitemap } =
    await import(pathToFileURL(path.join(temporary, "render.mjs")).href);
  const origin = siteOrigin(
    process.env.SITE_URL ??
      loadEnv("production", process.cwd(), "SITE_").SITE_URL,
  );
  const template = await readFile("dist/app.html", "utf8").catch(() =>
    readFile("dist/index.html", "utf8"),
  );
  const manifest = JSON.parse(
    await readFile("dist/.vite/manifest.json", "utf8"),
  );
  const styles = new Set();
  const visited = new Set();
  function collect(key) {
    if (visited.has(key)) return;
    visited.add(key);
    const chunk = manifest[key];
    if (!chunk) throw new Error(`Missing manifest entry: ${key}`);
    for (const css of chunk.css ?? []) styles.add(css);
    for (const dependency of chunk.imports ?? []) collect(dependency);
  }
  collect("src/features/landing/landing-entry.tsx");
  const cssHead = [...styles]
    .map((css) => `<link rel="stylesheet" href="/${css}" />`)
    .join("\n");
  // Private/demo/auth routes must use this shell, not the public homepage fallback.
  await writeFile("dist/app.html", template);
  for (const locale of ["fr", "en"]) {
    const output = template
      .replace('<html lang="fr">', `<html lang="${locale}">`)
      .replace(/<title>[^<]*<\/title>/, "")
      .replace(/<meta name="(?:description|robots)"[^>]*\/>/g, "")
      .replace("</head>", `${landingHead(locale, origin)}\n${cssHead}\n</head>`)
      .replace(
        '<div id="root"></div>',
        `<div id="root" data-prerendered="${locale}">${renderLanding(locale)}</div>`,
      );
    if (!output.includes(`data-prerendered="${locale}"`))
      throw new Error("Prerender root not found");
    const file = locale === "fr" ? "dist/index.html" : "dist/en/index.html";
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, output);
  }
  for (const locale of ["fr", "en"]) {
    const title =
      locale === "fr" ? "Confidentialité — RenvoDesk" : "Privacy — RenvoDesk";
    const output = template
      .replace('<html lang="fr">', `<html lang="${locale}">`)
      .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
      .replace("</head>", `${cssHead}\n</head>`)
      .replace(
        '<div id="root"></div>',
        `<div id="root" data-prerendered="${locale}">${renderPrivacy(locale)}</div>`,
      );
    const file =
      locale === "fr"
        ? "dist/privacy/index.html"
        : "dist/en/privacy/index.html";
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, output);
  }
  await writeFile(
    "dist/robots.txt",
    `User-agent: *\nAllow: /\n${origin ? `Sitemap: ${origin}/sitemap.xml\n` : "# Preview build: HTML carries noindex. Set SITE_URL for production.\n"}`,
  );
  if (origin) await writeFile("dist/sitemap.xml", sitemap(origin));
  else await rm("dist/sitemap.xml", { force: true });
  // The HTML has noindex unless an explicit production origin is configured.
  console.log(
    `Prerendered FR/EN landing pages (${origin ?? "preview: noindex, no sitemap"}).`,
  );
} finally {
  await rm(temporary, { recursive: true, force: true });
}
