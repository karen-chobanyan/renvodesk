import { expect, test } from "@playwright/test";

const org = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  project = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  id = "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  uid = "11111111-1111-4111-8111-111111111111";
for (const decision of ["accepted", "declined"] as const)
  test(`estimate ${decision}: retry, freeze, snapshot PDF and conflict`, async ({
    page,
  }) => {
    const user = {
      id: uid,
      aud: "authenticated",
      role: "authenticated",
      email: "workflow@example.test",
      email_confirmed_at: "2026-01-01T00:00:00Z",
      app_metadata: { provider: "email" },
      user_metadata: {},
      created_at: "2026-01-01T00:00:00Z",
    };
    const encode = (v: unknown) =>
      Buffer.from(JSON.stringify(v)).toString("base64url");
    const token = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: uid, role: "authenticated", exp: 4102444800 })}.test`;
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
    const record = {
      organization_id: org,
      project_id: project,
      id,
      title: "Renovation estimate",
      status: "draft",
      currency: "EUR",
      revision: 1,
      total_cents: 2468,
      lines: [
        {
          id: "line",
          description: "Paint walls",
          quantity: "2",
          price: "12.34",
          unit: "fixed",
        },
      ],
      sent_snapshot: null as Record<string, unknown> | null,
    };
    const events: {
      id: string;
      to_status: string;
      note: string;
      recorded_at: string;
      from_revision: number;
    }[] = [];
    let lose = true,
      conflict = false,
      contactReads = 0;
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
                ? { role: "owner" }
                : [
                    {
                      organization_id: org,
                      organizations: {
                        id: org,
                        name: "Company now",
                        country: "BE",
                      },
                    },
                  ],
          });
        if (name === "estimates") return route.fulfill({ json: record });
        if (name === "estimate_events")
          return route.fulfill({ json: [...events].reverse() });
        if (name === "projects" || name === "organizations") {
          contactReads++;
          return route.fulfill({ json: { name: "Changed live details" } });
        }
        if (name === "record_estimate_event") {
          const body = req.postDataJSON();
          expect(body.p_org).toBe(org);
          expect(body.p_project).toBe(project);
          expect(body.p_estimate).toBe(id);
          if (conflict)
            return route.fulfill({
              status: 409,
              json: { code: "40001", message: "Changed" },
            });
          if (!events.some((e) => e.id === body.p_request)) {
            expect(body.p_revision).toBe(record.revision);
            if (body.p_status === "sent")
              record.sent_snapshot = {
                title: record.title,
                revision: record.revision,
                total_cents: record.total_cents,
                lines: record.lines,
                company: {
                  name: "Frozen company",
                  country: "BE",
                  contact_address: "Old address",
                  contact_email: "old@example.test",
                  contact_phone: "",
                },
                project: {
                  name: "Frozen site",
                  client_name: "Original client",
                  address: "Original address",
                  city: "Brussels",
                },
              };
            events.push({
              id: body.p_request,
              to_status: body.p_status,
              note: body.p_note,
              recorded_at: "2026-09-20T10:00:00Z",
              from_revision: record.revision,
            });
            record.status = body.p_status;
            record.revision++;
          }
          if (lose) {
            lose = false;
            return route.abort("failed");
          }
          return route.fulfill({ json: record });
        }
        return route.fulfill({ json: [] });
      },
    );
    page.on("dialog", (dialog) => dialog.accept());
    await page.goto(`/workspace/${org}/projects/${project}/estimates/${id}`);
    await page.getByRole("button", { name: "Tout refuser" }).click();
    await page
      .getByLabel("Référence de l’échange")
      .fill("Email sent externally, reference 123");
    await page
      .getByRole("button", { name: "Marquer comme envoyé", exact: true })
      .click();
    await expect(page.getByRole("alert")).toContainText("Action non confirmée");
    await expect(
      page.getByLabel("Titre du devis", { exact: true }),
    ).toBeDisabled();
    await page.getByRole("button", { name: "Réessayer", exact: true }).click();
    await expect(page.locator(".eyebrow").last()).toHaveText(
      "Envoi enregistré",
    );
    expect(events).toHaveLength(1);
    await page
      .getByLabel("Référence de l’échange")
      .fill("Customer email, reference 456");
    await page
      .getByRole("button", {
        name:
          decision === "accepted"
            ? "Enregistrer l’acceptation"
            : "Enregistrer le refus",
        exact: true,
      })
      .click();
    await expect(page.locator(".eyebrow").last()).toHaveText(
      decision === "accepted" ? "Acceptation enregistrée" : "Refus enregistré",
    );
    await page.reload();
    await expect(
      page.getByLabel("Titre du devis", { exact: true }),
    ).toBeDisabled();
    await expect(page.locator(".estimate-event-list li")).toHaveCount(2);
    const download = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Télécharger le PDF", exact: true })
      .click();
    const file = await download;
    expect(file.suggestedFilename()).toBe("devis-Renovation-estimate-r1.pdf");
    await file.saveAs(
      `/private/tmp/workflow-${decision}-${test.info().project.name}.pdf`,
    );
    expect(contactReads).toBe(0);
    await page.screenshot({
      path: `/private/tmp/workflow-${decision}-${test.info().project.name}.png`,
      fullPage: true,
    });
    record.status = "draft";
    record.sent_snapshot = null;
    record.revision = 10;
    conflict = true;
    await page.reload();
    await page.getByLabel("Référence de l’échange").fill("Stale action");
    await page
      .getByRole("button", { name: "Marquer comme envoyé", exact: true })
      .click();
    await expect(page.getByRole("alert")).toContainText("Le devis a changé");
    await expect(
      page.getByLabel("Titre du devis", { exact: true }),
    ).toBeDisabled();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
