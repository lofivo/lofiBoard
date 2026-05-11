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

    expect(markup).toContain('data-linear-field="current-index"');
    expect(markup).toContain('data-linear-field="current-value"');
    expect(markup).toContain('data-linear-field="insert-value"');
    expect(markup).toContain('data-linear-field="insert-index"');
    expect(markup).toContain('data-linear-field="swap-index"');
    expect(markup).toContain('data-linear-field="move-index"');
    expect(markup).toContain('data-linear-field="highlight-start"');
    expect(markup).toContain('data-linear-field="highlight-end"');
    expect(markup).toContain('data-linear-field="highlight-pointer"');
    expect(markup).toContain('data-action="array-insert-start"');
    expect(markup).toContain('data-action="array-insert-end"');
    expect(markup).toContain('data-action="array-insert-at"');
    expect(markup).toContain('data-action="array-delete-at"');
    expect(markup).toContain('data-action="array-set-value"');
    expect(markup).toContain('data-action="array-swap"');
    expect(markup).toContain('data-action="array-move"');
    expect(markup).toContain('data-action="array-highlight"');
    expect(markup).toContain('data-action="array-clear-highlight"');
    expect(markup).toContain('data-action="linear-index-zero"');
    expect(markup).toContain('data-action="linear-index-one"');
    expect(markup).toContain('data-action="linear-index-show"');
    expect(markup).toContain('data-action="linear-index-hide"');
    expect(markup).toContain('data-action="array-delete-end"');
    expect(markup).toContain('data-action="array-reload"');
    expect(markup).toContain('data-action="stack-push"');
    expect(markup).toContain('data-action="stack-pop"');
    expect(markup).toContain('data-action="queue-enqueue"');
    expect(markup).toContain('data-action="queue-dequeue"');
    expect(markup).toContain('data-action="deque-push-left"');
    expect(markup).toContain('data-action="deque-pop-right"');
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

  it("keeps structure inspector groups compact when collapsed", () => {
    const markup = renderShell();
    const styles = readFileSync(new URL("../../src/styles.css", import.meta.url), "utf8");

    expect(markup).toContain("linear-panel-fields-edit");
    expect(markup).toContain("linear-panel-fields-highlight");
    expect(markup).toContain("quick-actions-compact");
    expect(styles).toContain('[data-panel-mode="structure"] .style-panel');
    expect(styles).toContain('.linear-panel-group[data-collapsed="true"]');
    expect(styles).toContain(".quick-actions-linear");
  });

  it("prevents linear inspector controls from forcing the property panel wider", () => {
    const markup = renderShell();
    const styles = readFileSync(new URL("../../src/styles.css", import.meta.url), "utf8");
    const linearContentBlocks = markup.match(/class="linear-panel-content"/g) ?? [];
    const collapsedLinearGroups = markup.match(/class="linear-panel-group" data-linear-group="[^"]+" data-collapsed="true"/g) ?? [];
    const expandedLinearGroups = markup.match(/class="linear-panel-group" data-linear-group="[^"]+" data-collapsed="false"/g) ?? [];
    const linearContentInnerBlocks = markup.match(/<div class="linear-panel-content" data-linear-content="[^"]+" aria-hidden="[^"]+">\s*<div class="linear-panel-content-inner">/g) ?? [];

    expect(linearContentBlocks).toHaveLength(4);
    expect(linearContentInnerBlocks).toHaveLength(4);
    expect(expandedLinearGroups).toHaveLength(1);
    expect(collapsedLinearGroups).toHaveLength(3);
    expect(markup).toContain("linear-panel-content-inner");
    expect(styles).toMatch(/\.inspector-section-content,\n\.linear-panel-content \{[\s\S]*?min-width: 0;/);
    expect(styles).toMatch(/\.inspector-section-content > \*,\n\.linear-panel-content > \* \{[\s\S]*?min-width: 0;/);
    expect(styles).toMatch(/\.linear-panel-content-inner \{[\s\S]*?min-width: 0;/);
    expect(styles).toMatch(/\.linear-panel-content-inner \{[\s\S]*?overflow: hidden;/);
    expect(styles).toMatch(/\.linear-panel-fields \{[\s\S]*?min-width: 0;/);
    expect(styles).toMatch(/\.linear-panel-fields-edit \{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/);
    expect(styles).toMatch(/\.linear-panel-fields-edit \.linear-field-wide \{[\s\S]*?grid-column: 1 \/ -1;/);
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

  it("keeps plain text editor backgrounds transparent while sticky notes keep their fill", () => {
    const styles = readFileSync(new URL("../../src/styles.css", import.meta.url), "utf8");
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(styles).toMatch(/\.text-editor \{[\s\S]*?background: transparent;/);
    expect(appSource).toContain('if (element.type === "sticky")');
    expect(appSource).toContain("textarea.style.background = element.fill");
  });

  it("hides transformer handles while linear item drag preview is active", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(appSource).toContain("if (linearItemDragState)");
    expect(appSource).toContain("transformer.enabledAnchors([])");
    expect(appSource).toContain("transformer.visible(false)");
  });

  it("styles transformer edge handles as invisible hit areas and scales vertical edge drags uniformly", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(appSource).toContain("anchorCornerRadius: 3");
    expect(appSource).toContain('anchor.hasName("top-center") || anchor.hasName("bottom-center")');
    expect(appSource).toContain('anchor.hasName("middle-left") || anchor.hasName("middle-right")');
    expect(appSource).toContain('anchor.fill("rgba(0,0,0,0)")');
    expect(appSource).toContain("getUniformScaledBoxForVerticalResize");
  });

  it("commits text corner scaling without changing the text wrapping ratio", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(appSource).toContain("getTextScaleCommitBox");
    expect(appSource).toContain("fontSize: textCommit.fontSize");
    expect(appSource).toContain("width: textCommit.width");
    expect(appSource).not.toContain("width: node.width() * Math.abs(node.scaleX() || 1)");
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
    expect(appSource).not.toContain("setActiveLinearItem(selectedLinear.id, 0, { syncPanel: false })");
  });

  it("cancels root-node drag state when committing a linear item reorder", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(appSource).toContain("suppressSelectionDragOnce = true");
    expect(appSource).toContain("suppressedNodeDragElementId = dragState.elementId");
    expect(appSource).toContain("contentLayer.findOne(`#${dragState.elementId}`)?.stopDrag()");
    expect(appSource).toContain("nodeDragSelection = null");
    expect(appSource).toContain("selectionDrag = null");
  });

  it("selects the array from index click without auto-activating an item until the array is already selected", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(appSource).toContain("if (selectedIds.some((id) => targetIds.includes(id))) {");
    expect(appSource).toContain("setActiveLinearItem(elementId, index)");
    expect(appSource).toContain("selectIds([elementId])");
  });

  it("uses setAttrs for linear drag preview group styling and always hides the drop indicator", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(appSource).toContain("itemNode.setAttrs({");
    expect(appSource).not.toContain("itemNode.shadowBlur(");
    expect(appSource).toContain("indicator.visible(false)");
  });

  it("starts whole-array drag from index press movement even when the array is already selected", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(appSource).toContain("const pressedElementId = linearItemPressState.elementId");
    expect(appSource).toContain("if (!selectedIds.some((id) => targetIds.includes(id))) {");
    expect(appSource).toContain("beginSelectionDrag(pressStart)");
  });
});
