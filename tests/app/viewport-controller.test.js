import { describe, expect, it, vi } from "vitest";
import { createViewportController } from "../../src/app/viewport/viewport-controller.js";

function createFakeStage({ width = 800, height = 600, x = 0, y = 0, scale = 1, pointer = null } = {}) {
  let stageX = x;
  let stageY = y;
  let stageScale = scale;
  return {
    width: () => width,
    height: () => height,
    x: () => stageX,
    y: () => stageY,
    scaleX: () => stageScale,
    position: vi.fn((nextPosition) => {
      if (!nextPosition) return { x: stageX, y: stageY };
      stageX = nextPosition.x;
      stageY = nextPosition.y;
      return { x: stageX, y: stageY };
    }),
    scale: vi.fn((nextScale) => {
      stageScale = nextScale.x;
    }),
    getPointerPosition: () => pointer,
  };
}

function createController(options = {}) {
  const styleValues = new Map();
  const buttons = [
    { dataset: { zoomLevel: "1" }, classList: { toggle: vi.fn() } },
    { dataset: { zoomLevel: "2" }, classList: { toggle: vi.fn() } },
  ];
  const callbacks = {
    updateBrushCursorStyle: vi.fn(),
    updateEraserCursorStyle: vi.fn(),
    updateLinearItemControlsPosition: vi.fn(),
    syncActiveCellEditor: vi.fn(),
    syncTextOverlays: vi.fn(),
    updateContextPanel: vi.fn(),
    schedulePersistCurrentDraft: vi.fn(),
    closeZoomMenu: vi.fn(),
    ...options.callbacks,
  };
  const controller = createViewportController({
    stage: options.stage ?? createFakeStage(),
    container: {
      style: {
        setProperty: vi.fn((name, value) => styleValues.set(name, value)),
      },
    },
    zoomLabel: { textContent: "" },
    getZoomLevelButtons: () => buttons,
    ...callbacks,
  });
  return { controller, callbacks, styleValues, buttons };
}

describe("viewport-controller", () => {
  it("applies a viewport and updates grid/cursor overlays", () => {
    const stage = createFakeStage();
    const { controller, callbacks, styleValues } = createController({ stage });

    controller.applyViewport({ x: 10, y: 20, scale: 2 });

    expect(stage.position).toHaveBeenCalledWith({ x: 10, y: 20 });
    expect(stage.scale).toHaveBeenCalledWith({ x: 2, y: 2 });
    expect(styleValues.get("--grid-size")).toBe("64px");
    expect(styleValues.get("--grid-x")).toBe("10px");
    expect(styleValues.get("--grid-y")).toBe("20px");
    expect(callbacks.updateBrushCursorStyle).toHaveBeenCalled();
    expect(callbacks.updateEraserCursorStyle).toHaveBeenCalled();
    expect(callbacks.syncTextOverlays).toHaveBeenCalled();
  });

  it("zooms around the stage center and updates zoom chrome", () => {
    const stage = createFakeStage({ width: 800, height: 600, x: -100, y: -50, scale: 1 });
    const { controller, callbacks, buttons } = createController({ stage });

    controller.setZoomAtCenter(2);

    expect(stage.scale).toHaveBeenCalledWith({ x: 2, y: 2 });
    expect(stage.position).toHaveBeenCalledWith({ x: -600, y: -400 });
    expect(controller.getViewport()).toEqual({ x: -600, y: -400, scale: 2 });
    expect(callbacks.closeZoomMenu).toHaveBeenCalled();
    expect(callbacks.schedulePersistCurrentDraft).toHaveBeenCalled();
    expect(controller.getZoomLabelText()).toBe("200%");
    expect(buttons[1].classList.toggle).toHaveBeenCalledWith("active", true);
  });

  it("zooms wheel events around the pointer position", () => {
    const preventDefault = vi.fn();
    const stage = createFakeStage({ x: -100, y: -50, scale: 1, pointer: { x: 200, y: 150 } });
    const { controller, callbacks } = createController({ stage });

    controller.handleWheel({ evt: { preventDefault, deltaY: -1 } });

    expect(preventDefault).toHaveBeenCalled();
    expect(stage.scale).toHaveBeenCalledWith({ x: 1.05, y: 1.05 });
    expect(stage.position).toHaveBeenCalledWith({ x: -115, y: -60 });
    expect(callbacks.schedulePersistCurrentDraft).toHaveBeenCalled();
  });
});
