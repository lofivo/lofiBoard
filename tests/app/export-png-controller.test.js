import { describe, expect, it, vi } from "vitest";
import { createExportPngController } from "../../src/app/import-export/export-png-controller.js";

function createController(overrides = {}) {
  const backgroundNodes = [
    { destroy: vi.fn() },
    { destroy: vi.fn() },
  ];
  const stage = {
    toDataURL: vi.fn(() => "data:image/png;base64,abc"),
  };
  const contentLayer = { draw: vi.fn() };
  const overlayLayer = { draw: vi.fn() };
  const selectionRect = { visible: vi.fn() };
  const transformer = { visible: vi.fn() };
  const callbacks = {
    createExportBackground: vi.fn(() => backgroundNodes),
    downloadDataUrl: vi.fn(),
    syncSelectionNodes: vi.fn(),
    setStatus: vi.fn(),
  };
  const controller = createExportPngController({
    stage,
    contentLayer,
    overlayLayer,
    selectionRect,
    transformer,
    getBackgroundMode: overrides.getBackgroundMode ?? (() => "dots"),
    getActiveFileName: overrides.getActiveFileName ?? (() => "board.lofibrd"),
    ...callbacks,
  });
  return {
    backgroundNodes,
    callbacks,
    contentLayer,
    controller,
    overlayLayer,
    selectionRect,
    stage,
    transformer,
  };
}

describe("export-png-controller", () => {
  it("exports the current viewport as a PNG and restores selection visuals", () => {
    const {
      backgroundNodes,
      callbacks,
      contentLayer,
      controller,
      overlayLayer,
      selectionRect,
      stage,
      transformer,
    } = createController();

    controller.exportPng();

    expect(callbacks.createExportBackground).toHaveBeenCalledWith({
      stage,
      contentLayer,
      backgroundMode: "dots",
    });
    expect(selectionRect.visible).toHaveBeenCalledWith(false);
    expect(transformer.visible).toHaveBeenCalledWith(false);
    expect(stage.toDataURL).toHaveBeenCalledWith({
      pixelRatio: 2,
      mimeType: "image/png",
    });
    expect(backgroundNodes[0].destroy).toHaveBeenCalled();
    expect(backgroundNodes[1].destroy).toHaveBeenCalled();
    expect(callbacks.syncSelectionNodes).toHaveBeenCalledTimes(2);
    expect(contentLayer.draw).toHaveBeenCalledTimes(2);
    expect(overlayLayer.draw).toHaveBeenCalledTimes(2);
    expect(callbacks.downloadDataUrl).toHaveBeenCalledWith({
      dataUrl: "data:image/png;base64,abc",
      fileName: "board.png",
    });
    expect(callbacks.setStatus).toHaveBeenCalledWith("已导出当前视图 PNG");
  });

  it("falls back to the default PNG name when the active file name is empty", () => {
    const { callbacks, controller } = createController({
      getActiveFileName: () => ".lofibrd",
    });

    controller.exportPng();

    expect(callbacks.downloadDataUrl).toHaveBeenCalledWith(expect.objectContaining({
      fileName: "lofiBoard.png",
    }));
  });
});
