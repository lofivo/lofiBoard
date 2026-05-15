import { describe, expect, it } from "vitest";
import { renderShell } from "../../src/app/app-shell.js";
import { readFileSync } from "node:fs";

describe("app shell", () => {
  it("renders edge expand buttons for collapsed side panels", () => {
    const markup = renderShell();

    expect(markup).toContain('data-panel-edge="style"');
    expect(markup).toContain('data-panel-edge="layers"');
    expect(markup).toContain("展开属性");
    expect(markup).toContain("展开图层");
  });

  it("renders the layer panel collapsed before app hydration", () => {
    const markup = renderShell();

    expect(markup).toContain('class="layer-panel is-collapsed"');
    expect(markup).toContain('data-panel-toggle="layers"');
  });

  it("styles layer labels with ellipsis overflow", () => {
    const styles = readFileSync(new URL("../../src/styles.css", import.meta.url), "utf8");
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(appSource).toContain("layer-label");
    expect(styles).toContain(".layer-label");
    expect(styles).toContain("text-overflow: ellipsis");
    expect(styles).toContain("white-space: nowrap");
  });

  it("keeps the current selection when pointer down starts on an already selected element", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(appSource).toContain("targetIds.some((id) => selectedIds.includes(id))");
    expect(appSource).toContain("beginSelectionDrag(worldPoint)");
    expect(appSource).toContain("selectElementById(targetElement, event.evt.shiftKey)");
  });

  it("renders array structure quick edit actions", () => {
    const markup = renderShell();

    expect(markup).toContain('data-linear-title');
    expect(markup).not.toContain('data-linear-group="edit"');
    expect(markup).not.toContain("基础编辑");
    expect(markup).not.toContain('data-linear-field="current-index"');
    expect(markup).not.toContain('data-linear-field="current-value"');
    expect(markup).toContain('data-linear-field="highlight-start"');
    expect(markup).toContain('data-linear-field="highlight-end"');
    expect(markup).toContain('data-linear-field="highlight-pointer"');
    expect(markup).not.toContain('data-linear-field="insert-value"');
    expect(markup).not.toContain('data-linear-field="insert-index"');
    expect(markup).not.toContain('data-linear-field="swap-index"');
    expect(markup).not.toContain('data-linear-field="move-index"');
    expect(markup).not.toContain('data-action="array-insert-start"');
    expect(markup).not.toContain('data-action="array-insert-end"');
    expect(markup).not.toContain('data-action="array-insert-at"');
    expect(markup).not.toContain('data-action="array-delete-at"');
    expect(markup).not.toContain('data-action="array-set-value"');
    expect(markup).not.toContain('data-action="array-swap"');
    expect(markup).not.toContain('data-action="array-move"');
    expect(markup).toContain('data-action="array-highlight"');
    expect(markup).toContain('data-action="array-clear-highlight"');
    expect(markup).toContain('data-action="linear-index-zero"');
    expect(markup).toContain('data-action="linear-index-one"');
    expect(markup).toContain('data-action="linear-index-show"');
    expect(markup).toContain('data-action="linear-index-hide"');
    expect(markup).toContain('data-action="linear-pointer-show"');
    expect(markup).toContain('data-action="linear-pointer-hide"');
    expect(markup).toContain('data-action="graph-add-node"');
    expect(markup).toContain('data-action="graph-add-edge"');
    expect(markup).toContain('data-action="graph-connect-mode"');
    expect(markup).toContain('data-action="graph-add-edge-input"');
    expect(markup).toContain('data-action="graph-delete-node"');
    expect(markup).toContain('data-action="graph-delete-edge"');
    expect(markup).toContain('data-action="graph-edit-edge"');
    expect(markup).toContain('data-action="graph-directed-on"');
    expect(markup).toContain('data-action="graph-directed-off"');
    expect(markup).toContain('data-action="graph-highlight"');
    expect(markup).toContain('data-action="graph-clear-highlight"');
    expect(markup).toContain('data-action="graph-layout-circle"');
    expect(markup).toContain('data-action="graph-layout-grid"');
    expect(markup).toContain('data-action="graph-layout-layered"');
    expect(markup).toContain('data-action="graph-layout-force"');
    expect(markup).toContain('data-action="graph-export-edge-list"');
    expect(markup).toContain('data-action="graph-export-adjacency-list"');
    expect(markup).toContain('data-action="graph-export-adjacency-matrix"');
    expect(markup).toContain('data-action="graph-import-adjacency-list"');
    expect(markup).toContain('data-action="graph-import-adjacency-matrix"');
    expect(markup).toContain('data-action="graph-reload"');
    expect(markup).toContain('data-action="tree-add-node"');
    expect(markup).toContain('data-action="tree-add-left"');
    expect(markup).toContain('data-action="tree-add-right"');
    expect(markup).toContain('data-action="tree-set-value"');
    expect(markup).toContain('data-action="tree-delete-subtree"');
    expect(markup).toContain('data-action="tree-highlight-level"');
    expect(markup).toContain('data-action="tree-highlight-preorder"');
    expect(markup).toContain('data-action="tree-highlight-inorder"');
    expect(markup).toContain('data-action="tree-highlight-postorder"');
    expect(markup).toContain('data-action="tree-step-next"');
    expect(markup).toContain('data-action="tree-step-prev"');
    expect(markup).toContain('data-action="tree-clear-highlight"');
    expect(markup).toContain('data-action="tree-collapse-subtree"');
    expect(markup).toContain('data-action="tree-expand-subtree"');
    expect(markup).toContain('data-action="tree-copy-subtree"');
    expect(markup).toContain('data-action="tree-move-subtree"');
    expect(markup).toContain('data-action="tree-delete-node"');
    expect(markup).toContain('data-action="tree-reload"');
  });

  it("updates the linear inspector title to the selected structure template name", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(appSource).toContain("linearTitle");
    expect(appSource).toContain("function getLinearInspectorTitle");
    expect(appSource).toContain('"array-structure": "数组"');
    expect(appSource).toContain('"stack-structure": "栈"');
    expect(appSource).toContain('"queue-structure": "队列"');
    expect(appSource).toContain('"deque-structure": "双端队列"');
    expect(appSource).toContain('linearTitle.textContent = getLinearInspectorTitle()');
  });

  it("removes secondary linear structure action groups from the property panel", () => {
    const markup = renderShell();
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(markup).not.toContain('data-linear-group="semantic"');
    expect(markup).not.toContain('data-linear-group="more"');
    expect(markup).not.toContain("语义快捷操作");
    expect(markup).not.toContain("更多操作");
    expect(markup).not.toContain('data-action="linear-reload"');
    expect(markup).not.toContain('data-action="stack-push"');
    expect(markup).not.toContain('data-action="queue-enqueue"');
    expect(markup).not.toContain('data-action="deque-push-left"');
    expect(appSource).not.toContain("updateLinearControlVisibility()");
    expect(appSource).not.toContain("root.querySelectorAll(\"[data-linear-types]\")");
  });

  it("keeps structure inspector groups compact when collapsed", () => {
    const markup = renderShell();
    const styles = readFileSync(new URL("../../src/styles.css", import.meta.url), "utf8");
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(markup).not.toContain("linear-panel-fields-edit");
    expect(markup).toContain("linear-panel-fields-highlight");
    expect(markup).toContain("quick-actions-compact");
    expect(styles).toContain('[data-panel-mode="structure"] .style-panel');
    expect(styles).toContain('.linear-panel-group[data-collapsed="true"]');
    expect(styles).toContain(".quick-actions-linear");
    expect(appSource).toContain('appearance: context === "appearance"');
  });

  it("prevents linear inspector controls from forcing the property panel wider", () => {
    const markup = renderShell();
    const styles = readFileSync(new URL("../../src/styles.css", import.meta.url), "utf8");
    const linearContentBlocks = markup.match(/class="linear-panel-content"/g) ?? [];
    const collapsedLinearGroups = markup.match(/class="linear-panel-group" data-linear-group="[^"]+" data-collapsed="true"/g) ?? [];
    const expandedLinearGroups = markup.match(/class="linear-panel-group" data-linear-group="[^"]+" data-collapsed="false"/g) ?? [];
    const linearContentInnerBlocks = markup.match(/<div class="linear-panel-content" data-linear-content="[^"]+" aria-hidden="[^"]+">\s*<div class="linear-panel-content-inner">/g) ?? [];

    expect(linearContentBlocks).toHaveLength(1);
    expect(linearContentInnerBlocks).toHaveLength(1);
    expect(expandedLinearGroups).toHaveLength(1);
    expect(collapsedLinearGroups).toHaveLength(0);
    expect(markup).toContain("linear-panel-content-inner");
    expect(styles).toMatch(/\.inspector-section-content,\n\.linear-panel-content \{[\s\S]*?min-width: 0;/);
    expect(styles).toMatch(/\.inspector-section-content > \*,\n\.linear-panel-content > \* \{[\s\S]*?min-width: 0;/);
    expect(styles).toMatch(/\.linear-panel-content-inner \{[\s\S]*?min-width: 0;/);
    expect(styles).toMatch(/\.linear-panel-content-inner \{[\s\S]*?overflow: hidden;/);
    expect(styles).toMatch(/\.linear-panel-fields \{[\s\S]*?min-width: 0;/);
    expect(styles).toMatch(/\.linear-panel-fields-highlight \{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/);
    expect(styles).toMatch(/\.quick-actions \{[\s\S]*?min-width: 0;/);
    expect(styles).toMatch(/\.quick-actions-compact button \{[\s\S]*?white-space: normal;/);
    expect(styles).toMatch(/\.quick-actions-compact button \{[\s\S]*?overflow-wrap: anywhere;/);
  });

  it("renders an Excalidraw-like brush inspector with preset controls", () => {
    const markup = renderShell();
    const styles = readFileSync(new URL("../../src/styles.css", import.meta.url), "utf8");
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(markup).toContain("brush-inspector");
    expect(markup).toContain("brush-preset-row");
    expect(markup).toContain("data-brush-width=\"2\"");
    expect(markup).toContain("data-brush-width=\"14\"");
    expect(markup).toContain("data-brush-style-option=\"dot\"");
    expect(markup).toContain("data-brush-custom-color");
    expect(styles).toContain(".brush-inspector");
    expect(styles).toContain(".brush-preset-button");
    expect(styles).toContain(".brush-custom-color");
    expect(styles).toContain(".brush-style-preset.active");
    expect(styles).toContain("repeating-linear-gradient");
    expect(appSource).toContain("[data-brush-width]");
    expect(appSource).toContain("brushCustomColorInput");
    expect(appSource).toContain("syncBrushPresetButtons");
  });

  it("resets property panel controls and section state when switching tools", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(appSource).toContain("resetPropertyControlsForTool(tool)");
    expect(appSource).toContain("syncInspectorPanelState({ forceReset: true })");
    expect(appSource).toContain("colorInput.value = DEFAULT_PROPERTY_CONTROLS.color");
    expect(appSource).toContain("brushStyleInput.value = DEFAULT_PROPERTY_CONTROLS.brushStyle");
    expect(appSource).toContain("fontSizeInput.value = DEFAULT_PROPERTY_CONTROLS.fontSize");
  });

  it("starts a drag gesture immediately after selecting an unselected text element", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(appSource).toContain('["text", "sticky"].includes(element.type)');
    expect(appSource).toContain("selectElementById(targetElement, event.evt.shiftKey)");
    expect(appSource).toContain("beginSelectionDrag(worldPoint)");
  });

  it("keeps live text editor height aligned with committed text box normalization", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(appSource).toContain("}) + 2 * scale");
    expect(appSource).toContain("verticalGap: 2");
  });

  it("keeps the Konva text visible while the textarea only edits input", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(appSource).toContain("getTextEditorStyle");
    expect(appSource).toContain("Object.assign(textarea.style, getTextEditorStyle");
    expect(appSource).toContain("syncTextNodeContent(node, {");
    expect(appSource).toContain("text: textarea.value");
    expect(appSource).toContain("}, { renderLatex: false });");
  });

  it("uses a DOM vector overlay for rendered latex text while editing keeps source input", () => {
    const styles = readFileSync(new URL("../../src/styles.css", import.meta.url), "utf8");
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(appSource).toContain("createTextOverlayController");
    expect(appSource).toContain("textOverlayController.sync(elements)");
    expect(appSource).toContain("textOverlayController.setHiddenIds([id])");
    expect(styles).toMatch(/\.text-latex-overlay \{[\s\S]*?pointer-events: none;/);
  });

  it("normalizes sticky note scale before editing commits clear transient scale", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(appSource).toContain("getStickyScaleCommitBox");
    expect(appSource).toContain("getStickyEditorCommitBox");
    expect(appSource).toContain('if (element.type === "sticky")');
    expect(appSource).toContain("nodeScaleX: node.scaleX()");
    expect(appSource).toContain("nodeScaleY: node.scaleY()");
    expect(appSource).toContain("fontSize: stickyCommit.fontSize");
    expect(appSource).toContain("stageScale");
  });

  it("keeps text editor backgrounds transparent while Konva renders text and sticky fill", () => {
    const styles = readFileSync(new URL("../../src/styles.css", import.meta.url), "utf8");
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(styles).toMatch(/\.text-editor \{[\s\S]*?background: transparent;/);
    expect(styles).toMatch(/\.text-editor-frame\.is-sticky-editor \{[\s\S]*?box-shadow: none;/);
    expect(appSource).toContain('if (element.type === "sticky")');
    expect(appSource).toContain('editorFrame.classList.add("is-sticky-editor")');
    expect(appSource).toContain('const minLiveEditorWidth = element.type === "sticky" ? editorWidth : minEditorWidth;');
    expect(appSource).toContain('const minLiveEditorHeight = element.type === "sticky" ? editorHeight : minEditorHeight;');
    expect(appSource).toContain('element.type !== "sticky" && canAutoFitWidth && textarea.value');
    expect(appSource).toContain('const stickyFill = node.findOne?.("Rect")?.fill?.() ?? element.fill;');
    expect(appSource).toContain("const stickyInsets = getStickyTextInsets(element.fontSize)");
    expect(appSource).toContain("textarea.style.padding = `${stickyInsets.y * scale}px ${stickyInsets.x * scale}px`");
    expect(appSource).not.toContain("editorFrame.style.background = stickyFill");
    expect(appSource).toContain("editorFrame.style.borderColor = getStickyBorderColor(stickyFill)");
    expect(appSource).toContain("Math.max(element.width, stickyBox.width)");
    expect(appSource).toContain("Math.max(element.height, stickyBox.height)");
  });

  it("aligns the transparent fill checkbox with its label text", () => {
    const styles = readFileSync(new URL("../../src/styles.css", import.meta.url), "utf8");

    expect(styles).toMatch(/\.control-fill-transparent \{[\s\S]*?display: grid;/);
    expect(styles).toMatch(/\.control-fill-transparent \{[\s\S]*?grid-template-columns: auto 1fr;/);
    expect(styles).toMatch(/\.control-fill-transparent \{[\s\S]*?line-height: 1;/);
  });

  it("hides transformer handles while linear item drag preview is active", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(appSource).toContain("if (linearItemDragState)");
    expect(appSource).toContain("transformer.enabledAnchors([])");
    expect(appSource).toContain("transformer.visible(false)");
  });

  it("keeps layer ordering available through context menu commands", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const markup = renderShell();

    expect(appSource).toContain('"bring-forward": bringSelectionForward');
    expect(appSource).toContain('"send-backward": sendSelectionBackward');
    expect(appSource).toContain('"bring-front": bringSelectionToFront');
    expect(appSource).toContain('"send-back": sendSelectionToBack');
    expect(appSource).toContain("moveElementsByLayer(board.elements, selectedIds, direction)");
    expect(appSource).not.toContain("arrange:");
    expect(appSource).not.toContain("arrange: selectedIds.length > 0");
    expect(markup).not.toContain('data-section-toggle="arrange"');
  });

  it("styles transformer edge handles as invisible hit areas and applies type-aware resizing", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(appSource).toContain("anchorCornerRadius: 3");
    expect(appSource).toContain('anchor.hasName("top-center") || anchor.hasName("bottom-center")');
    expect(appSource).toContain('anchor.hasName("middle-left") || anchor.hasName("middle-right")');
    expect(appSource).toContain('anchor.fill("rgba(0,0,0,0)")');
    expect(appSource).toContain("getUniformScaledBoxForResize");
    expect(appSource).toContain("elements: getActiveTransformerElements()");
    expect(appSource).toContain("function getActiveTransformerElements()");
  });

  it("rerenders coordinate plane internals during creation and resizing instead of stretching the group", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(appSource).toContain("function rerenderCoordinatePlaneNode");
    expect(appSource).toContain('if (element.type === "coordinate-plane") {');
    expect(appSource).toContain("rerenderCoordinatePlaneNode(element, node)");
    expect(appSource).toContain("syncCoordinatePlaneTransformPreview");
    expect(appSource).toContain('transformer.on("transform", syncCoordinatePlaneTransformPreview)');
    expect(appSource).toContain("node.scaleX(1)");
    expect(appSource).toContain("node.scaleY(1)");
  });

  it("commits text corner scaling without changing the text wrapping ratio", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(appSource).toContain("getTextScaleCommitBox");
    expect(appSource).toContain("fontSize: textCommit.fontSize");
    expect(appSource).toContain("width: textCommit.width");
    expect(appSource).toContain("height: textCommit.height");
    expect(appSource).not.toContain("width: node.width() * Math.abs(node.scaleX() || 1)");
  });

  it("previews latex text resize through the vector overlay instead of hiding it", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const resizePreviewSource = appSource.slice(
      appSource.indexOf("function syncTextWidthResize()"),
      appSource.indexOf("function syncCoordinatePlaneTransformPreview()"),
    );

    expect(resizePreviewSource).toContain("syncTextOverlays({ elements: getTextOverlayPreviewElements() })");
    expect(resizePreviewSource).not.toContain("textOverlayController.setHiddenIds([id])");
    expect(appSource).toContain("transformer.on(\"transform\", syncTextTransformPreview)");
    expect(appSource).toContain("fontSize: isTextWidthResizeAnchor(anchor)");
    const transformPreviewSource = appSource.slice(
      appSource.indexOf("function syncTextTransformPreview()"),
      appSource.indexOf("function syncCoordinatePlaneTransformPreview()"),
    );
    expect(transformPreviewSource).not.toContain("node.scaleX(1)");
    expect(transformPreviewSource).not.toContain("node.scaleY(1)");
    expect(transformPreviewSource).not.toContain("syncTextNodeContent(node, previewElement");
  });

  it("samples fast eraser movement instead of erasing only the latest pointer position", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(appSource).toContain("getEraserPathSamples");
    expect(appSource).toContain("function eraseStrokeAlongPath");
    expect(appSource).toContain("eraseStrokeAlongPath(previousPoint, worldPoint, radius)");
  });

  it("lets value-cell pointer down start whole-array drag only when the array is already selected", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(appSource).toContain('event.target?.hasName?.("array-item-value-hit")');
    expect(appSource).toContain('event.target?.findAncestor?.(".array-item-value-hit")');
    expect(appSource).toContain("if (arrayValueHitNode && isLinearStructureElement(element))");
    expect(appSource).toContain("targetIds.some((id) => selectedIds.includes(id))");
    expect(appSource).toContain("beginSelectionDrag(worldPoint)");
  });

  it("does not auto-activate the first linear item just because the array itself became selected", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(appSource).toContain("if (!selectedLinear) {");
    expect(appSource).toContain("activeLinearItem = null;");
    expect(appSource).toContain("} else if (activeLinearItem?.elementId === selectedLinear.id) {");
    expect(appSource).toContain("if (activeLinearItem?.elementId !== elementId) {");
    expect(appSource).toContain("activeLinearItem = null;");
    expect(appSource).not.toContain("const fallbackIndex = activeLinearItem?.elementId === elementId ? activeLinearItem.index : 0;");
    expect(appSource).not.toContain("setActiveLinearItem(selectedLinear.id, 0, { syncPanel: false })");
  });

  it("ignores global delete shortcuts while typing in form controls", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(appSource).toContain("isTypingInEditableControl(event.target)");
    expect(appSource).toContain("if (isTypingInEditableControl(event.target)) return;");
    expect(appSource).toContain("target instanceof HTMLInputElement");
    expect(appSource).toContain("target instanceof HTMLTextAreaElement");
    expect(appSource).toContain("target?.isContentEditable");
  });

  it("cancels root-node drag state when committing a linear item reorder", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(appSource).toContain("suppressSelectionDragOnce = true");
    expect(appSource).toContain("suppressedNodeDragElementId = dragState.elementId");
    expect(appSource).toContain("contentLayer.findOne(`#${dragState.elementId}`)?.stopDrag()");
    expect(appSource).toContain("nodeDragSelection = null");
    expect(appSource).toContain("selectionDrag = null");
  });

  it("activates an array item without rerendering the clicked node before dblclick", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(appSource).toContain("selectIds([elementId])");
    expect(appSource).toContain("function handleArrayStructureItemSelect({ elementId, index })");
    expect(appSource).toContain("setActiveLinearItem(elementId, index, { rerender: false })");
    expect(appSource).toContain("syncLinearItemActiveVisual(previousActive?.elementId)");
    expect(appSource).toContain("syncLinearItemActiveVisual(elementId)");
  });

  it("clears array item active styling when the canvas selection is cleared", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(appSource).toContain("const previousActive = activeLinearItem");
    expect(appSource).toContain("syncLinearItemActiveVisual(previousActive?.elementId)");
    expect(appSource).toContain("contentLayer.batchDraw()");
  });

  it("uses setAttrs for linear drag preview group styling and always hides the drop indicator", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(appSource).toContain("itemNode.setAttrs({");
    expect(appSource).not.toContain("itemNode.shadowBlur(");
    expect(appSource).toContain("indicator.visible(false)");
  });

  it("animates the long-press array item lift and drop states", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(appSource).toContain("animateLinearItemLift");
    expect(appSource).toContain("animateLinearItemDrop");
    expect(appSource).toContain("linearItemDragState.longPressTriggered = true");
    expect(appSource).toContain("onFinish: finishLinearItemDrop");
  });

  it("keeps the dragged array item under direct pointer control during gap animations", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(appSource).toContain("if (index === linearItemDragState.fromIndex) {");
    expect(appSource).toContain("updateLinearDragVisualPosition();");
    expect(appSource).toContain("return;");
    expect(appSource).toContain("linearItemLiftTween?.destroy()");
    expect(appSource).not.toContain("itemNode.stop()");
  });

  it("renders direct array item controls around the selected item", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const styles = readFileSync(new URL("../../src/styles.css", import.meta.url), "utf8");

    expect(appSource).toContain("renderLinearItemControls");
    expect(appSource).toContain("data-linear-item-action");
    expect(appSource).toContain('"insert-before"');
    expect(appSource).toContain('"insert-after"');
    expect(appSource).toContain('"delete"');
    expect(appSource).toContain('insertArrayItem(item, insertIndex, "0")');
    expect(styles).toContain(".linear-item-controls");
  });

  it("only enables direct array item editing while the select tool is active", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(appSource).toContain("canEditArrayItems: currentTool === TOOLS.SELECT");
  });

  it("returns to the select tool after adding non-pen, non-eraser elements", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(appSource).toMatch(/function finishShape\(\) \{[\s\S]*?addElement\(element, "已添加形状"\);[\s\S]*?selectIds\(\[element\.id\]\);[\s\S]*?setTool\(TOOLS\.SELECT\);/);
    expect(appSource).toMatch(/function finishStroke\(\) \{[\s\S]*?addElement\(element, "已添加笔触"\);[\s\S]*?\}/);
    expect(appSource).toContain("setTool(nextToolAfterTextPlacement(currentTool))");
    expect(appSource).toContain("setTool(TOOLS.SELECT)");
  });

  it("opens image import from the toolbar without switching drawing tools", () => {
    const markup = renderShell();
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(markup).toContain('data-tool-action="import-image"');
    expect(markup).toContain('data-image-input type="file" accept="image/*" hidden');
    expect(appSource).toContain('root.querySelectorAll("[data-tool-action]")');
    expect(appSource).toContain('runToolAction(button.dataset.toolAction)');
    expect(appSource).toContain('"import-image": () => imageInput.click()');
    expect(appSource).toContain('insertImageFile(file, "已导入图片", { preferViewportCenter: true })');
    expect(appSource).toContain('anchor: preferViewportCenter ? "center" : "top-left"');
  });

  it("commits text and sticky editors when pointer down starts outside the editor", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(appSource).toContain("handleEditorOutsidePointerDown");
    expect(appSource).toContain("window.addEventListener(\"pointerdown\", handleEditorOutsidePointerDown, { capture: true })");
    expect(appSource).toContain("if (editorFrame.contains(event.target)) return;");
    expect(appSource).toContain("commit();");
  });

  it("prevents array cell editor outside clicks from starting a tiny selection box", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(appSource).toContain("suppressNextCanvasSelection = container.contains(event.target)");
    expect(appSource).toContain("if (suppressNextCanvasSelection) {");
    expect(appSource).toContain("window.addEventListener(\"pointerdown\", handleCellEditorOutsidePointerDown, { capture: true })");
    expect(appSource).toContain("window.removeEventListener(\"pointerdown\", handleCellEditorOutsidePointerDown, { capture: true })");
  });

  it("starts whole-array drag from index press movement even when the array is already selected", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(appSource).toContain("const pressedElementId = linearItemPressState.elementId");
    expect(appSource).toContain("if (!selectedIds.some((id) => targetIds.includes(id))) {");
    expect(appSource).toContain("beginSelectionDrag(pressStart)");
  });

  it("supports dragging the linear pointer and syncing the pointer field", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(appSource).toContain("onArrayPointerPress: handleArrayPointerPress");
    expect(appSource).toContain("function beginLinearPointerDrag");
    expect(appSource).toContain("function updateLinearPointerDrag");
    expect(appSource).toContain("setArrayPointer(item, nextIndex)");
    expect(appSource).toContain("animateLinearPointerDragVisual");
    expect(appSource).toContain("linearPanelState = {");
    expect(appSource).toContain("highlightPointer: String(nextIndex)");
  });

  it("cleans root drag state when committing a linear pointer drag", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(appSource).toMatch(/function commitLinearPointerDrag\(\) \{[\s\S]*?suppressedNodeDragElementId = dragState\.elementId;[\s\S]*?contentLayer\.findOne\(`#\$\{dragState\.elementId\}`\)\?\.stopDrag\(\);[\s\S]*?nodeDragSelection = null;[\s\S]*?selectionDrag = null;/);
    expect(appSource).toMatch(/function handleArrayPointerPress\(\{ elementId, index \}\) \{[\s\S]*?suppressedNodeDragElementId = elementId;[\s\S]*?contentLayer\.findOne\(`#\$\{elementId\}`\)\?\.stopDrag\(\);/);
  });

  it("animates linear pointer movement without rerendering the full array on every index change", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(appSource).toContain("let linearPointerTween = null");
    expect(appSource).toContain("function animateLinearPointerDragVisual");
    expect(appSource).toContain("new Konva.Tween({");
    expect(appSource).toMatch(/function updateLinearPointerDrag\(worldPoint\) \{[\s\S]*?animateLinearPointerDragVisual\(linearPointerDragState\.elementId, nextIndex\);[\s\S]*?return true;[\s\S]*?\}/);
  });

  it("lifts the linear pointer when dragging starts and drops it before rerendering on release", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(appSource).toContain("const LINEAR_POINTER_BASE_Y = -30");
    expect(appSource).toContain("const LINEAR_POINTER_DRAG_Y = -40");
    expect(appSource).toContain("function animateLinearPointerLift");
    expect(appSource).toContain("function animateLinearPointerDrop");
    expect(appSource).toMatch(/function beginLinearPointerDrag\(\{ elementId, index, worldPoint \}\) \{[\s\S]*?animateLinearPointerLift\(elementId\);[\s\S]*?updateLinearPointerDrag\(worldPoint\);/);
    expect(appSource).toMatch(/function commitLinearPointerDrag\(\) \{[\s\S]*?const finishLinearPointerDrop = \(\) => \{[\s\S]*?renderBoard\(\);[\s\S]*?selectIds\(\[dragState\.elementId\]\);[\s\S]*?\};[\s\S]*?animateLinearPointerDrop\(dragState, finishLinearPointerDrop\);/);
  });

  it("hides transformer bounds while the linear pointer is being dragged", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(appSource).toContain("if (linearItemDragState || linearPointerDragState) {");
    expect(appSource).toMatch(/if \(linearItemDragState \|\| linearPointerDragState\) \{[\s\S]*?transformer\.nodes\(\[\]\);[\s\S]*?transformer\.visible\(false\);/);
  });

  it("suppresses custom tool cursors while spacebar panning is active", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(appSource).toMatch(/if \(event\.code === "Space"\) \{[\s\S]*?isSpaceDown = true;[\s\S]*?classList\.add\("is-pan-ready"\);[\s\S]*?hideToolCursors\(\);/);
    expect(appSource).toMatch(/if \(isSpaceDown \|\| currentTool === TOOLS\.PAN \|\| event\.evt\.button === 1\) \{[\s\S]*?isPanning = true;[\s\S]*?classList\.add\("is-panning"\);/);
    expect(appSource).toMatch(/if \(isPanning\) \{[\s\S]*?isPanning = false;[\s\S]*?classList\.remove\("is-panning"\);/);
    expect(appSource).toMatch(/if \(event\.code === "Space"\) \{[\s\S]*?isSpaceDown = false;[\s\S]*?classList\.remove\("is-pan-ready", "is-panning"\);/);
    expect(appSource).toContain("function isTemporaryPanActive()");
    expect(appSource).toMatch(/function handlePointerMove\(event\) \{[\s\S]*?if \(isTemporaryPanActive\(\) && !isPanning\) \{[\s\S]*?hideToolCursors\(\);[\s\S]*?return;[\s\S]*?\}/);
    expect(appSource).toMatch(/if \(isPanning && panStart\) \{[\s\S]*?hideToolCursors\(\);[\s\S]*?const pointer = stage\.getPointerPosition\(\);/);
    expect(appSource).toMatch(/function updateBrushCursorStyle\(\) \{[\s\S]*?if \(isTemporaryPanActive\(\)\) return;/);
    expect(appSource).toMatch(/function updateEraserCursorStyle\(\) \{[\s\S]*?if \(isTemporaryPanActive\(\)\) return;/);
  });

  it("uses custom SVG cursors for select and pan tools", () => {
    const styles = readFileSync(new URL("../../src/styles.css", import.meta.url), "utf8");

    expect(styles).toContain("--cursor-select");
    expect(styles).toContain("--cursor-pan");
    expect(styles).toContain("--cursor-panning");
    expect(styles).toContain("data:image/svg+xml");
    expect(styles).toContain("fill='%23fff' stroke='%23334155'");
    expect(styles).toContain("M4.037 4.688a.495.495 0 0 1 .651-.651");
    expect(styles).toContain("M18 11V6a2 2 0 0 0-2-2");
    expect(styles).toContain("M18 11.5V9a2 2 0 0 0-2-2");
    expect(styles).not.toContain("stroke-width='5'");
    expect(styles).not.toContain("--cursor-panning: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='30' height='30' viewBox='0 0 24 24' fill='none' stroke='%232563eb'");
    expect(styles).toMatch(/\.stage-container\[data-tool="select"\] \{[\s\S]*?cursor: var\(--cursor-select\);/);
    expect(styles).toMatch(/\.stage-container\[data-tool="pan"\] \{[\s\S]*?cursor: var\(--cursor-pan\);/);
    expect(styles).toMatch(/\.stage-container\.is-pan-ready \{[\s\S]*?cursor: var\(--cursor-pan\);/);
    expect(styles).toMatch(/\.stage-container\.is-panning,[\s\S]*?\.stage-container\.is-panning \* \{[\s\S]*?cursor: var\(--cursor-panning\);/);
  });
});
