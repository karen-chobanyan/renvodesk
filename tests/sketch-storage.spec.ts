import { expect, test } from "@playwright/test";

const org = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  project = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  sketch = "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  uid = "11111111-1111-4111-8111-111111111111";
test("saved sketch route persists, reopens, restores history and restricts members", async ({
  page,
}) => {
  const user = {
    id: uid,
    aud: "authenticated",
    role: "authenticated",
    email: "sketch@example.test",
    email_confirmed_at: "2026-01-01T00:00:00Z",
    app_metadata: { provider: "email" },
    user_metadata: {},
    created_at: "2026-01-01T00:00:00Z",
  };
  const token = `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ sub: uid, role: "authenticated", exp: 4102444800 })).toString("base64url")}.test`;
  await page.addInitScript(
    ({ user, token }) =>
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
      ),
    { user, token },
  );
  let loseUpload = true;
  let role = "owner",
    losePublish = true;
  const sk = {
    organization_id: org,
    project_id: project,
    id: sketch,
    title: "Site plan",
    revision: 0,
    current_save_id: null as string | null,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  };
  const saves: {
    id: string;
    base_revision: number;
    title: string;
    revision: number | null;
    committed_at: string | null;
    scene_key: string;
    preview_key: string;
  }[] = [];
  const objects = new Map<string, Buffer>();
  await page.route(
    "https://oripsywzngftarbprlgk.supabase.co/**",
    async (route) => {
      const req = route.request(),
        url = new URL(req.url()),
        name = url.pathname.split("/").pop(),
        method = req.method();
      if (name === "user") return route.fulfill({ json: user });
      if (name === "organization_memberships")
        return route.fulfill({
          json:
            url.searchParams.get("select") === "role"
              ? { role }
              : [
                  {
                    organization_id: org,
                    organizations: {
                      id: org,
                      name: "Sketch company",
                      country: "BE",
                    },
                  },
                ],
        });
      if (name === "projects")
        return route.fulfill({
          json: {
            organization_id: org,
            id: project,
            name: "Test site",
            client_name: "Test client",
            city: "Brussels",
            address: "",
            status: "planning",
            revision: 1,
          },
        });
      if (name === "project_sketches") {
        if (method === "POST") {
          const body = req.postDataJSON();
          sk.id = body.id;
          sk.title = body.title;
          sk.revision = 0;
          sk.current_save_id = null;
          return route.fulfill({ json: sk });
        }
        return route.fulfill({ json: url.searchParams.has("id") ? sk : [sk] });
      }
      if (name === "sketch_saves") {
        if (method === "POST") {
          const body = req.postDataJSON();
          expect(body.organization_id).toBe(org);
          expect(body.project_id).toBe(project);
          expect(body.sketch_id).toBe(sk.id);
          if (saves.some((s) => s.id === body.id))
            return route.fulfill({ status: 409, json: { code: "23505" } });
          const path = `${org}/${project}/${body.sketch_id}/${body.id}`;
          const row = {
            ...body,
            revision: null,
            committed_at: null,
            scene_key: `${path}/scene.json`,
            preview_key: `${path}/preview.png`,
          };
          saves.push(row);
          return route.fulfill({ json: row });
        }
        const id = url.searchParams.get("id")?.replace("eq.", "");
        return route.fulfill({
          json: id
            ? saves.find((s) => s.id === id)
            : saves.filter((s) => s.revision !== null).reverse(),
        });
      }
      if (name === "publish_sketch") {
        const row = saves.find((s) => s.id === req.postDataJSON().p_save);
        if (!row) throw new Error("Missing save fixture");
        if (!row.committed_at) {
          expect(objects.has(row.scene_key)).toBe(true);
          expect(objects.has(row.preview_key)).toBe(true);
          expect(row.base_revision).toBe(sk.revision);
          row.revision = ++sk.revision;
          row.committed_at = "2026-09-20";
          sk.current_save_id = row.id;
          sk.title = row.title;
        }
        if (losePublish) {
          losePublish = false;
          return route.abort("failed");
        }
        return route.fulfill({ json: row.revision });
      }
      if (url.pathname.includes("/storage/v1/object/")) {
        const key = decodeURIComponent(
          url.pathname.split("/project-sketches/")[1],
        );
        if (method === "POST") {
          if (objects.has(key))
            return route.fulfill({
              status: 400,
              json: {
                error: "Duplicate",
                statusCode: "409",
                message: "already exists",
              },
            });
          const body = req.postDataBuffer();
          if (!body) throw new Error("Missing upload");
          const boundary = req.headers()["content-type"].split("boundary=")[1];
          const raw = body.toString("latin1");
          const filePart = raw
            .split(`--${boundary}`)
            .find((part) => part.includes("filename="));
          if (!filePart) throw new Error("Missing file");
          const bytes = Buffer.from(
            filePart.slice(filePart.indexOf("\r\n\r\n") + 4, -2),
            "latin1",
          );
          objects.set(key, bytes);
          if (loseUpload) {
            loseUpload = false;
            return route.abort("failed");
          }
          return route.fulfill({ json: { Key: key } });
        }
        const bytes = objects.get(key);
        return bytes
          ? route.fulfill({
              body: bytes,
              contentType: key.endsWith(".png")
                ? "image/png"
                : "application/json",
            })
          : route.fulfill({ status: 404, json: { message: "missing" } });
      }
      return route.fulfill({ json: [] });
    },
  );
  const path = `/workspace/${org}/projects/${project}/sketches/${sketch}`;
  await page.goto(path);
  await expect(page.locator(".excalidraw canvas").first()).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByRole("alert")).toContainText(
    "Enregistrement non confirmé",
    { timeout: 15000 },
  );
  await page.getByRole("button", { name: "Réessayer", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Enregistré");
  expect(saves).toHaveLength(1);
  expect(sk.revision).toBe(1);
  const png =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6mAAAAABJRU5ErkJggg==";
  const scene = {
    type: "excalidraw",
    version: 2,
    elements: [
      {
        id: "wall",
        type: "image",
        fileId: "asset",
        scale: [1, 1],
        status: "saved",
        x: 0,
        y: 0,
        width: 300,
        height: 160,
        isDeleted: false,
      },
    ],
    appState: { viewBackgroundColor: "#ffffff" },
    files: {
      asset: { id: "asset", mimeType: "image/png", dataURL: png, created: 1 },
    },
  };
  await page.locator(".sketch-import input").setInputFiles({
    name: "room.excalidraw",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(scene)),
  });
  await expect.poll(() => sk.revision).toBe(2);
  await expect(page.getByRole("status")).toHaveText("Enregistré");
  const current = saves.at(-1);
  if (!current) throw new Error("Missing current save");
  expect(
    JSON.parse(objects.get(current.scene_key)?.toString() ?? "null").elements[0]
      .id,
  ).toBe("wall");
  expect(
    JSON.parse(objects.get(current.scene_key)?.toString() ?? "null").files.asset
      .dataURL,
  ).toBe(png);
  await page.reload();
  await expect(page.getByRole("status")).toHaveText("Enregistré");
  await expect(
    page.getByRole("link", { name: "Version 2 · Site plan", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Version 1 · Site plan", exact: true })
    .click();
  await expect(page.getByRole("status")).toHaveText("Consultation uniquement");
  await page
    .getByRole("link", { name: "Utiliser cette version", exact: true })
    .click();
  await expect.poll(() => sk.revision).toBe(3);
  await expect(page.getByRole("status")).toHaveText("Enregistré");
  expect(
    JSON.parse(objects.get(saves.at(-1)?.scene_key ?? "")?.toString() ?? "null")
      .elements,
  ).toHaveLength(0);
  await page.screenshot({
    path: `/private/tmp/renvo-connected-sketch-${test.info().project.name}.png`,
    fullPage: true,
  });
  role = "member";
  await page.goto(path);
  await expect(page.getByRole("status")).toHaveText("Consultation uniquement");
  await expect(page.getByLabel("Nom du croquis")).toHaveAttribute(
    "readonly",
    "",
  );
  await expect(
    page.getByRole("button", { name: "Enregistrer", exact: true }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("link", { name: "Retour au projet", exact: true })
    .click();
  await expect(
    page.locator("#project-sketches .sketch-list-row"),
  ).toContainText("Site plan");
  await expect(page.locator("#project-sketches img")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Créer le croquis", exact: true }),
  ).toHaveCount(0);
  role = "owner";
  await page.reload();
  await page.locator("#project-sketches summary").click();
  await page.getByLabel("Nom du croquis", { exact: true }).fill("New kitchen");
  await page
    .getByRole("button", { name: "Créer le croquis", exact: true })
    .click();
  await expect(page.getByLabel("Nom du croquis", { exact: true })).toHaveValue(
    "New kitchen",
  );
  await expect(page.getByRole("status")).toHaveText("Enregistré");
});
