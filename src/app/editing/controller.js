import {
  getTextEditorStyle,
  measureTextareaContentHeight,
  getMinimumTextResizeWidth,
  getSingleLineTextEditorHeight,
  getTransformerAnchorsForSelection,
  shouldPreserveTextEditorOnPointerDown,
  clampTransformerAnchorDragBySize,
  isTransformerTarget,
  getStickyEditorCommitBox,
  getStickyTextInsets,
  getPreferredTextBoxWidth,
} from "../../tools/interaction-rules.js";
import {
  syncTextNodeSize,
  syncTextNodeContent,
  getStickyBorderColor,
} from "../../canvas/konva-elements.js";
import { removeElementsById } from "../../services/clipboard.js";

export function createEditController({
  findElement,
  getBoardElements,
  setBoardElements,
  getSelectedIds,
  setSelectedIds,
  contentLayer,
  overlayLayer,
  transformer,
  stage,
  textOverlayController,
  onStateChange,
  onRender,
  onHistory,
  measureTextValue,
}) {
  let isEditing = false;
  let editorCommitRef = null;

  function editElement(id) {
    const element = findElement(id);
    const node = contentLayer.findOne(`#${id}`);
    if (!element || !node) return;

    isEditing = true;
    onStateChange(true);
    textOverlayController.setHiddenIds([id]);
    contentLayer.draw();

    const editorFrame = document.createElement("div");
    editorFrame.className = "text-editor-frame";
    const textarea = document.createElement("textarea");
    textarea.className = "text-editor";
    textarea.rows = 1;
    textarea.spellcheck = false;
    textarea.autocorrect = "off";
    textarea.autocomplete = "off";
    textarea.autocapitalize = "off";
    textarea.value = element.text;
    editorFrame.appendChild(textarea);
    const measureTextarea = document.createElement("textarea");
    measureTextarea.className = "text-editor text-editor-measure";
    measureTextarea.tabIndex = -1;
    measureTextarea.rows = 1;
    measureTextarea.spellcheck = false;
    measureTextarea.autocorrect = "off";
    measureTextarea.autocomplete = "off";
    measureTextarea.autocapitalize = "off";
    measureTextarea.value = element.text;
    document.body.appendChild(measureTextarea);
    const originalText = element.text;
    document.body.appendChild(editorFrame);

    const box = stage.container().getBoundingClientRect();
    const absolute = node.getAbsolutePosition();
    const stageScale = stage.scaleX();
    const scale = stageScale * (node.scaleX() || 1);
    const editorPadding = Number(element.padding ?? 6);
    const horizontalPadding = editorPadding * scale;
    const minEditorWidth = getMinimumTextResizeWidth(element.fontSize) * scale + horizontalPadding * 2;
    const minEditorHeight = getSingleLineTextEditorHeight(element.fontSize, scale);
    const persistedEditorWidth = Number(element.editWidth) || Number(node.width()) || Number(element.width) || 1;
    const persistedEditorHeight = Number(element.editHeight)
      || Number(node.height?.())
      || Number(element.height)
      || element.fontSize * 1.25;
    const editorWidth = Math.max(minEditorWidth, persistedEditorWidth * scale);
    const editorHeight = Math.max(minEditorHeight, persistedEditorHeight * scale);
    const minLiveEditorWidth = element.type === "sticky" ? editorWidth : minEditorWidth;
    const minLiveEditorHeight = element.type === "sticky" ? editorHeight : minEditorHeight;
    const maxAutoEditorWidth = editorWidth;
    let manualEditorWidth = editorWidth;
    let manualEditorHeight = editorHeight;
    let preserveEditorOnNextBlur = false;
    let editorTransforming = false;
    const getVisualTextNode = () => node.findOne?.("Text") ?? null;
    const hideVisualTextNode = () => {
      getVisualTextNode()?.hide?.();
    };
    const showVisualTextNode = () => {
      getVisualTextNode()?.show?.();
    };

    const getEditorWidth = () => Math.max(
      minEditorWidth,
      editorFrame.offsetWidth || Number.parseFloat(editorFrame.style.width) || editorWidth,
    );
    const getEditorHeight = () => Math.max(
      minEditorHeight,
      editorFrame.offsetHeight || Number.parseFloat(editorFrame.style.height) || editorHeight,
    );
    const applyNodeSizeFromEditor = () => {
      const nextWidth = getEditorWidth() / scale;
      const nextHeight = getEditorHeight() / scale;
      if (element.type === "text") {
        syncTextNodeSize(node, {
          width: nextWidth,
          height: nextHeight,
          padding: editorPadding,
        });
        return;
      }
      node.width(nextWidth);
      node.height(nextHeight);
    };

    const measureTextContentHeight = (width = getEditorWidth()) => {
      const currentFontSize = Number.parseFloat(textarea.style.fontSize) || element.fontSize * scale;
      return measureTextareaContentHeight({
        sourceTextarea: textarea,
        measureTextarea,
        width: Math.max(minEditorWidth, width),
        minHeight: currentFontSize * 1.25,
      });
    };

    const measureTextHeight = (width = getEditorWidth()) => {
      return measureTextContentHeight(width) + 2 * scale;
    };

    const setEditorSize = (width, height = measureTextHeight(width)) => {
      const nextWidth = Math.max(minLiveEditorWidth, width);
      const nextHeight = Math.max(minLiveEditorHeight, manualEditorHeight, height);
      editorFrame.style.width = `${nextWidth}px`;
      editorFrame.style.height = `${nextHeight}px`;
    };

    const getTextLineWidth = (line) => {
      return measureTextValue(element, line, element.fontSize * scale);
    };

    const fitEditorToContent = ({ expandOnly = false } = {}) => {
      const lines = textarea.value.split("\n");
      const contentWidth = Math.max(...lines.map(getTextLineWidth));
      const canAutoFitWidth = !originalText;
      const measuredAutoWidth = Math.max(minEditorWidth, Math.ceil(contentWidth + horizontalPadding * 2 + 1));
      const preferredTextWidth = getPreferredTextBoxWidth({
        text: textarea.value,
        baseWidth: maxAutoEditorWidth,
        contentWidth,
        padding: horizontalPadding,
        maxWidth: 960 * scale,
      });
      const nextWidth = element.type !== "sticky" && canAutoFitWidth && textarea.value
        ? (preferredTextWidth > maxAutoEditorWidth ? preferredTextWidth : Math.min(maxAutoEditorWidth, measuredAutoWidth))
        : getEditorWidth();
      const currentHeight = getEditorHeight();
      const contentHeight = measureTextContentHeight(nextWidth);
      const nextHeight = expandOnly && contentHeight <= currentHeight
        ? currentHeight
        : contentHeight + 2 * scale;
      setEditorSize(nextWidth, nextHeight);
      applyNodeSizeFromEditor();
      if (["text", "sticky"].includes(element.type)) {
        syncTextNodeContent(node, {
          ...element,
          text: textarea.value,
          width: getEditorWidth() / scale,
          height: getEditorHeight() / scale,
        }, { renderLatex: false });
        hideVisualTextNode();
      }
      transformer.forceUpdate();
      overlayLayer.batchDraw();
    };

    const syncEditorTransform = () => {
      const stageScale = Math.max(0.01, Number(stage.scaleX()) || 1);
      const nodeScaleX = Math.abs(Number(node.scaleX?.()) || 1);
      const nodeScaleY = Math.abs(Number(node.scaleY?.()) || 1);
      const requestedWidth = Math.max(
        minLiveEditorWidth,
        (Number(node.width?.()) || 1) * nodeScaleX * stageScale,
      );
      const requestedHeight = Math.max(
        minLiveEditorHeight,
        (Number(node.height?.()) || 1) * nodeScaleY * stageScale,
      );
      const activeAnchor = transformer.getActiveAnchor?.() ?? "";
      const resizesWidth = activeAnchor.includes("left") || activeAnchor.includes("right");
      const resizesHeight = activeAnchor.includes("top") || activeAnchor.includes("bottom");
      if (resizesWidth) {
        manualEditorWidth = requestedWidth;
      }
      if (resizesHeight) {
        manualEditorHeight = requestedHeight;
      }
      const contentHeight = measureTextContentHeight(requestedWidth);
      const visibleHeight = Math.max(
        resizesHeight ? requestedHeight : manualEditorHeight,
        contentHeight + 2 * stageScale,
      );
      setEditorSize(requestedWidth, visibleHeight);
      node.scaleX?.(1);
      node.scaleY?.(1);
      node.x?.(element.x);
      node.y?.(element.y);
      applyNodeSizeFromEditor();
      syncTextNodeContent(node, {
        ...element,
        text: textarea.value,
        width: getEditorWidth() / scale,
        height: getEditorHeight() / scale,
      }, { renderLatex: false });
      hideVisualTextNode();
      transformer.forceUpdate();
      contentLayer.batchDraw();
      overlayLayer.batchDraw();
    };

    editorFrame.style.left = `${box.left + absolute.x}px`;
    editorFrame.style.top = `${box.top + absolute.y}px`;
    setEditorSize(editorWidth, editorHeight);
    editorFrame.style.minWidth = `${minEditorWidth}px`;
    editorFrame.style.minHeight = `${minEditorHeight}px`;
    Object.assign(textarea.style, getTextEditorStyle({ element, scale, horizontalPadding }));
    if (element.type === "sticky") {
      const stickyFill = node.findOne?.("Rect")?.fill?.() ?? element.fill;
      const stickyInsets = getStickyTextInsets(element.fontSize);
      editorFrame.classList.add("is-sticky-editor");
      editorFrame.style.borderColor = getStickyBorderColor(stickyFill);
      textarea.style.padding = `${stickyInsets.y * scale}px ${stickyInsets.x * scale}px`;
    }
    editorFrame.style.transform = `rotate(${node.getAbsoluteRotation()}deg)`;
    applyNodeSizeFromEditor();
    syncTextNodeContent(node, {
      ...element,
      width: getEditorWidth() / scale,
      height: getEditorHeight() / scale,
    }, { renderLatex: false });
    hideVisualTextNode();
    transformer.nodes([node]);
    transformer.visible(true);
    transformer.resizeEnabled(true);
    transformer.rotateEnabled(false);
    transformer.enabledAnchors(getTransformerAnchorsForSelection([element], true));
    const previousBoundBoxFunc = transformer.boundBoxFunc();
    const previousAnchorDragBoundFunc = transformer.anchorDragBoundFunc();
    transformer.anchorDragBoundFunc((oldAbsPos, newAbsPos) => {
      return clampTransformerAnchorDragBySize({
        transformer,
        oldAbsPos,
        newAbsPos,
        minWidth: minEditorWidth,
        minHeight: minEditorHeight,
      });
    });
    transformer.boundBoxFunc((oldBox, newBox) => {
      if (!Number.isFinite(newBox.width) || !Number.isFinite(newBox.height)) return oldBox;
      const anchor = transformer.getActiveAnchor?.();
      const nextBox = { ...newBox };
      if (nextBox.width < minEditorWidth) {
        if (anchor?.includes("left")) nextBox.x = oldBox.x + oldBox.width - minEditorWidth;
        nextBox.width = minEditorWidth;
      }
      if (nextBox.height < minEditorHeight) {
        if (anchor?.includes("top")) nextBox.y = oldBox.y + oldBox.height - minEditorHeight;
        nextBox.height = minEditorHeight;
      }
      return nextBox;
    });
    transformer.on("transform.editor", syncEditorTransform);
    transformer.on("transformstart.editor", () => {
      editorTransforming = true;
      preserveEditorOnNextBlur = true;
    });
    transformer.on("transformend.editor", () => {
      editorTransforming = false;
      preserveEditorOnNextBlur = false;
      textarea.focus();
    });
    fitEditorToContent({ expandOnly: true });
    transformer.forceUpdate();
    overlayLayer.batchDraw();
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);

    let editorClosed = false;
    const isTransformerPointerEvent = (event) => {
      if (isTransformerTarget(event.target)) return true;
      if (
        typeof stage?.setPointersPositions !== "function"
        || typeof stage?.getPointerPosition !== "function"
        || typeof stage?.getIntersection !== "function"
      ) return false;
      try {
        stage.setPointersPositions(event);
        const pointer = stage.getPointerPosition();
        return Boolean(pointer && isTransformerTarget(stage.getIntersection(pointer)));
      } catch {
        return false;
      }
    };

    const handleEditorOutsidePointerDown = (event) => {
      if (editorClosed) return;
      if (typeof Element !== "undefined" && event.target instanceof Element) {
        if (event.target.closest("[data-react-context-menu], [data-context-menu]")) return;
      }
      const isTransformerPointer = isTransformerPointerEvent(event);
      const shouldPreserveEditor = shouldPreserveTextEditorOnPointerDown({
        target: event.target,
        editorFrame,
        isTransformer: isTransformerPointer,
      });
      if (editorFrame.contains(event.target)) return;
      if (isTransformerPointer) {
        preserveEditorOnNextBlur = true;
        return;
      }
      if (shouldPreserveEditor) {
        doCommit({ preserveEmptyText: true });
        return;
      }
      doCommit();
    };

    const cleanupEditorTransformer = () => {
      window.removeEventListener("pointerdown", handleEditorOutsidePointerDown, { capture: true });
      transformer.off(".editor");
      transformer.boundBoxFunc(previousBoundBoxFunc);
      transformer.anchorDragBoundFunc(previousAnchorDragBoundFunc);
    };

    const doCommit = ({ preserveEmptyText = false } = {}) => {
      if (editorClosed) return;
      editorClosed = true;
      isEditing = false;
      onStateChange(false);
      editorCommitRef = null;
      textOverlayController.setHiddenIds([]);
      showVisualTextNode();
      const nextText = textarea.value.trim();
      const committedWidth = getEditorWidth();
      const committedHeight = getEditorHeight();
      editorFrame.remove();
      measureTextarea.remove();
      cleanupEditorTransformer();

      if (!nextText && element.type !== "sticky" && !preserveEmptyText) {
        const boardElements = getBoardElements();
        setBoardElements(removeElementsById(boardElements, [id]));
        const selectedIds = getSelectedIds();
        setSelectedIds(selectedIds.filter((selectedId) => selectedId !== id));
        transformer.show();
        onRender();
        onHistory("已删除空文字");
        return;
      }

      const boardElements = getBoardElements();
      setBoardElements(boardElements.map((item) => {
        if (item.id !== id) return item;
        const nextFontSize = item.fontSize;
        const nextElement = {
          ...item,
          text: nextText,
          fontSize: nextFontSize,
          scaleX: 1,
          scaleY: 1,
        };
        if (item.type === "text") {
          return {
            ...nextElement,
            width: Math.max(1, Number(item.width) || 1),
            height: Math.max(1, Number(item.height) || nextFontSize * 1.25),
            editWidth: Math.max(1, manualEditorWidth / scale),
            editHeight: Math.max(1, manualEditorHeight / scale),
          };
        }
        if (item.type === "sticky") {
          const stickyBox = getStickyEditorCommitBox({
            committedWidth,
            committedHeight,
            stageScale,
          });
          nextElement.width = Math.max(element.width, stickyBox.width);
          nextElement.height = Math.max(element.height, stickyBox.height);
        }
        return nextElement;
      }));
      transformer.show();
      onRender();
      onHistory("已编辑文字");
    };

    editorCommitRef = () => doCommit();
    window.addEventListener("pointerdown", handleEditorOutsidePointerDown, { capture: true });

    const cancel = () => {
      if (editorClosed) return;
      editorClosed = true;
      isEditing = false;
      onStateChange(false);
      if (editorCommitRef) editorCommitRef = null;
      textOverlayController.setHiddenIds([]);
      showVisualTextNode();
      editorFrame.remove();
      measureTextarea.remove();
      cleanupEditorTransformer();

      if (!originalText && element.type !== "sticky") {
        const boardElements = getBoardElements();
        setBoardElements(removeElementsById(boardElements, [id]));
        const selectedIds = getSelectedIds();
        setSelectedIds(selectedIds.filter((selectedId) => selectedId !== id));
        transformer.show();
        onRender();
        onHistory("已取消空文字");
        return;
      }

      node.show();
      transformer.show();
      onRender();
    };

    textarea.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        doCommit();
      }
      if (event.key === "Escape") {
        event.preventDefault();
        cancel();
      }
    });
    textarea.addEventListener("input", fitEditorToContent);
    textarea.addEventListener("blur", () => {
      window.setTimeout(() => {
        if (preserveEditorOnNextBlur || editorTransforming || transformer.isTransforming?.()) {
          preserveEditorOnNextBlur = false;
          return;
        }
        doCommit();
      });
    });
  }

  return {
    editElement,
    get isEditing() { return isEditing; },
    get commit() { return editorCommitRef; },
  };
}
