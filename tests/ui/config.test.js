import { describe, expect, it } from "vitest";
import { renderShell } from "../../src/app/shell/shell.js";
import { contextMenuMarkup, formatShortcutLabel, shapePopoverMarkup, structurePanelMarkup, toolButtonsMarkup } from "../../src/ui/config.js";
import { getStructureItem } from "../../src/structures/templates.js";

describe("ui config", () => {
  it("formats tooltip labels with shortcuts", () => {
    expect(formatShortcutLabel({ label: "选择", shortcut: "V" })).toBe("选择 (V)");
    expect(formatShortcutLabel({ label: "椭圆" })).toBe("椭圆");
  });

  it("renders tool tooltip text with shortcuts", () => {
    const markup = toolButtonsMarkup();

    expect(markup).toContain('data-tool-action="toggle-tool-lock"');
    expect(markup).toContain("绘制后保持所选的工具栏状态 (Q)");
    expect(markup.indexOf('data-tool-action="toggle-tool-lock"')).toBeLessThan(markup.indexOf('data-tool="select"'));
    expect(markup).toContain("选择 (V)");
    expect(markup).toContain("平移 (H)");
    expect(markup).toContain("画笔 (B)");
    expect(markup).toContain('data-tool-action="import-image"');
    expect(markup).toContain("图片");
    expect(markup).toContain("结构 (S)");
    expect(markup).toContain('data-shape-tool="rect"');
    expect(markup).toContain('data-shape-tool="ellipse"');
    expect(markup).toContain('data-shape-tool="line"');
    expect(markup).toContain('data-shape-tool="arrow"');
    expect(markup).toContain("更多工具");
    expect(markup).not.toContain("套索");
  });

  it("renders the coordinate plane in the shape popover", () => {
    const markup = shapePopoverMarkup();

    expect(markup).toContain('data-shape-tool="coordinate-plane"');
    expect(markup).toContain("坐标系");
    expect(markup).not.toContain('data-shape-tool="rect"');
    expect(markup).not.toContain('data-shape-tool="ellipse"');
    expect(markup).not.toContain('data-shape-tool="line"');
    expect(markup).not.toContain('data-shape-tool="arrow"');
  });

  it("orders canvas background choices with plain before dots", () => {
    const shell = renderShell();

    expect(shell.indexOf('data-background-mode="plain"')).toBeLessThan(shell.indexOf('data-background-mode="dots"'));
  });

  it("renders structure template controls", () => {
    const shell = renderShell();
    const panel = structurePanelMarkup();

    expect(shell).toContain("data-structure-panel");
    expect(panel).toContain("data-structure-input-label");
    expect(shell).toContain("data-structure-input");
    expect(panel).toContain("data-linear-init-panel");
    expect(panel).toContain("data-array-init-mode=\"manual\"");
    expect(panel).toContain("data-array-init-mode=\"random\"");
    expect(panel).toContain("data-array-random-fields hidden");
    expect(panel).toContain("data-array-random-count");
    expect(panel.indexOf("data-array-init-mode=\"random\"")).toBeLessThan(panel.indexOf("data-structure-input-label"));
    expect(panel.indexOf("data-structure-input-label")).toBeLessThan(panel.indexOf("data-array-random-fields"));
    expect(panel).toContain("data-structure-type=\"array\"");
    expect(panel).toContain("data-structure-type=\"graph\"");
    expect(panel).toContain("data-structure-type=\"tree\"");
    expect(panel).toContain("data-structure-insert");
  });

  it("provides default structure input for panel resets", () => {
    expect(getStructureItem("array").defaultInput).toBe("1,2,3,4,5");
    expect(getStructureItem("graph").defaultInput).toBe("A->B, A->C, B->D, C->D");
    expect(getStructureItem("tree").defaultInput).toBe("1->2, 1->3, 2->4, 2->5");
    expect(getStructureItem("binary-tree").defaultInput).toBe("1->2, 1->3, 2->4, 2->5, 3->6, 3->7");
  });

  it("renders layer ordering controls in the context menu only", () => {
    const shell = renderShell();
    const contextMenu = contextMenuMarkup();

    expect(contextMenu).toContain('data-context-action="undo"');
    expect(contextMenu).toContain('data-context-action="redo"');
    expect(contextMenu.indexOf('data-context-action="undo"')).toBeLessThan(
      contextMenu.indexOf('data-context-action="copy"'),
    );
    expect(contextMenu).toContain('data-context-action="bring-forward"');
    expect(contextMenu).toContain('data-context-action="send-backward"');
    expect(contextMenu).toContain('data-context-action="bring-front"');
    expect(contextMenu).toContain('data-context-action="send-back"');
    expect(contextMenu).toContain('data-context-action="group"');
    expect(contextMenu).toContain('data-context-action="ungroup"');
    expect(contextMenu).toContain('data-context-action="toggle-lock"');
    expect(contextMenu).toContain('data-context-action="delete"');
    expect(shell).not.toContain('data-inspector-section="arrange"');
    expect(shell).not.toContain("排列与选择");
  });
});
