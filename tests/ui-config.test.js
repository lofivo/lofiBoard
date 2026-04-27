import { describe, expect, it } from "vitest";
import { formatShortcutLabel, toolButtonsMarkup } from "../src/ui-config.js";

describe("ui config", () => {
  it("formats tooltip labels with shortcuts", () => {
    expect(formatShortcutLabel({ label: "选择", shortcut: "V" })).toBe("选择 (V)");
    expect(formatShortcutLabel({ label: "椭圆" })).toBe("椭圆");
  });

  it("renders tool tooltip text with shortcuts", () => {
    const markup = toolButtonsMarkup();

    expect(markup).toContain("选择 (V)");
    expect(markup).toContain("平移 (H)");
    expect(markup).toContain("画笔 (B)");
    expect(markup).toContain("图形 (R / L / A)");
    expect(markup).not.toContain("套索");
  });
});
