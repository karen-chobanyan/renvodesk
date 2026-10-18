import { expect, type Page, test } from "@playwright/test";

async function setup(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("renvodesk-locale", "en");
    localStorage.setItem("renvodesk-locale-source", "manual");
  });
  await page.route("**/settings-harness", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<html><head><meta name="viewport" content="width=device-width, initial-scale=1"/></head><body><div id="root"></div><script type="module">import RefreshRuntime from '/@react-refresh'; RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;await import('/tests/fixtures/settings-harness.tsx');</script></body></html>`,
    }),
  );
  const state = {
    record: {
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      name: "Atelier des Tilleuls",
      country: "BE",
      default_language: "fr",
      settings_revision: 1,
      contact_revision: 1,
      contact_address: "12 rue des Tilleuls",
      contact_email: "office@example.test",
      contact_phone: "+32 2 555 01 02",
    },
    failSave: false,
    conflict: false,
    failRead: false,
    failStorage: false,
    saves: [] as { revision: string | null; body: Record<string, unknown> }[],
    reads: 0,
  };
  await page.route("**/rest/v1/organizations?**", async (route) => {
    const url = new URL(route.request().url());
    expect(url.searchParams.get("id")).toBe(`eq.${state.record.id}`);
    if (route.request().method() === "PATCH") {
      const body = route.request().postDataJSON();
      const key = body.contact_revision
        ? "contact_revision"
        : "settings_revision";
      state.saves.push({ revision: url.searchParams.get(key), body });
      expect(body).not.toHaveProperty(
        key === "contact_revision" ? "settings_revision" : "contact_revision",
      );
      if (state.failSave) {
        await route.fulfill({ status: 500, json: { message: "Unavailable" } });
        return;
      }
      if (
        state.conflict ||
        url.searchParams.get(key) !== `eq.${state.record[key]}`
      ) {
        await route.fulfill({ json: [] });
        return;
      }
      state.record = { ...state.record, ...body };
    } else {
      state.reads++;
      if (state.failRead) {
        await route.fulfill({ status: 500, json: { message: "Unavailable" } });
        return;
      }
    }
    await route.fulfill({ json: [state.record] });
  });
  await page.route("**/rest/v1/rpc/read_storage_usage", (route) =>
    state.failStorage
      ? route.fulfill({ status: 500, json: { message: "Unavailable" } })
      : route.fulfill({
          json: {
            account_limit_bytes: 1000000000,
            account_used_bytes: 900000000,
            account_reserved_bytes: 40000000,
            workspace_limit_bytes: 1000000000,
            workspace_used_bytes: 100000000,
            workspace_reserved_bytes: 40000000,
          },
        }),
  );
  await page.goto("/settings-harness");
  await expect(page.getByLabel("Company address")).toBeVisible();
  return state;
}

test("settings save independently, cancel and retain drafts during background updates", async ({
  page,
}) => {
  const state = await setup(page);
  const contact = page.getByRole("region", {
    name: "Document contact details",
  });
  const prefs = page.getByRole("region", { name: "Workspace preferences" });
  await expect(
    contact.getByRole("button", { name: "Save contact details" }),
  ).toBeDisabled();
  await expect(
    prefs.getByRole("button", { name: "Save preferences" }),
  ).toBeDisabled();
  await expect(page.getByLabel("Phone")).toHaveAttribute("type", "tel");
  await expect(page.getByLabel("Company address")).toHaveJSProperty(
    "tagName",
    "TEXTAREA",
  );
  await page
    .getByLabel("Company address")
    .fill("25 rue du Parc\n1000 Bruxelles");
  await page.getByLabel("Company country").selectOption("NL");
  await prefs.getByRole("button", { name: "Save preferences" }).click();
  await expect(prefs.getByRole("status")).toHaveText("Preferences saved.");
  await expect(contact.getByRole("status")).toHaveText("Unsaved changes");
  await expect(page.getByLabel("Company address")).toHaveValue(
    "25 rue du Parc\n1000 Bruxelles",
  );
  state.record = {
    ...state.record,
    contact_address: "Remote address",
    contact_revision: 2,
  };
  await page.getByRole("button", { name: "Background refresh" }).click();
  await expect.poll(() => state.reads).toBeGreaterThan(1);
  await contact.getByRole("button", { name: "Save contact details" }).click();
  await expect(contact.getByRole("alert")).toContainText(
    "These settings changed",
  );
  expect(state.saves.at(-1)?.revision).toBe("eq.1");
  page.once("dialog", (dialog) => dialog.dismiss());
  await contact
    .getByRole("button", { name: "Reload and replace my fields" })
    .click();
  await expect(page.getByLabel("Company address")).toHaveValue(
    "25 rue du Parc\n1000 Bruxelles",
  );
  state.failRead = true;
  page.once("dialog", (dialog) => dialog.accept());
  await contact
    .getByRole("button", { name: "Reload and replace my fields" })
    .click();
  await expect(
    contact.getByText("Could not reload. Your changes are preserved."),
  ).toBeVisible();
  await expect(page.getByLabel("Company address")).toHaveValue(
    "25 rue du Parc\n1000 Bruxelles",
  );
  await expect(
    contact.getByRole("button", { name: "Save contact details" }),
  ).toBeDisabled();
  state.failRead = false;
  page.once("dialog", (dialog) => dialog.accept());
  await contact
    .getByRole("button", { name: "Reload and replace my fields" })
    .click();
  await expect(page.getByLabel("Company address")).toHaveValue(
    "Remote address",
  );
  await expect(page.getByLabel("Company address")).toBeFocused();
  await page.getByLabel("Company address").fill("New address");
  await contact.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByLabel("Company address")).toHaveValue(
    "Remote address",
  );
  await expect(
    contact.getByRole("button", { name: "Save contact details" }),
  ).toBeDisabled();
  await expect(page.getByLabel("Company address")).toBeFocused();
  await page.getByLabel("Phone").fill("+32 2 555 04 05");
  state.failSave = true;
  await contact.getByRole("button", { name: "Save contact details" }).click();
  await expect(contact.getByRole("alert")).toContainText("Save not confirmed");
  await expect(page.getByLabel("Phone")).toHaveValue("+32 2 555 04 05");
  state.failSave = false;
  await contact.getByRole("button", { name: "Save contact details" }).click();
  await expect(contact.getByRole("status")).toHaveText(
    "Contact details saved.",
  );
  expect(state.saves.at(-1)?.revision).toBe("eq.2");
});

test("settings warn once for two dirty forms and guard links, history and reload", async ({
  page,
}) => {
  await setup(page);
  await page
    .getByRole("navigation", { name: "Related settings" })
    .getByRole("link", { name: /^Team/ })
    .click();
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await page.getByLabel("Phone").fill("+32 2 555 05 05");
  await page.getByLabel("Company country").selectOption("FR");
  let dialogs = 0;
  page.on("dialog", async (dialog) => {
    dialogs++;
    await dialog.dismiss();
  });
  await page
    .getByRole("link", { name: "Choose my language in account settings" })
    .click();
  await expect(page).toHaveURL(/settings-harness$/);
  expect(dialogs).toBe(1);
  await page.evaluate(() => history.back());
  await expect.poll(() => dialogs).toBe(2);
  await expect(page).toHaveURL(/settings-harness$/);
  await page.evaluate(() => location.reload());
  await expect.poll(() => dialogs).toBe(3);
  await expect(page.getByLabel("Phone")).toHaveValue("+32 2 555 05 05");
  page.removeAllListeners("dialog");
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("link", { name: "Choose my language in account settings" })
    .click();
  await expect(page).toHaveURL(/workspace\/account$/);
});

test("settings storage refresh recovers and page fits desktop and mobile", async ({
  page,
}) => {
  const state = await setup(page);
  const storage = page.getByRole("region", { name: "Storage", exact: true });
  await expect(storage.getByRole("progressbar").first()).toHaveAttribute(
    "aria-label",
    "This company",
  );
  await expect(storage).toContainText("40 MB reserved for incomplete uploads");
  state.failStorage = true;
  await storage.getByRole("button", { name: "Refresh storage" }).click();
  await expect(storage.getByRole("alert")).toContainText(
    "Could not load storage usage",
  );
  await expect(storage.getByRole("progressbar")).toHaveCount(2);
  state.failStorage = false;
  await storage.getByRole("button", { name: "Refresh storage" }).click();
  await expect(storage.getByRole("alert")).toHaveCount(0);
  await expect(storage).toContainText("Storage refreshed.");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByLabel("Contact email").focus();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Phone")).toBeFocused();
  await expect(page.getByRole("heading", { name: "Subscription" })).toHaveCount(
    0,
  );
});
