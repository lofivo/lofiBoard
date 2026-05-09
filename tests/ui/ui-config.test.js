import { describe, expect, it } from "vitest";
import { renderShell } from "../../src/app/app-shell.js";
import { formatShortcutLabel, toolButtonsMarkup } from "../../src/ui/ui-config.js";

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

  it("renders brush-specific controls in the property panel", () => {
    const markup = renderShell();

    expect(markup).toContain("data-control=\"brush-opacity\"");
    expect(markup).toContain("data-control=\"brush-smoothing\"");
    expect(markup).toContain("data-control=\"brush-cap\"");
    expect(markup).toContain("data-control=\"brush-style\"");
  });
});
