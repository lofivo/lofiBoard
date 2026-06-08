import { describe, expect, it, vi } from "vitest";
import {
  findLinearItemNode,
  findLinearItemValueGroup,
  findTreeNodeGroup,
  getTreeParentNodeId,
  getTreeRootNodeId,
  getLinearItemNodeIndex,
  isBinaryTreeElement,
  isGeneralTreeElement,
  isInteractiveStructureElement,
  isTreeNodeHitTarget,
  isTreeRootNode,
} from "../../../src/app/structures/node-query.js";

function createNode(attrs = {}) {
  return {
    getAttr: vi.fn((name) => attrs[name]),
    findOne: vi.fn((selector) => attrs.findOne?.[selector] ?? null),
  };
}

function createGroup(nodesBySelector = {}) {
  return {
    find: vi.fn((selector) => nodesBySelector[selector] ?? []),
  };
}

describe("node-query", () => {
  it("reads a linear item node index with a safe fallback", () => {
    expect(getLinearItemNodeIndex(createNode({ linearIndex: 2 }))).toBe(2);
    expect(getLinearItemNodeIndex(createNode({ linearIndex: "2" }))).toBe(0);
    expect(getLinearItemNodeIndex(null)).toBe(0);
  });

  it("finds a linear item node by index", () => {
    const first = createNode({ linearIndex: 0 });
    const second = createNode({ linearIndex: 1 });
    const group = createGroup({ ".array-item": [first, second] });

    expect(findLinearItemNode(group, 1)).toBe(second);
    expect(findLinearItemNode(group, 3)).toBeNull();
    expect(findLinearItemNode(null, 1)).toBeNull();
  });

  it("finds the value group inside a linear item", () => {
    const valueGroup = {};
    const item = createNode({
      linearIndex: 1,
      findOne: { ".array-item-value-group": valueGroup },
    });
    const group = createGroup({ ".array-item": [item] });

    expect(findLinearItemValueGroup(group, 1)).toBe(valueGroup);
    expect(findLinearItemValueGroup(group, 2)).toBeNull();
  });

  it("finds a tree node group by node id", () => {
    const first = createNode({ treeNodeId: "a" });
    const second = createNode({ treeNodeId: "b" });
    const group = createGroup({ ".tree-node": [first, second] });

    expect(findTreeNodeGroup(group, "b")).toBe(second);
    expect(findTreeNodeGroup(group, "c")).toBeNull();
    expect(findTreeNodeGroup(group, null)).toBeNull();
    expect(findTreeNodeGroup(null, "a")).toBeNull();
  });

  it("derives tree root and parent node ids from tree data", () => {
    const tree = {
      type: "tree-structure",
      settings: {},
      nodes: [{ id: "root" }, { id: "left" }, { id: "right" }],
      edges: [
        { from: "root", to: "left" },
        { from: "root", to: "right" },
      ],
    };

    expect(getTreeRootNodeId(tree)).toBe("root");
    expect(getTreeParentNodeId(tree, "left")).toBe("root");
    expect(isTreeRootNode(tree, "root")).toBe(true);
    expect(isTreeRootNode(tree, "left")).toBe(false);
    expect(getTreeRootNodeId({ ...tree, settings: { rootId: "right" } })).toBe("right");
    expect(getTreeRootNodeId(null)).toBeNull();
    expect(getTreeParentNodeId(null, "left")).toBeNull();
  });

  it("classifies structure elements by tree kind and interactivity", () => {
    const binaryTree = { type: "tree-structure", settings: { treeKind: "binary" } };
    const generalTree = { type: "tree-structure", settings: { treeKind: "general" } };
    const array = { type: "array-structure" };
    const rectangle = { type: "rectangle" };

    expect(isBinaryTreeElement(binaryTree)).toBe(true);
    expect(isBinaryTreeElement(generalTree)).toBe(false);
    expect(isGeneralTreeElement(generalTree)).toBe(true);
    expect(isGeneralTreeElement(binaryTree)).toBe(false);
    expect(isInteractiveStructureElement(binaryTree)).toBe(true);
    expect(isInteractiveStructureElement(array)).toBe(true);
    expect(isInteractiveStructureElement(rectangle)).toBe(false);
  });

  it("detects tree node pointer targets from names or ancestors", () => {
    expect(isTreeNodeHitTarget({ hasName: (name) => name === "tree-node" })).toBe(true);
    expect(isTreeNodeHitTarget({ findAncestor: (selector) => selector === ".tree-node" ? {} : null })).toBe(true);
    expect(isTreeNodeHitTarget({ hasName: () => false, findAncestor: () => null })).toBe(false);
  });
});
