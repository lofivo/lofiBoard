import { describe, expect, it } from "vitest";
import {
  canPersistToolPropertyControls,
  getPropertyPanelTitle,
  getSelectionHydrateSource,
  getSelectionInspectorCapabilities,
  getSelectionPanelMode,
  getShapeToolTitle,
  getToolInspectorCapabilities,
  getToolPanelMode,
  isToolPropertyPanelAvailable,
} from "../../../src/app/inspector/model.js";
import { TOOLS } from "../../../src/ui/config.js";

describe("inspector model", () => {
  it("returns concrete property panel titles for single selections", () => {
    expect(getPropertyPanelTitle([{ type: "text" }])).toBe("文字");
    expect(getPropertyPanelTitle([{ type: "tree-structure", settings: { treeKind: "binary" } }])).toBe("二叉树");
    expect(getPropertyPanelTitle([{ type: "tree-structure", settings: { treeKind: "general" } }])).toBe("树");
    expect(getPropertyPanelTitle([{ type: "rect" }, { type: "ellipse" }])).toBe("属性");
  });

  it("derives selection panel modes from selected element types", () => {
    expect(getSelectionPanelMode([{ type: "text" }])).toBe("text");
    expect(getSelectionPanelMode([{ type: "sticky" }])).toBe("sticky");
    expect(getSelectionPanelMode([{ type: "stroke" }])).toBe("brush");
    expect(getSelectionPanelMode([{ type: "line" }, { type: "arrow" }])).toBe("multi");
    expect(getSelectionPanelMode([{ type: "array-structure" }])).toBe("structure");
    expect(getSelectionPanelMode([{ type: "rect" }])).toBe("element");
  });

  it("chooses the first useful element for hydrating shared controls", () => {
    const source = getSelectionHydrateSource([
      { type: "text", id: "text_1" },
      { type: "stroke", id: "stroke_1" },
      { type: "rect", id: "rect_1" },
    ]);

    expect(source.id).toBe("rect_1");
  });

  it("computes selection and tool capabilities", () => {
    expect(getSelectionInspectorCapabilities([{ type: "arrow" }, { type: "text" }])).toEqual({
      text: true,
      sticky: false,
      stroke: false,
      drawing: true,
      fillShape: false,
      arrow: true,
      coordinate: false,
    });
    expect(getToolInspectorCapabilities(TOOLS.COORDINATE_PLANE, TOOLS.SHAPE)).toMatchObject({
      coordinate: true,
      drawing: false,
    });
    expect(getToolPanelMode(TOOLS.PEN, TOOLS.RECT)).toBe("brush");
    expect(getToolPanelMode(TOOLS.SHAPE, TOOLS.ARROW)).toBe("linear-tool");
    expect(getShapeToolTitle(TOOLS.COORDINATE_PLANE)).toBe("坐标系");
  });

  it("persists text presets without exposing the legacy tool panel", () => {
    expect(isToolPropertyPanelAvailable(TOOLS.TEXT)).toBe(false);
    expect(isToolPropertyPanelAvailable(TOOLS.STICKY)).toBe(false);
    expect(canPersistToolPropertyControls(TOOLS.TEXT)).toBe(true);
    expect(canPersistToolPropertyControls(TOOLS.STICKY)).toBe(true);
  });
});
