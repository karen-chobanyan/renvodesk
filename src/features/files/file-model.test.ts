import { describe, expect, it } from "vitest";
import { canPreview, MAX_FILE_BYTES, validateFile } from "./file-model";

describe("file validation", () => {
  it("accepts supported case-insensitive extensions and enforces size boundaries", () => {
    expect(
      validateFile({
        name: "PLAN.PDF",
        size: MAX_FILE_BYTES,
        type: "application/pdf",
      }),
    ).toBeNull();
    expect(
      validateFile({
        name: "plan.pdf",
        size: MAX_FILE_BYTES + 1,
        type: "application/pdf",
      }),
    ).toBe("invalid");
    expect(
      validateFile({ name: "plan.pdf", size: 0, type: "application/pdf" }),
    ).toBe("invalid");
  });
  it("accepts recorded audio containers but rejects video disguised as audio", () => {
    for (const [name, type] of [
      ["note.webm", "audio/webm"],
      ["note.m4a", "audio/mp4"],
      ["note.ogg", "audio/ogg"],
    ]) {
      expect(validateFile({ name, size: 1024, type })).toBeNull();
      expect(canPreview(type)).toBe(true);
    }
    expect(
      validateFile({ name: "note.webm", size: 1024, type: "video/webm" }),
    ).toBe("invalid");
  });
  it("rejects active content, MIME mismatches and HEIC explicitly", () => {
    expect(validateFile({ name: "photo.heic", size: 20, type: "" })).toBe(
      "heic",
    );
    expect(
      validateFile({ name: "image.svg", size: 20, type: "image/svg+xml" }),
    ).toBe("invalid");
    expect(
      validateFile({ name: "image.png", size: 20, type: "text/html" }),
    ).toBe("invalid");
    expect(canPreview("text/html")).toBe(false);
    expect(canPreview("application/pdf")).toBe(true);
  });
});
