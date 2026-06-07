import {
  getTextEditorStyle,
  measureTextareaContentHeight,
  getMinimumTextResizeWidth,
  getSingleLineTextEditorHeight,
  getTransformerAnchorsForSelection,
  getUniformScaledBoxForResize,
  shouldPreserveTextEditorOnPointerDown,
  clampTransformerAnchorDragBySize,
  isTransformerTarget,
  getStickyEditorCommitBox,
  getStickyTextInsets,
  getPreferredTextBoxWidth,
  getMinimumTextBoxWidth,
  getNormalizedTextBox,
} from "../../tools/interaction-rules.js";
import {
  syncTextNodeSize,
  syncTextNodeContent,
  getStickyBorderColor,
} from "../../canvas/konva-elements.js";
import { removeElementsById } from "../../services/clipboard-service.js";

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

  function getMinimumTextElementWidth(element, fontSize = element.fontSize) {
    const padding = Number(element.padding ?? 0);
    return getMinimumTextBoxWidth({
      text: element.text,
      fontSize,
      padding,
      measureText: (value) => measureTextValue(element, value, fontSize),
    });
  }

  function getPreferredTextElementWidth(element, baseWidth = element.width) {
    const padding = Number(element.padding ?? 0);
    return getPreferredTextBoxWidth({
      text: element.text,
      baseWidth,
      contentWidth: measureTextValue(element, element.text),
      padding,
    });
  }

  function normalizeTextElementBox(element, { preserveHeight = false } = {}) {
    if (element.type !== "text") return element;
    const box = getNormalizedTextElementBox(element);
    return {
      ...element,
      width: box.width,
      height: preserveHeight && Number.isFinite(element.height) ? element.height : box.height,
      scaleX: 1,
      scaleY: 1,
    };
  }

  function getNormalizedTextElementBox(element, width = element.width) {
    const padding = Number(element.padding ?? 0);
    return getNormalizedTextBox({
      text: element.text,
      width,
      fontSize: element.fontSize,
      padding,
      lineHeight: 1.25,
      verticalGap: 2,
      measureText: (value) => measureTextValue(element, value),
    });
  }

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
    textarea.value = element.text;
    editorFrame.appendChild(textarea);
    const measureTextarea = document.createElement("textarea");
    measureTextarea.className = "text-editor text-editor-measure";
    measureTextarea.tabIndex = -1;
    measureTextarea.rows = 1;
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
    const editorWidth = Math.max(minEditorWidth, node.width() * scale);
    const editorHeight = Math.max(minEditorHeight, (node.height?.() || element.height || element.fontSize * 1.25) * scale);
    const minLiveEditorWidth = element.type === "sticky" ? editorWidth : minEditorWidth;
    const minLiveEditorHeight = element.type === "sticky" ? editorHeight : minEditorHeight;
    const maxAutoEditorWidth = editorWidth;

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

    const measureTextHeight = (width = getEditorWidth()) => {
      const currentFontSize = Number.parseFloat(textarea.style.fontSize) || element.fontSize * scale;
      return measureTextareaContentHeight({
        sourceTextarea: textarea,
        measureTextarea,
        width: Math.max(minEditorWidth, width),
        minHeight: currentFontSize * 1.25,
      }) + 2 * scale;
    };

    const setEditorSize = (width, height = measureTextHeight(width)) => {
      const nextWidth = Math.max(minLiveEditorWidth, width);
      const nextHeight = Math.max(minLiveEditorHeight, height);
      editorFrame.style.width = `${nextWidth}px`;
      editorFrame.style.height = `${nextHeight}px`;
    };

    const getTextLineWidth = (line) => {
      return measureTextValue(element, line, element.fontSize * scale);
    };

    const fitEditorToContent = () => {
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
      setEditorSize(nextWidth);
      applyNodeSizeFromEditor();
      if (["text", "sticky"].includes(element.type)) {
        syncTextNodeContent(node, {
          ...element,
          text: textarea.value,
          width: getEditorWidth() / scale,
          height: getEditorHeight() / scale,
        }, { renderLatex: false });
      }
      transformer.forceUpdate();
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
    transformer.nodes([node]);
    transformer.visible(true);
    transformer.resizeEnabled(true);
    transformer.rotateEnabled(true);
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
      const nextBox = getUniformScaledBoxForResize({
        elements: [element],
        anchor,
        oldBox,
        newBox,
        minWidth: minEditorWidth,
        minHeight: minEditorHeight,
      });
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
      const isTransformerPointer = isTransformerPointerEvent(event);
      const shouldPreserveEditor = shouldPreserveTextEditorOnPointerDown({
        target: event.target,
        editorFrame,
        isTransformer: isTransformerPointer,
      });
      if (editorFrame.contains(event.target) || isTransformerPointer) return;
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

    const applyCommittedTextToNode = (nextElement) => {
      syncTextNodeContent(node, nextElement);
      node.scaleX(1);
      node.scaleY(1);
    };

    const doCommit = ({ keepNode = false, preserveEmptyText = false } = {}) => {
      if (editorClosed) return;
      editorClosed = true;
      isEditing = false;
      onStateChange(false);
      editorCommitRef = null;
      textOverlayController.setHiddenIds([]);
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

      let committedElement = null;
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
          const nextWidth = Math.max(
            getMinimumTextElementWidth(nextElement, nextFontSize),
            committedWidth / scale,
          );
          committedElement = normalizeTextElementBox({
            ...nextElement,
            width: getPreferredTextElementWidth(nextElement, nextWidth),
            height: Math.max(nextFontSize * 1.25, committedHeight / scale),
          });
          return committedElement;
        }
        if (item.type === "sticky") {
          const stickyBox = getStickyEditorCommitBox({
            committedWidth,
            committedHeight,
            stageScale,
          });
          nextElement.width = Math.max(element.width, stickyBox.width);
          nextElement.height = Math.max(element.height, stickyBox.height);
          committedElement = nextElement;
        }
        return nextElement;
      }));
      transformer.show();
      if (keepNode && committedElement) {
        const selectedIds = getSelectedIds();
        if (!selectedIds.includes(id)) setSelectedIds([id]);
        applyCommittedTextToNode(committedElement);
        node.show();
        transformer.nodes([node]);
        transformer.forceUpdate();
        contentLayer.batchDraw();
        overlayLayer.batchDraw();
        onHistory("已编辑文字");
        return;
      }
      onRender();
      onHistory("已编辑文字");
    };

    editorCommitRef = () => doCommit();
    window.addEventListener("pointerdown", handleEditorOutsidePointerDown, { capture: true });

    const exitEditorForTransform = () => {
      doCommit({ keepNode: true, preserveEmptyText: true });
    };

    transformer.on("transformstart.editor dragstart.editor", exitEditorForTransform);

    const cancel = () => {
      if (editorClosed) return;
      editorClosed = true;
      isEditing = false;
      onStateChange(false);
      if (editorCommitRef) editorCommitRef = null;
      textOverlayController.setHiddenIds([]);
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
        if (!transformer.isTransforming?.()) doCommit();
      });
    });
  }

  return {
    editElement,
    get isEditing() { return isEditing; },
    get commit() { return editorCommitRef; },
  };
}
