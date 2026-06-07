import { createExportBackground as defaultCreateExportBackground } from "../../canvas/export-renderer.js";
import { downloadDataUrl as defaultDownloadDataUrl } from "../../services/file-service.js";

export function createExportPngController({
  stage,
  contentLayer,
  overlayLayer,
  selectionRect,
  transformer,
  getBackgroundMode,
  getActiveFileName,
  createExportBackground = defaultCreateExportBackground,
  downloadDataUrl = defaultDownloadDataUrl,
  syncSelectionNodes,
  setStatus,
}) {
  function exportPng() {
    const backgroundNodes = createExportBackground({
      stage,
      contentLayer,
      backgroundMode: getBackgroundMode(),
    });
    selectionRect.visible(false);
    transformer.visible(false);
    contentLayer.draw();
    overlayLayer.draw();

    const dataUrl = stage.toDataURL({
      pixelRatio: 2,
      mimeType: "image/png",
    });
    backgroundNodes.forEach((node) => node.destroy());
    syncSelectionNodes();
    syncSelectionNodes();
    contentLayer.draw();
    overlayLayer.draw();

    downloadDataUrl({
      dataUrl,
      fileName: `${getExportFileBaseName(getActiveFileName())}.png`,
    });
    setStatus("已导出当前视图 PNG");
  }

  return { exportPng };
}

function getExportFileBaseName(fileName) {
  return String(fileName ?? "").replace(/\.lofibrd$/i, "") || "lofiBoard";
}
