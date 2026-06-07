import { DEFAULT_TEXT_STYLE } from "../../board/element-factory.js";
import { TOOLS } from "../../ui/ui-config.js";

export function createImportWorkflowController({
  imageInput,
  stage,
  clipboardController,
  getLastPointerWorldPoint,
  setLastPointerWorldPoint,
  getBoardElementCount,
  measureTextElementValue,
  isTypingInEditableControl,
  addElement,
  selectIds,
  setTool,
  pasteClipboard,
  setStatus,
  createImageElement,
  createTextElement,
  getImageFileFromPasteEvent,
  getImageFileFromDropEvent,
  getImageInsertPoint,
  getTextFromPasteEvent,
  getTextFromDropEvent,
  getWorldPointer,
  readFileAsDataUrl,
  readImageSize,
}) {
  async function importSelectedImage() {
    const file = imageInput.files?.[0];
    imageInput.value = "";
    if (!file) return;
    await insertImageFile(file, "已导入图片", { preferViewportCenter: true });
  }

  async function handlePaste(event) {
    if (isTypingInEditableControl(event.target)) return;
    const file = getImageFileFromPasteEvent(event);
    if (!file) {
      const text = getTextFromPasteEvent(event);
      if (text) {
        event.preventDefault();
        insertTextElement(text, "已粘贴文字");
        return;
      }
      if (!clipboardController.hasSnapshot()) return;
      event.preventDefault();
      pasteClipboard();
      return;
    }
    event.preventDefault();
    await insertImageFile(file, "已粘贴图片");
  }

  function handleImageDragOver(event) {
    event.preventDefault();
  }

  async function handleImageDrop(event) {
    const file = getImageFileFromDropEvent(event);
    const text = getTextFromDropEvent(event);
    event.preventDefault();
    stage.setPointersPositions(event);
    const worldPoint = getWorldPointer(stage);
    if (worldPoint) {
      setLastPointerWorldPoint(worldPoint);
    }
    if (!file) {
      if (text) {
        insertTextElement(text, "已拖入文字");
        return;
      }
      setStatus("只支持拖入图片文件");
      return;
    }
    await insertImageFile(file, "已拖入图片");
  }

  function insertTextElement(text, message) {
    const point = getLastPointerWorldPoint() ?? getViewportCenterPoint();
    const { fontSize, fontFamily, fontStyle } = DEFAULT_TEXT_STYLE;
    const measureElement = { fontSize, fontFamily, fontStyle };
    const element = createTextElement({
      point,
      zIndex: getBoardElementCount(),
      text,
      measureText: (value) => measureTextElementValue(measureElement, value),
    });
    addElement(element, message);
    setTool(TOOLS.SELECT);
    selectIds([element.id]);
  }

  async function insertImageFile(file, message, { preferViewportCenter = false } = {}) {
    try {
      const src = await readFileAsDataUrl(file);
      const size = await readImageSize(src);
      const point = getImageInsertPoint(getLastPointerWorldPoint(), {
        width: stage.width(),
        height: stage.height(),
      }, getViewport(), { preferViewportCenter });
      const element = createImageElement({
        point,
        src,
        width: size.width,
        height: size.height,
        zIndex: getBoardElementCount(),
        anchor: preferViewportCenter ? "center" : "top-left",
      });
      addElement(element, message);
      setTool(TOOLS.SELECT);
      selectIds([element.id]);
    } catch (error) {
      setStatus(`图片处理失败：${error.message}`);
    }
  }

  function getViewportCenterPoint() {
    const viewport = getViewport();
    return {
      x: (stage.width() / 2 - viewport.x) / viewport.scale,
      y: (stage.height() / 2 - viewport.y) / viewport.scale,
    };
  }

  function getViewport() {
    return {
      x: stage.x(),
      y: stage.y(),
      scale: stage.scaleX(),
    };
  }

  return {
    handleImageDragOver,
    handleImageDrop,
    handlePaste,
    importSelectedImage,
    insertImageFile,
    insertTextElement,
  };
}
