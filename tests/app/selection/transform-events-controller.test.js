import { describe, expect, it, vi } from "vitest";
import { createSelectionTransformEventsController } from "../../../src/app/selection/transform-events-controller.js";

function createTransformer(activeAnchor = "bottom-right") {
  const listeners = {};
  return {
    getActiveAnchor: vi.fn(() => activeAnchor),
    nodes: vi.fn(() => [{ id: "node_1" }]),
    on: vi.fn((eventName, handler) => {
      listeners[eventName] = handler;
    }),
    emit(eventName) {
      listeners[eventName]?.();
    },
    listeners,
  };
}

function createHarness(overrides = {}) {
  const transformer = overrides.transformer ?? createTransformer();
  const callbacks = {
    handleTransformerDoubleClick: vi.fn(),
    pushHistory: vi.fn(),
    syncCoordinatePlaneTransformPreview: vi.fn(),
    syncGraphTransformPreview: vi.fn(),
    syncSelectedNodes: vi.fn(),
    syncTextTransformPreview: vi.fn(),
    syncTextWidthResize: vi.fn(),
    ...overrides.callbacks,
  };
  const controller = createSelectionTransformEventsController();
  controller.bindTransformerEvents({
    transformer,
    editController: { isEditing: overrides.isEditing ?? false },
    selectionTransformPreviewController: {
      syncTextWidthResize: callbacks.syncTextWidthResize,
      syncTextTransformPreview: callbacks.syncTextTransformPreview,
      syncCoordinatePlaneTransformPreview: callbacks.syncCoordinatePlaneTransformPreview,
      syncGraphTransformPreview: callbacks.syncGraphTransformPreview,
    },
    handleTransformerDoubleClick: callbacks.handleTransformerDoubleClick,
    syncSelectedNodes: callbacks.syncSelectedNodes,
    pushHistory: callbacks.pushHistory,
  });
  return { callbacks, controller, transformer };
}

describe("app selection transform-events-controller", () => {
  it("binds transformer preview and double-click handlers", () => {
    const { callbacks, transformer } = createHarness();

    expect(transformer.on).toHaveBeenCalledWith("transform", callbacks.syncTextWidthResize);
    expect(transformer.on).toHaveBeenCalledWith("transform", callbacks.syncTextTransformPreview);
    expect(transformer.on).toHaveBeenCalledWith("transform", callbacks.syncCoordinatePlaneTransformPreview);
    expect(transformer.on).toHaveBeenCalledWith("transform", callbacks.syncGraphTransformPreview);
    expect(transformer.on).toHaveBeenCalledWith("dblclick dbltap", callbacks.handleTransformerDoubleClick);
  });

  it("tracks and clears the active transform anchor around commits", () => {
    const { callbacks, controller, transformer } = createHarness();

    transformer.emit("transformstart transform");

    expect(controller.getLastTransformAnchor()).toBe("bottom-right");

    transformer.emit("dragend transformend");

    expect(callbacks.syncSelectedNodes).toHaveBeenCalledWith([{ id: "node_1" }]);
    expect(callbacks.pushHistory).toHaveBeenCalledWith("已更新选择对象");
    expect(controller.getLastTransformAnchor()).toBe(null);
  });

  it("skips transform commit while editing or after node drag end already handled", () => {
    const editingHarness = createHarness({ isEditing: true });
    editingHarness.transformer.emit("dragend transformend");

    expect(editingHarness.callbacks.syncSelectedNodes).not.toHaveBeenCalled();

    const nodeDragHarness = createHarness();
    nodeDragHarness.controller.setHandledNodeDragEnd(true);
    nodeDragHarness.transformer.emit("dragend transformend");

    expect(nodeDragHarness.callbacks.syncSelectedNodes).not.toHaveBeenCalled();
    nodeDragHarness.transformer.emit("dragend transformend");
    expect(nodeDragHarness.callbacks.syncSelectedNodes).toHaveBeenCalledTimes(1);
  });
});
