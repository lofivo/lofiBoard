import { describe, expect, it, vi } from "vitest";
import { createViewportActionController } from "../../src/app/viewport/viewport-action-controller.js";

function createController(overrides = {}) {
  let board = overrides.board ?? { id: "board_1", canvas: { backgroundMode: "dots" } };
  const state = {
    elementCount: overrides.elementCount ?? 1,
    viewport: overrides.viewport ?? { x: 10, y: 20, scale: 1 },
    backgroundMode: overrides.backgroundMode ?? "dots",
  };
  const callbacks = {
    applyBackground: vi.fn(),
    applyViewport: vi.fn((viewport) => { state.viewport = viewport; }),
    closeMainMenu: vi.fn(),
    computeFitViewportFn: vi.fn(() => ({ x: 100, y: 120, scale: 2 })),
    computeViewportForBoundsVisibilityFn: vi.fn(() => overrides.nextViewport ?? { x: 30, y: 40, scale: 1 }),
    getContentBounds: vi.fn(() => overrides.contentBounds ?? { x: 0, y: 0, width: 100, height: 80 }),
    getSelectedContentBounds: vi.fn(() => overrides.selectedBounds ?? { x: 200, y: 180, width: 60, height: 40 }),
    persistCurrentDraft: vi.fn(() => true),
    pushBoardHistory: vi.fn(),
    pushHistory: vi.fn(),
    serializeCurrentBoard: vi.fn(() => ({ ...board, serialized: true })),
    setBackgroundModeValue: vi.fn((mode) => { state.backgroundMode = mode; board = { ...board, canvas: { ...board.canvas, backgroundMode: mode } }; }),
    setBoard: vi.fn((nextBoard) => { board = nextBoard; }),
    setDirty: vi.fn(),
    setStatus: vi.fn(),
    updateChrome: vi.fn(),
  };
  const controller = createViewportActionController({
    getElementCount: () => state.elementCount,
    getContentBounds: callbacks.getContentBounds,
    getSelectedContentBounds: callbacks.getSelectedContentBounds,
    getViewport: () => state.viewport,
    getStageSize: () => ({ width: 800, height: 600 }),
    getBackgroundMode: () => state.backgroundMode,
    ...callbacks,
  });
  return { callbacks, controller, getBoard: () => board, state };
}

describe("viewport-action-controller", () => {
  it("reports empty boards when fitting content", () => {
    const { callbacks, controller } = createController({ elementCount: 0 });

    controller.fitContent();

    expect(callbacks.setStatus).toHaveBeenCalledWith("当前白板没有可适配的内容");
    expect(callbacks.applyViewport).not.toHaveBeenCalled();
  });

  it("fits content and commits a history snapshot", () => {
    const { callbacks, controller, getBoard } = createController();

    controller.fitContent();

    expect(callbacks.computeFitViewportFn).toHaveBeenCalledWith({
      bounds: { x: 0, y: 0, width: 100, height: 80 },
      stageSize: { width: 800, height: 600 },
      padding: 96,
    });
    expect(callbacks.applyViewport).toHaveBeenCalledWith({ x: 100, y: 120, scale: 2 });
    expect(callbacks.pushBoardHistory).toHaveBeenCalledWith(getBoard());
    expect(callbacks.setDirty).toHaveBeenCalledWith(true);
    expect(callbacks.setStatus).toHaveBeenCalledWith("已适配全部内容");
  });

  it("only commits selection visibility when the viewport changes", () => {
    const unchanged = { x: 10, y: 20, scale: 1 };
    const unchangedController = createController({ nextViewport: unchanged, viewport: unchanged });

    unchangedController.controller.ensureSelectionVisible();

    expect(unchangedController.callbacks.applyViewport).not.toHaveBeenCalled();

    const changedController = createController({ nextViewport: { x: 0, y: 0, scale: 1 } });
    changedController.controller.ensureSelectionVisible();

    expect(changedController.callbacks.applyViewport).toHaveBeenCalledWith({ x: 0, y: 0, scale: 1 });
    expect(changedController.callbacks.setDirty).toHaveBeenCalledWith(true);
    expect(changedController.callbacks.pushBoardHistory).not.toHaveBeenCalled();
  });

  it("resets view and persists the draft", () => {
    const { callbacks, controller } = createController();

    controller.resetView();

    expect(callbacks.applyViewport).toHaveBeenCalledWith({ x: 0, y: 0, scale: 1 });
    expect(callbacks.pushBoardHistory).toHaveBeenCalled();
    expect(callbacks.persistCurrentDraft).toHaveBeenCalled();
    expect(callbacks.setStatus).toHaveBeenCalledWith("已重置视图");
  });

  it("switches background mode and closes the main menu", () => {
    const { callbacks, controller, state } = createController({ backgroundMode: "dots" });

    controller.setBackgroundMode("plain");

    expect(state.backgroundMode).toBe("plain");
    expect(callbacks.applyBackground).toHaveBeenCalled();
    expect(callbacks.pushHistory).toHaveBeenCalledWith("已切换为纯白背景");
    expect(callbacks.closeMainMenu).toHaveBeenCalled();
  });
});
