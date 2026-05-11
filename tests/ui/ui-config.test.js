import { describe, expect, it } from "vitest";
import { renderShell } from "../../src/app/app-shell.js";
import { formatShortcutLabel, structurePanelMarkup, toolButtonsMarkup } from "../../src/ui/ui-config.js";
import { getStructureItem } from "../../src/structures/structure-templates.js";

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
    expect(markup).toContain("结构 (S)");
    expect(markup).toContain("图形 (R / L / A)");
    expect(markup).not.toContain("套索");
  });

  it("renders structure template controls", () => {
    const shell = renderShell();
    const panel = structurePanelMarkup();

    expect(shell).toContain("data-structure-panel");
    expect(shell).toContain("data-structure-input");
    expect(panel).toContain("data-structure-type=\"array\"");
    expect(panel).toContain("data-structure-type=\"graph\"");
    expect(panel).toContain("data-structure-type=\"tree\"");
    expect(panel).toContain("data-structure-insert");
  });

  it("provides default structure input for panel resets", () => {
    expect(getStructureItem("array").defaultInput).toBe("1,2,3,4,5");
    expect(getStructureItem("graph").defaultInput).toBe("A-B, A-C, B-D, C-D");
    expect(getStructureItem("tree").defaultInput).toBe("A, B, C, D, E, F, G");
  });

  it("renders brush-specific controls in the property panel", () => {
    const markup = renderShell();

    expect(markup).toContain("data-control=\"brush-opacity\"");
    expect(markup).toContain("data-control=\"brush-smoothing\"");
    expect(markup).toContain("data-control=\"brush-cap\"");
    expect(markup).toContain("data-control=\"brush-style\"");
    expect(markup).toContain("data-brush-color=\"#111827\"");
    expect(markup).toContain("data-brush-custom-color");
    expect(markup).toContain("data-brush-width=\"6\"");
    expect(markup).toContain("data-brush-style-option=\"dash\"");
    expect(markup).toContain("data-brush-smoothing=\"45\"");
    expect(markup).toContain("data-brush-cap-option=\"round\"");
  });
});
