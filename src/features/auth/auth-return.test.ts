import { describe, expect, it } from "vitest";
import { authReturn } from "./auth-return";

describe("invitation login return", () => {
  it("preserves only a valid invitation route", () => {
    expect(
      authReturn("?next=%2Finvite%2Faaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"),
    ).toBe("/invite/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  });
  it("rejects external, protocol-relative and unrelated destinations", () => {
    for (const next of [
      "https://example.test",
      "//example.test",
      "/workspace?company=arbitrary",
      "/invite/invalid",
      "/invite/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/../login",
    ]) {
      expect(authReturn(`?next=${encodeURIComponent(next)}`)).toBe(
        "/workspace",
      );
    }
  });
});
