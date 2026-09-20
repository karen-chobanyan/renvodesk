import { describe, expect, it } from "vitest";
import { emptyScene, normalizeScene } from "./sketch-model";

const rectangle = {
  id: "room",
  type: "rectangle",
  x: 0,
  y: 0,
  width: 200,
  height: 150,
  link: "https://example.test",
};
const image = {
  id: "photo",
  type: "image",
  x: 0,
  y: 0,
  width: 10,
  height: 10,
  fileId: "asset",
};
const asset = {
  id: "asset",
  mimeType: "image/png",
  dataURL: "data:image/png;base64,aGVsbG8=",
  created: 1,
};
describe("sketch bundles", () => {
  it("round-trips referenced image bytes with the scene", () => {
    const scene = normalizeScene({
      ...emptyScene(),
      elements: [rectangle, image],
      files: { asset },
    });
    const loaded = normalizeScene(JSON.parse(JSON.stringify(scene)));
    expect(loaded.files.asset.dataURL).toBe(asset.dataURL);
    expect(loaded.elements[0].link).toBeNull();
  });
  it("drops deleted shapes and unreferenced images", () => {
    const scene = normalizeScene({
      ...emptyScene(),
      elements: [{ ...image, isDeleted: true }],
      files: { asset },
    });
    expect(scene.elements).toEqual([]);
    expect(scene.files).toEqual({});
  });
  it("rejects missing images, remote image URLs and SVG", () => {
    expect(() =>
      normalizeScene({ ...emptyScene(), elements: [image] }),
    ).toThrow();
    for (const dataURL of [
      "https://example.test/photo.png",
      "data:image/svg+xml;base64,aGVsbG8=",
    ])
      expect(() =>
        normalizeScene({
          ...emptyScene(),
          elements: [image],
          files: { asset: { ...asset, dataURL } },
        }),
      ).toThrow();
  });
  it("rejects iframe elements and nonfinite coordinates", () => {
    for (const element of [
      { ...rectangle, type: "embeddable" },
      { ...rectangle, x: Infinity },
    ])
      expect(() =>
        normalizeScene({ ...emptyScene(), elements: [element] }),
      ).toThrow();
  });
  it("enforces element count and bundle size", () => {
    expect(() =>
      normalizeScene({
        ...emptyScene(),
        elements: Array(2001).fill(rectangle),
      }),
    ).toThrow();
    expect(() =>
      normalizeScene({
        ...emptyScene(),
        elements: [{ ...rectangle, text: "a".repeat(8 * 1024 * 1024) }],
      }),
    ).toThrow();
  });
});
