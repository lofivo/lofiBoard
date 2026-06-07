import { describe, expect, it, vi } from "vitest";
import {
  createElementRenderHandlerSnapshot,
  createShapeRenderAdapter,
  isGeneralTreeStructure,
} from "../../src/app/rendering/shape-render-adapter.js";
import { TOOLS } from "../../src/ui/ui-config.js";

describe("shape-render-adapter", () => {
  it("includes linear structure editability in the render handler snapshot", () => {
    const element = { id: "array-1", type: "array-structure" };

    expect(createElementRenderHandlerSnapshot(element, {
      currentTool: TOOLS.SELECT,
      temporaryPanActive: false,
      isArrayAlgorithmLocked: () => false,
    })).toBe("canEditArrayItems:true");

    expect(createElementRenderHandlerSnapshot(element, {
      currentTool: TOOLS.PAN,
      temporaryPanActive: false,
      isArrayAlgorithmLocked: () => false,
    })).toBe("canEditArrayItems:false");

    expect(createElementRenderHandlerSnapshot(element, {
      currentTool: TOOLS.SELECT,
      temporaryPanActive: true,
      isArrayAlgorithmLocked: () => false,
    })).toBe("canEditArrayItems:false");

    expect(createElementRenderHandlerSnapshot(element, {
      currentTool: TOOLS.SELECT,
      temporaryPanActive: false,
      isArrayAlgorithmLocked: () => true,
    })).toBe("canEditArrayItems:false");
  });

  it("includes the active tree node only for the matching tree element", () => {
    const activeTreeNode = { elementId: "tree-1", nodeId: "node-2" };

    expect(createElementRenderHandlerSnapshot({
      id: "tree-1",
      type: "tree-structure",
      settings: { treeKind: "binary" },
    }, { activeTreeNode })).toBe("activeTreeNode:node-2");

    expect(createElementRenderHandlerSnapshot({
      id: "tree-2",
      type: "tree-structure",
      settings: { treeKind: "general" },
    }, { activeTreeNode })).toBe("activeTreeNode:");
  });

  it("distinguishes general trees from binary trees", () => {
    expect(isGeneralTreeStructure({
      type: "tree-structure",
      settings: { treeKind: "general" },
    })).toBe(true);

    expect(isGeneralTreeStructure({
      type: "tree-structure",
      settings: { treeKind: "binary" },
    })).toBe(false);
  });

  it("delegates runtime projection to structure interaction", () => {
    const projected = { id: "array-1", type: "array-structure", runtime: { activeIndex: 1 } };
    const structureInteraction = {
      getActiveTreeNode: vi.fn(() => null),
      projectRuntime: vi.fn(() => projected),
    };
    const adapter = createShapeRenderAdapter({
      getCurrentTool: () => TOOLS.SELECT,
      isTemporaryPanActive: () => false,
      isArrayAlgorithmLocked: () => false,
      structureInteraction,
    });
    const element = { id: "array-1", type: "array-structure" };

    expect(adapter.projectRuntimeElement(element)).toBe(projected);
    expect(structureInteraction.projectRuntime).toHaveBeenCalledWith(element);
  });
});
