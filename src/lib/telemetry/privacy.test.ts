import { describe, expect, it } from "vitest";
import { CONSENT_AGE, pageName, readConsent, sanitizeError } from "./privacy";

describe("telemetry privacy boundaries", () => {
  it("requires explicit unexpired boolean consent", () => {
    const now = Date.now();
    const choice = {
      version: 1,
      analytics: true,
      diagnostics: false,
      savedAt: now,
    };
    expect(readConsent(JSON.stringify(choice), now)).toEqual(choice);
    for (const value of [
      null,
      "bad",
      "{}",
      JSON.stringify({ ...choice, analytics: "true" }),
      JSON.stringify({ ...choice, savedAt: now + 1 }),
      JSON.stringify({ ...choice, savedAt: now - CONSENT_AGE }),
    ])
      expect(readConsent(value, now)).toBeNull();
  });
  it("categorizes routes without IDs, queries, hashes or titles", () => {
    expect(
      pageName(
        "/workspace/company-secret/projects/customer-secret?tab=budget#access_token=secret",
      ),
    ).toBe("project");
    expect(
      pageName("/workspace/company/projects/project/estimates/private"),
    ).toBe("project_estimate");
    expect(pageName("/auth/callback?code=secret")).toBe("authentication");
    expect(pageName("/unknown/customer@example.com")).toBe("not_found");
    expect(pageName("/projects/private-demo")).toBe("demo");
  });
  it("rebuilds error reports from a strict allowlist", () => {
    const safe = sanitizeError(
      {
        type: undefined,
        event_id: "abc",
        message: "private",
        user: { email: "private@example.com" },
        request: { url: "https://example.com?secret" },
        breadcrumbs: [{ message: "private" }],
        extra: { password: "private" },
        contexts: { secret: { name: "private" } },
        exception: {
          values: [
            {
              type: "TypeError",
              value: "private@example.com",
              stacktrace: {
                frames: [
                  {
                    filename:
                      "https://renvodesk.com/assets/index-123.js?token=private",
                    lineno: 12,
                    vars: { secret: "private" },
                    context_line: "private",
                  },
                  {
                    filename:
                      "https://storage.example.com/private.pdf?token=private",
                  },
                ],
              },
            },
          ],
        },
      },
      "/workspace/private/projects/private",
    );
    const result = JSON.stringify(safe);
    expect(result).not.toMatch(
      /private|password|token|context_line|breadcrumbs/,
    );
    expect(safe?.exception?.values?.[0].stacktrace?.frames).toEqual([
      {
        filename: "https://renvodesk.com/assets/index-123.js",
        lineno: 12,
        colno: undefined,
        in_app: true,
      },
    ]);
    expect(safe?.tags?.page).toBe("project");
    expect(
      sanitizeError({ type: undefined, message: "private" }, "/"),
    ).toBeNull();
  });
});
