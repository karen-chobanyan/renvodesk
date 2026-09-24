import { describe, expect, it } from "vitest";
import {
  formatStorageBytes,
  quotaErrorCode,
  storageLevel,
} from "./storage-model";

describe("storage usage display", () => {
  it("uses decimal bytes and localized units", () => {
    expect(formatStorageBytes(1_000_000_000, "en")).toBe("1 GB");
    expect(formatStorageBytes(1_000_000_000, "fr")).toBe("1 Go");
    expect(formatStorageBytes(1_500_000, "en")).toBe("1.5 MB");
  });
  it("includes pending reservations at warning thresholds", () => {
    expect(storageLevel({ limit: 1000, used: 799, reserved: 0 })).toBe(
      "normal",
    );
    expect(storageLevel({ limit: 1000, used: 799, reserved: 1 })).toBe("near");
    expect(storageLevel({ limit: 1000, used: 900, reserved: 50 })).toBe(
      "critical",
    );
    expect(storageLevel({ limit: 1000, used: 900, reserved: 100 })).toBe(
      "full",
    );
  });
  it("recognizes server quota errors", () => {
    expect(quotaErrorCode({ code: "PZ101" })).toBe("PZ101");
    expect(quotaErrorCode({ code: "PZ102" })).toBe("PZ102");
    expect(quotaErrorCode({ code: "42501" })).toBeNull();
  });
});
