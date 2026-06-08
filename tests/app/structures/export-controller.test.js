import { describe, expect, it, vi } from "vitest";
import { createStructureExportController } from "../../../src/app/structures/export-controller.js";

function createController({
  clipboard = { writeText: vi.fn(() => Promise.resolve()) },
  elements = [{ id: "graph_1", type: "graph-structure" }],
  selectedIds = ["graph_1"],
} = {}) {
  const structureInput = { value: "" };
  const callbacks = {
    exportGraph: vi.fn((element, format) => `${format}:${element.id}`),
    exportTree: vi.fn((element) => `tree:${element.id}`),
    setStatus: vi.fn(),
  };
  const controller = createStructureExportController({
    getElements: () => elements,
    getSelectedIds: () => selectedIds,
    structureInput,
    getClipboard: () => clipboard,
    ...callbacks,
  });
  return { callbacks, clipboard, controller, structureInput };
}

describe("export-controller", () => {
  it("copies selected graph exports to the clipboard", async () => {
    const { callbacks, clipboard, controller } = createController();

    controller.copySelectedGraphExport("edge-list");
    await Promise.resolve();

    expect(callbacks.exportGraph).toHaveBeenCalledWith({ id: "graph_1", type: "graph-structure" }, "edge-list");
    expect(clipboard.writeText).toHaveBeenCalledWith("edge-list:graph_1");
    expect(callbacks.setStatus).toHaveBeenCalledWith("已复制图数据");
  });

  it("writes graph exports into the structure input when clipboard access fails", async () => {
    const { callbacks, controller, structureInput } = createController({
      clipboard: { writeText: vi.fn(() => Promise.reject(new Error("denied"))) },
    });

    controller.copySelectedGraphExport("adjacency-list");
    await Promise.resolve();

    expect(structureInput.value).toBe("adjacency-list:graph_1");
    expect(callbacks.setStatus).toHaveBeenCalledWith("无法访问剪贴板，已写入结构输入框");
  });

  it("falls back immediately when clipboard writeText is unavailable", () => {
    const { callbacks, controller, structureInput } = createController({
      clipboard: {},
      elements: [{ id: "tree_1", type: "tree-structure" }],
      selectedIds: ["tree_1"],
    });

    controller.copySelectedTreeSubtree();

    expect(structureInput.value).toBe("tree:tree_1");
    expect(callbacks.setStatus).toHaveBeenCalledWith("已写入结构输入框");
  });
});
