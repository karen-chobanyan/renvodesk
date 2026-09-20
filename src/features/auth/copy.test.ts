import { describe, expect, it } from "vitest";
import { authErrorKey } from "./copy";

describe("authentication error messages", () => {
  it("maps expected failures without displaying raw server messages", () => {
    expect(
      authErrorKey({ code: "invalid_credentials", message: "internal" }),
    ).toBe("invalid");
    expect(authErrorKey({ code: "email_not_confirmed" })).toBe("unconfirmed");
    expect(authErrorKey({ status: 429 })).toBe("rateLimit");
    expect(authErrorKey({ name: "AuthRetryableFetchError" })).toBe("network");
    expect(authErrorKey(new Error("internal details"))).toBe("generic");
  });
});
