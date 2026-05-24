import { describe, expect, it } from "vitest";
import {
  hasFontStyle,
  hasTextDecoration,
  toggleFontStyleToken,
  toggleTextDecorationToken,
} from "../../src/app/text-style-tokens.js";

describe("text style tokens", () => {
  it("reads font style and text decoration tokens", () => {
    expect(hasFontStyle("bold italic", "bold")).toBe(true);
    expect(hasFontStyle("normal", "bold")).toBe(false);
    expect(hasTextDecoration("underline line-through", "line-through")).toBe(true);
    expect(hasTextDecoration("none", "underline")).toBe(false);
  });

  it("toggles font style tokens with normal fallback", () => {
    expect(toggleFontStyleToken("bold", "italic")).toBe("bold italic");
    expect(toggleFontStyleToken("bold italic", "bold")).toBe("italic");
    expect(toggleFontStyleToken("bold", "bold")).toBe("normal");
  });

  it("toggles text decoration tokens with empty fallback", () => {
    expect(toggleTextDecorationToken("underline", "line-through")).toBe("underline line-through");
    expect(toggleTextDecorationToken("underline line-through", "underline")).toBe("line-through");
    expect(toggleTextDecorationToken("underline", "underline")).toBe("");
  });
});
