import { describe, expect, it, vi } from "vitest";
import { createStructureControlsPositionController } from "../../../src/app/structures/structure-controls-position-controller.js";

function createControl({ hidden = false, offsetWidth = 0 } = {}) {
  return {
    hidden,
    offsetWidth,
    style: {},
  };
}

function createNode(rect) {
  return {
    getClientRect: vi.fn(() => rect),
  };
}

function createContentLayer(groups = {}) {
  return {
    findOne: vi.fn((selector) => groups[selector] ?? null),
  };
}

function createController(overrides = {}) {
  return createStructureControlsPositionController({
    contentLayer: createContentLayer(),
    getStageContainerRect: () => ({ left: 10, top: 20 }),
    getElements: () => [],
    structureInteraction: {
      getActiveLinearItem: vi.fn(() => null),
      getActiveTreeNode: vi.fn(() => null),
    },
    findLinearItemNode: vi.fn(() => null),
    findTreeNodeGroup: vi.fn(() => null),
    isSelectedGeneralTreeElement: vi.fn(() => false),
    isSelectedBinaryTreeElement: vi.fn(() => false),
    isSelectedTreeElementWithTraversal: vi.fn(() => false),
    getLinearItemControls: vi.fn(() => null),
    getTreeNodeControls: vi.fn(() => null),
    getBinaryTreeNodeControls: vi.fn(() => null),
    getTreeTraversalControls: vi.fn(() => null),
    ...overrides,
  });
}

describe("structure-controls-position-controller", () => {
  it("positions active linear item controls under the active item", () => {
    const controls = createControl();
    const itemNode = createNode({ x: 30, y: 40, width: 60, height: 20 });
    const group = {};
    const findLinearItemNode = vi.fn(() => itemNode);
    const controller = createController({
      contentLayer: createContentLayer({ "#array-1": group }),
      structureInteraction: {
        getActiveLinearItem: vi.fn(() => ({ elementId: "array-1", index: 2 })),
        getActiveTreeNode: vi.fn(() => null),
      },
      findLinearItemNode,
      getLinearItemControls: vi.fn(() => controls),
    });

    controller.updateLinearItemControlsPosition();

    expect(findLinearItemNode).toHaveBeenCalledWith(group, 2);
    expect(controls.style.left).toBe("70px");
    expect(controls.style.top).toBe("88px");
  });

  it("hides linear item controls when the active item node is missing", () => {
    const controls = createControl();
    const controller = createController({
      contentLayer: createContentLayer({ "#array-1": {} }),
      structureInteraction: {
        getActiveLinearItem: vi.fn(() => ({ elementId: "array-1", index: 2 })),
        getActiveTreeNode: vi.fn(() => null),
      },
      getLinearItemControls: vi.fn(() => controls),
    });

    controller.updateLinearItemControlsPosition();

    expect(controls.hidden).toBe(true);
  });

  it("positions selected tree node controls under the active tree node", () => {
    const controls = createControl();
    const treeNode = createNode({ x: 50, y: 70, width: 40, height: 24 });
    const group = {};
    const controller = createController({
      contentLayer: createContentLayer({ "#tree-1": group }),
      getElements: () => [{ id: "tree-1", type: "tree-structure" }],
      structureInteraction: {
        getActiveLinearItem: vi.fn(() => null),
        getActiveTreeNode: vi.fn(() => ({ elementId: "tree-1", nodeId: "node-1" })),
      },
      findTreeNodeGroup: vi.fn(() => treeNode),
      isSelectedGeneralTreeElement: vi.fn(() => true),
      getTreeNodeControls: vi.fn(() => controls),
    });

    controller.updateTreeNodeControlsPosition();

    expect(controls.style.left).toBe("80px");
    expect(controls.style.top).toBe("122px");
    expect(controls.style.transform).toBe("translateX(-50%)");
  });

  it("positions tree traversal controls at the lower right of the selected tree group", () => {
    const controls = createControl({ offsetWidth: 32 });
    const group = createNode({ x: 100, y: 120, width: 200, height: 80 });
    const controller = createController({
      contentLayer: createContentLayer({ "#tree-1": group }),
      getElements: () => [{ id: "tree-1", type: "tree-structure" }],
      isSelectedTreeElementWithTraversal: vi.fn(() => true),
      getTreeTraversalControls: vi.fn(() => controls),
    });

    controller.updateTreeTraversalControlsPosition();

    expect(controls.style.left).toBe("278px");
    expect(controls.style.top).toBe("228px");
    expect(controls.style.transform).toBe("none");
  });

  it("updates every tree control position through the aggregate entry point", () => {
    const controller = createController();
    const treeSpy = vi.spyOn(controller, "updateTreeNodeControlsPosition");
    const binarySpy = vi.spyOn(controller, "updateBinaryTreeNodeControlsPosition");
    const traversalSpy = vi.spyOn(controller, "updateTreeTraversalControlsPosition");

    controller.updateTreeControlsPosition();

    expect(treeSpy).toHaveBeenCalled();
    expect(binarySpy).toHaveBeenCalled();
    expect(traversalSpy).toHaveBeenCalled();
  });
});
