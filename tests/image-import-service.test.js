import { describe, expect, it } from "vitest";
import { getImageInsertPoint, isImageFile } from "../src/image-import-service.js";

describe("image import service", () => {
  it("recognizes image files", () => {
    expect(isImageFile({ type: "image/png" })).toBe(true);
    expect(isImageFile({ type: "text/plain" })).toBe(false);
    expect(isImageFile(null)).toBe(false);
  });

  it("uses the last pointer point when available", () => {
    expect(getImageInsertPoint({ x: 120, y: 80 }, { width: 800, height: 600 }, { x: 0, y: 0, scale: 1 })).toEqual({
      x: 120,
      y: 80,
    });
  });

  it("falls back to viewport center in world coordinates", () => {
    expect(getImageInsertPoint(null, { width: 800, height: 600 }, { x: 100, y: 50, scale: 2 })).toEqual({
      x: 150,
      y: 125,
    });
  });
});
