import { describe, expect, it } from "vitest";
import {
  getImageFileFromDropEvent,
  getImageInsertPoint,
  getTextFromDropEvent,
  getTextFromPasteEvent,
  isImageFile,
  shouldLetPasteEventHandleImages,
} from "../src/image-import-service.js";

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

  it("extracts an image file from a drop event", () => {
    const image = { type: "image/jpeg" };
    const text = { type: "text/plain" };

    expect(getImageFileFromDropEvent({ dataTransfer: { files: [text, image] } })).toBe(image);
  });

  it("lets the browser paste event handle clipboard images", () => {
    expect(shouldLetPasteEventHandleImages({ hasImageOnClipboard: true, hasInternalClipboard: true })).toBe(true);
    expect(shouldLetPasteEventHandleImages({ hasImageOnClipboard: false, hasInternalClipboard: true })).toBe(false);
  });

  it("extracts plain text from paste and drop events", () => {
    expect(getTextFromPasteEvent({ clipboardData: { getData: () => "  hello  " } })).toBe("hello");
    expect(getTextFromDropEvent({ dataTransfer: { getData: () => "  world  " } })).toBe("world");
    expect(getTextFromPasteEvent({ clipboardData: { getData: () => "   " } })).toBe("");
  });
});
