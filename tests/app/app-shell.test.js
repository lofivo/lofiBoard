import { describe, expect, it } from "vitest";
import { renderShell } from "../../src/app/app-shell.js";
import { readFileSync } from "node:fs";

describe("app shell", () => {
  function extractLinearInspectorMarkup(markup) {
    const start = markup.indexOf('data-inspector-section="linear"');
    const end = markup.indexOf('data-inspector-section="graph"', start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    return markup.slice(start, end);
  }

  function extractTreeInspectorMarkup(markup) {
    const start = markup.indexOf('data-inspector-section="tree"');
    const end = markup.indexOf('<aside class="layer-panel', start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    return markup.slice(start, end);
  }

  it("renders edge expand buttons for collapsed side panels", () => {
    const markup = renderShell();

    expect(markup).toContain('data-panel-edge="style"');
    expect(markup).toContain('data-panel-edge="layers"');
    expect(markup).toContain('data-style-panel-title');
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
    expect(appSource).toContain("data-layer-level");
    expect(appSource).toContain("const orderedElements = reorderElements(board.elements)");
    expect(appSource).toContain("const layerLevels = new Map(orderedElements.map((element, index) => [element.id, index]))");
    expect(styles).toContain(".layer-label");
    expect(styles).toContain(".layer-item::after");
    expect(styles).toContain("content: attr(data-layer-level)");
    expect(styles).toContain("text-overflow: ellipsis");
    expect(styles).toContain("white-space: nowrap");
    expect(styles).toMatch(/\.layer-item \{[\s\S]*?position: relative;[\s\S]*?grid-template-columns: minmax\(0, 1fr\) auto;[\s\S]*?padding: 8px 44px 8px 10px;/);
    expect(styles).toMatch(/\.layer-item::after \{[\s\S]*?content: attr\(data-layer-level\);[\s\S]*?position: absolute;[\s\S]*?top: 50%;[\s\S]*?right: 10px;/);
  });

  it("uses Fluent-style acrylic side panels without gradient decoration", () => {
    const styles = readFileSync(new URL("../../src/styles.css", import.meta.url), "utf8");
    const sidePanelStyles = [
      styles.match(/\.style-panel \{[\s\S]*?\n\}/)?.[0] ?? "",
      styles.match(/\.layer-panel \{[\s\S]*?\n\}/)?.[0] ?? "",
      styles.match(/\.inspector-section \{[\s\S]*?\n\}/)?.[0] ?? "",
      styles.match(/\.layer-item(?:,\n\.inspector-section-toggle)? \{[\s\S]*?\n\}/)?.[0] ?? "",
      styles.match(/\.brush-custom-color::before \{[\s\S]*?\n\}/)?.[0] ?? "",
      styles.match(/\.brush-style-line-dot \{[\s\S]*?\n\}/)?.[0] ?? "",
    ].join("\n");

    expect(styles).toContain("--fluent-panel-bg");
    expect(styles).toContain("--fluent-radius-lg");
    expect(sidePanelStyles).toContain("backdrop-filter: blur(24px)");
    expect(sidePanelStyles).toContain("border-radius: 24px");
    expect(sidePanelStyles).not.toMatch(/gradient\(/);
    expect(styles).toMatch(/\.layer-item\.active \{[\s\S]*?box-shadow: 0 1px 5px rgba\(15, 23, 42, 0\.08\);/);
  });

  it("uses the lightweight white property panel language across inspectors", () => {
    const styles = readFileSync(new URL("../../src/styles.css", import.meta.url), "utf8");

    expect(styles).toMatch(/\.style-panel \{[\s\S]*?border-radius: 24px;/);
    expect(styles).toMatch(/\.style-panel \{[\s\S]*?background: #ffffff;/);
    expect(styles).toMatch(/\.inspector-section \{[\s\S]*?background: transparent;/);
    expect(styles).toMatch(/\.brush-preset-row \{[\s\S]*?background: #f8fafc;/);
    expect(styles).toMatch(/\.control-text-format \{[\s\S]*?background: #f8fafc;/);
    expect(styles).toMatch(/\.quick-actions \{[\s\S]*?background: #f8fafc;/);
    expect(styles).toMatch(/\.brush-style-preset\.active \{[\s\S]*?background: #ffffff;/);
    expect(styles).toMatch(/\.control-text-format button\.active \{[\s\S]*?background: #ffffff;/);
    expect(styles).toMatch(/\.quick-actions button\.active \{[\s\S]*?background: #ffffff;/);
    expect(styles).toMatch(/\.layer-item \{[\s\S]*?border-radius: 12px;/);
  });

  it("keeps side panels compact for the whiteboard workspace", () => {
    const styles = readFileSync(new URL("../../src/styles.css", import.meta.url), "utf8");

    expect(styles).toMatch(/\.style-panel \{[\s\S]*?width: 304px;/);
    expect(styles).toMatch(/\[data-panel-mode="structure"\] \.style-panel \{[\s\S]*?width: 284px;/);
    expect(styles).toMatch(/\.layer-panel \{[\s\S]*?width: 236px;/);
  });

  it("keeps the current selection when pointer down starts on an already selected element", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(appSource).toContain("targetIds.some((id) => selectedIds.includes(id))");
    expect(appSource).toContain("beginSelectionDrag(worldPoint)");
    expect(appSource).toContain("selectElementById(targetElement, event.evt.shiftKey)");
  });

  it("lets selected elements drag from the transformer hit area while preserving anchor transforms", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(appSource).toContain("transformer.shouldOverdrawWholeArea(hasSelection && !selectedElements.some((element) => isInteractiveStructureElement(element)))");
    expect(appSource).toContain("transformer.forceUpdate()");
    expect(appSource).toContain("isTransformerAnchorTarget");
    expect(appSource).toContain("function disableTransformerHitAreaDrag()");
    expect(appSource).toContain('transformer.findOne?.(".back")?.draggable(false)');
    expect(appSource).toMatch(/if \(isTransformerTarget\(event\.target\) && !isTransformerAnchorTarget\(event\.target\)\) \{[\s\S]*?preferUnselected: true[\s\S]*?selectElementById\(passThroughId, event\.evt\.shiftKey\);[\s\S]*?if \(!event\.evt\.shiftKey\) \{[\s\S]*?beginSelectionDrag\(worldPoint\);[\s\S]*?\}[\s\S]*?return;/);
  });

  it("uses padded z-order hit testing so nested elements inside shapes stay selectable", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const selectSource = appSource.slice(
      appSource.indexOf("function handleSelectPointerDown(event, worldPoint)"),
      appSource.indexOf("function beginSelectionDrag(worldPoint)"),
    );

    expect(appSource).toContain("function getSelectableElementIdAtWorldPoint(worldPoint");
    expect(appSource).toContain("pickElementIdAtPoint");
    expect(appSource).toContain("padding: getSelectionHitRadius(stage.scaleX())");
    expect(selectSource).toContain("getSelectableElementIdAtWorldPoint(worldPoint");
    expect(selectSource).toContain("fallbackNode: event.target");
  });

  it("keeps transformer hit area from covering selected structure internals", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const syncSelectionSource = appSource.slice(
      appSource.indexOf("function syncSelectionNodes()"),
      appSource.indexOf("function disableTransformerHitAreaDrag()"),
    );

    expect(appSource).toContain("function isInteractiveStructureElement(element)");
    expect(appSource).toContain("return isLinearStructureElement(element) || element?.type === \"tree-structure\";");
    expect(syncSelectionSource).toContain("selectedElements.some((element) => isInteractiveStructureElement(element))");
    expect(syncSelectionSource).toContain("transformer.shouldOverdrawWholeArea");
  });

  it("renders newly inserted structures after switching back to select so array cells are interactive immediately", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const insertSource = appSource.slice(
      appSource.indexOf("function insertStructureFromPanel()"),
      appSource.indexOf("function isRandomStructureInitSupported"),
    );

    expect(insertSource.indexOf("setTool(TOOLS.SELECT)")).toBeGreaterThan(-1);
    expect(insertSource.indexOf("renderBoard()")).toBeGreaterThan(insertSource.indexOf("setTool(TOOLS.SELECT)"));
    expect(insertSource.indexOf("selectIds(elements.map((element) => element.id))")).toBeGreaterThan(insertSource.indexOf("renderBoard()"));
  });

  it("reuses ordinary Konva nodes across board renders", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(appSource).toContain("const nodeRegistry = new Map();");
    expect(appSource).toContain("function syncOrCreateElementNode(element)");
    expect(appSource).toContain("if (existingNode && syncElementNode(existingNode, element, getElementNodeHandlers(element)))");
    expect(appSource).toContain("nodeRegistry.set(element.id, node)");
    expect(appSource).not.toContain('contentLayer.find(".element").forEach((node) => node.destroy());');
  });

  it("skips Konva node synchronization when an element did not change", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(appSource).toContain("const nodeRenderSnapshots = new Map();");
    expect(appSource).toContain("const elementRenderSnapshotValues = new WeakMap();");
    expect(appSource).toContain("function createElementRenderSnapshot(element)");
    expect(appSource).toContain("const cachedSnapshot = elementRenderSnapshotValues.get(element);");
    expect(appSource).toContain("const handlerSnapshot = getElementRenderHandlerSnapshot(element);");
    expect(appSource).toContain("canEditArrayItems: currentTool === TOOLS.SELECT && !isTemporaryPanActive()");
    expect(appSource).toMatch(/if \(existingNode && previousSnapshot === nextSnapshot\) \{[\s\S]*?return existingNode;[\s\S]*?\}/);
    expect(appSource).toMatch(/if \(existingNode && syncElementNode\(existingNode, element, getElementNodeHandlers\(element\)\)\) \{[\s\S]*?nodeRenderSnapshots\.set\(element\.id, nextSnapshot\);/);
    expect(appSource).toMatch(/nodeRegistry\.set\(element\.id, node\);[\s\S]*?nodeRenderSnapshots\.set\(element\.id, nextSnapshot\);/);
    expect(appSource).toMatch(/node\.destroy\(\);[\s\S]*?nodeRegistry\.delete\(id\);[\s\S]*?nodeRenderSnapshots\.delete\(id\);/);
  });

  it("renders array structure quick edit actions", () => {
    const markup = renderShell();
    const linearMarkup = extractLinearInspectorMarkup(markup);
    const treeMarkup = extractTreeInspectorMarkup(markup);
    const generalTreeMarkup = treeMarkup.slice(
      treeMarkup.indexOf('class="quick-actions quick-actions-tree"'),
      treeMarkup.indexOf('class="quick-actions quick-actions-binary-tree"'),
    );
    const binaryTreeMarkup = treeMarkup.slice(treeMarkup.indexOf('class="quick-actions quick-actions-binary-tree"'));

    expect(linearMarkup).not.toContain('data-linear-title');
    expect(linearMarkup).not.toContain("数组</span>");
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
    expect(markup).toContain('data-linear-values-input');
    expect(markup).toContain('data-linear-values-title');
    expect(markup).toContain("当前结构");
    expect(markup).toContain('data-action="linear-apply-values"');
    expect(markup.indexOf('data-action="linear-apply-values"')).toBeLessThan(markup.indexOf('data-linear-field="highlight-start"'));
    expect(markup).toContain('class="linear-values-header"');
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
    expect(markup).not.toContain('data-linear-group=');
    expect(markup).not.toContain('data-linear-toggle=');
    expect(markup).not.toContain("linear-panel-heading");
    expect(markup).not.toContain("linear-panel-chevron");
    expect(markup).not.toContain("高亮与下标");
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
    expect(markup).toContain('data-graph-structure-input');
    expect(markup).toContain("当前图结构");
    expect(markup).toContain('data-action="graph-apply-structure"');
    expect(markup.indexOf('data-action="graph-apply-structure"')).toBeLessThan(markup.indexOf('data-action="graph-add-node"'));
    expect(markup).toContain('class="structure-values-header"');
    expect(treeMarkup).not.toContain('data-action="tree-add-node"');
    expect(treeMarkup).not.toContain('data-action="tree-connect-mode"');
    expect(treeMarkup).not.toContain('data-action="tree-add-left"');
    expect(treeMarkup).not.toContain('data-action="tree-add-right"');
    expect(treeMarkup).not.toContain('data-action="tree-set-value"');
    expect(treeMarkup).not.toContain('data-action="tree-delete-subtree"');
    expect(generalTreeMarkup).toContain('data-action="tree-highlight-level"');
    expect(generalTreeMarkup).toContain("层序遍历");
    expect(generalTreeMarkup).toContain('data-action="tree-highlight-preorder"');
    expect(generalTreeMarkup).toContain("前序遍历");
    expect(generalTreeMarkup).not.toContain('data-action="tree-highlight-inorder"');
    expect(generalTreeMarkup).toContain('data-action="tree-highlight-postorder"');
    expect(generalTreeMarkup).toContain("后序遍历");
    expect(generalTreeMarkup).not.toContain('data-action="tree-step-next"');
    expect(generalTreeMarkup).not.toContain('data-action="tree-step-prev"');
    expect(generalTreeMarkup).toContain('data-action="tree-clear-highlight"');
    expect(treeMarkup).not.toContain('data-action="tree-collapse-subtree"');
    expect(treeMarkup).not.toContain('data-action="tree-expand-subtree"');
    expect(generalTreeMarkup).not.toContain('data-action="tree-copy-subtree"');
    expect(generalTreeMarkup).not.toContain("导出边表");
    expect(treeMarkup).not.toContain('data-action="tree-move-subtree"');
    expect(treeMarkup).not.toContain('data-action="tree-delete-node"');
    expect(treeMarkup).not.toContain('data-action="tree-layout"');
    expect(treeMarkup).not.toContain('data-action="tree-reload"');
    expect(treeMarkup).toContain('data-tree-structure-input');
    expect(treeMarkup).toContain('data-action="tree-apply-structure"');
    expect(treeMarkup.indexOf('data-action="tree-apply-structure"')).toBeLessThan(treeMarkup.indexOf('class="quick-actions quick-actions-tree"'));
    expect(binaryTreeMarkup).toContain('data-action="tree-highlight-inorder"');
    expect(binaryTreeMarkup).toContain("前序遍历");
    expect(binaryTreeMarkup).toContain("中序遍历");
    expect(binaryTreeMarkup).toContain("后序遍历");
    expect(binaryTreeMarkup).toContain("清除高亮");
    expect(markup).toContain('class="structure-values-header"');
    expect(markup).not.toContain('data-section-toggle="tree"');
    expect(markup).not.toContain('class="inspector-section-title">树结构</span>');
    expect(markup).toContain('data-structure-type="binary-tree"');
  });

  it("uses a reduced binary tree inspector while keeping ordinary tree actions available", () => {
    const styles = readFileSync(new URL("../../src/styles.css", import.meta.url), "utf8");

    expect(styles).toContain('[data-tree-kind="general"] .quick-actions-binary-tree');
    expect(styles).toContain('[data-tree-kind="binary"] .quick-actions-tree');
    expect(styles).toContain('[data-tree-kind="binary"] [data-tree-structure-input]');
    expect(styles).toContain("min-height: 168px;");
    expect(styles).toContain(".tree-node-controls");
    expect(styles).toContain(".binary-tree-node-controls");
    expect(styles).toContain(".binary-tree-traversal-controls");
  });

  it("uses floating node controls for ordinary tree edits", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const controlSource = appSource.slice(
      appSource.indexOf("function ensureTreeNodeControls()"),
      appSource.indexOf("function ensureBinaryTreeNodeControls()"),
    );
    const actionSource = appSource.slice(
      appSource.indexOf("function runTreeNodeAction(action)"),
      appSource.indexOf("function runBinaryTreeNodeAction(action)"),
    );
    const clickSource = appSource.slice(
      appSource.indexOf("function handleTreeNodeClick({ elementId, nodeId })"),
      appSource.indexOf("function connectGraphStructureNodes"),
    );
    const pointerDownSource = appSource.slice(
      appSource.indexOf("function handleSelectPointerDown(event, worldPoint)"),
      appSource.indexOf("function beginSelectionDrag"),
    );
    const generalTreeNodeBranch = pointerDownSource.match(/if \(isGeneralTreeElement\(element\) && isTreeNodeHitTarget\(event\.target\)\) \{[\s\S]*?return;\n      \}/)?.[0] ?? "";

    expect(appSource).toContain("addTreeChild,");
    expect(appSource).toContain("addTreeSibling,");
    expect(appSource).toContain("let treeNodeControls = null;");
    expect(appSource).toContain("[data-tree-node-action]");
    expect(controlSource).toContain('data-tree-node-action="add-child"');
    expect(controlSource).toContain('data-tree-node-action="add-left-sibling"');
    expect(controlSource).toContain('data-tree-node-action="add-right-sibling"');
    expect(controlSource).toContain('data-tree-node-action="edit"');
    expect(controlSource).toContain('data-tree-node-action="delete"');
    expect(appSource).toContain("function renderTreeNodeControls()");
    expect(appSource).toContain("function renderTreeControls()");
    expect(appSource).toContain("function hideTreeControls()");
    expect(appSource).toContain("function getTreeParentNodeId(element, nodeId)");
    expect(appSource).toContain("function isTreeRootNode(element, nodeId)");
    expect(appSource).toContain("controls.querySelector(\"[data-tree-node-action='add-left-sibling']\").hidden = isRoot;");
    expect(appSource).toContain("controls.querySelector(\"[data-tree-node-action='add-right-sibling']\").hidden = isRoot;");
    expect(appSource).toContain("controls.style.left = `${stageBox.left + box.x + box.width / 2}px`;");
    expect(appSource).toContain("controls.style.top = `${stageBox.top + box.y + box.height + 8}px`;");
    expect(appSource).toContain('controls.style.transform = "translateX(-50%)";');
    expect(actionSource).toContain("addTreeChild(element, nodeId, \"0\")");
    expect(actionSource).toContain("addTreeSibling(element, nodeId, side, \"0\")");
    expect(actionSource).toContain("activeTreeNode = { elementId, nodeId };");
    expect(actionSource).toContain("editTreeStructureNode({ elementId, nodeId, label:");
    expect(clickSource).toContain("renderTreeNodeControls();");
    expect(generalTreeNodeBranch).toContain("isGeneralTreeElement(element) && isTreeNodeHitTarget(event.target)");
    expect(generalTreeNodeBranch).toContain("return;");
    expect(generalTreeNodeBranch).not.toContain("beginSelectionDrag");
    expect(pointerDownSource).toContain("isGeneralTreeElement(element) && !isTreeNodeHitTarget(event.target) && activeTreeNode?.elementId === targetElement");
    expect(pointerDownSource).toContain("hideTreeControls();");
    expect(pointerDownSource).toContain("syncGeneralTreeActiveVisual(previousActiveTreeElementId);");
    expect(appSource).toContain("if (!element || element.type !== \"tree-structure\" || element.settings?.treeKind !== \"binary\" || element.locked) return;");
    expect(appSource).toContain("renderTreeControls();");
    expect(appSource).toContain("hideTreeControls();");
  });

  it("rerenders binary tree node selection immediately and clears it from blank tree clicks", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const clickSource = appSource.slice(
      appSource.indexOf("function handleTreeNodeClick({ elementId, nodeId })"),
      appSource.indexOf("function connectGraphStructureNodes"),
    );
    const pointerDownSource = appSource.slice(
      appSource.indexOf("function handleSelectPointerDown(event, worldPoint)"),
      appSource.indexOf("function beginSelectionDrag"),
    );

    expect(appSource).toContain("function isTreeNodeHitTarget(target)");
    expect(appSource).toContain("function syncBinaryTreeActiveVisual(elementId)");
    expect(clickSource).toMatch(/if \(isBinaryTreeElement\(clickedElement\)\) \{[\s\S]*?const previousActive = activeTreeNode;[\s\S]*?activeTreeNode = \{ elementId, nodeId \};[\s\S]*?selectIds\(\[elementId\]\);[\s\S]*?syncBinaryTreeActiveVisual\(previousActive\?\.elementId\);[\s\S]*?syncBinaryTreeActiveVisual\(elementId\);/);
    expect(pointerDownSource).toContain("isBinaryTreeElement(element) && !isTreeNodeHitTarget(event.target)");
    expect(pointerDownSource).toMatch(/const previousActiveTreeElementId = activeTreeNode\.elementId;[\s\S]*?activeTreeNode = null;[\s\S]*?hideBinaryTreeControls\(\);[\s\S]*?syncBinaryTreeActiveVisual\(previousActiveTreeElementId\);/);
    expect(pointerDownSource).toMatch(/const shouldDragBinaryTreeBlank = !event\.evt\.shiftKey && targetIds\.some\(\(id\) => selectedIds\.includes\(id\)\);[\s\S]*?if \(shouldDragBinaryTreeBlank\) \{[\s\S]*?beginSelectionDrag\(worldPoint\);/);
    expect(pointerDownSource).toMatch(/if \(!event\.evt\.shiftKey && targetIds\.some\(\(id\) => selectedIds\.includes\(id\)\)\) \{[\s\S]*?beginSelectionDrag\(worldPoint\);[\s\S]*?return;/);
  });

  it("does not rebuild binary tree nodes during pointer down before dragging can start", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const pointerDownSource = appSource.slice(
      appSource.indexOf("function handleSelectPointerDown(event, worldPoint)"),
      appSource.indexOf("function beginSelectionDrag"),
    );
    const binaryBlankBranch = pointerDownSource.match(/if \(isBinaryTreeElement\(element\) && !isTreeNodeHitTarget\(event\.target\) && activeTreeNode\?\.elementId === targetElement\) \{[\s\S]*?return;\n      \}/)?.[0] ?? "";

    expect(binaryBlankBranch).toContain("syncBinaryTreeActiveVisual(previousActiveTreeElementId)");
    expect(binaryBlankBranch).toContain("beginSelectionDrag(worldPoint)");
    expect(binaryBlankBranch).not.toContain("renderBoard()");
  });

  it("lets binary tree node pointer down bubble into the whole-tree drag flow without selecting the node", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const nodePressSource = appSource.slice(
      appSource.indexOf("function handleTreeStructureNodePress(event, group)"),
      appSource.indexOf("function moveArrayStructureItem"),
    );

    expect(nodePressSource).toContain("if (!selectedIds.includes(elementId)) selectIds([elementId]);");
    expect(nodePressSource).toContain("const worldPoint = getWorldPointer(stage);");
    expect(nodePressSource).toContain("if (!event.evt?.shiftKey && worldPoint) beginSelectionDrag(worldPoint);");
    expect(nodePressSource).not.toContain("activeTreeNode = { elementId, nodeId };");
    expect(nodePressSource).not.toContain("activeTreeNode = null;");
    expect(nodePressSource).not.toContain("syncBinaryTreeActiveVisual");
    expect(nodePressSource).not.toContain("syncGeneralTreeActiveVisual");
    expect(nodePressSource).not.toContain("event.cancelBubble = true");
  });

  it("disables native node dragging while selected elements use selection drag", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const beginDragSource = appSource.slice(
      appSource.indexOf("function beginSelectionDrag(worldPoint)"),
      appSource.indexOf("function updateSelectionDrag(worldPoint)"),
    );
    const finishDragSource = appSource.slice(
      appSource.indexOf("function finishSelectionDrag()"),
      appSource.indexOf("function beginNodeDragSelection(node)"),
    );

    expect(appSource).toContain("function setSelectionDragNodeDraggable(enabled)");
    expect(appSource).toContain("function isSelectionDragElement(elementId)");
    expect(appSource).toContain("&& !isSelectionDragElement(element.id)");
    expect(appSource).toContain("&& !isSelectionDragElement(id)");
    expect(beginDragSource).toContain("setSelectionDragNodeDraggable(false);");
    expect(finishDragSource.indexOf("setSelectionDragNodeDraggable(true);")).toBeLessThan(finishDragSource.indexOf("selectionDrag = null;"));
  });

  it("locks selection identity until an active selection drag finishes", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const finishDragSource = appSource.slice(
      appSource.indexOf("function finishSelectionDrag()"),
      appSource.indexOf("function setSelectionDragNodeDraggable(enabled)"),
    );
    const onSelectSource = appSource.slice(
      appSource.indexOf("onSelect: (event, node) => {"),
      appSource.indexOf("onEdit: (event, node) => {"),
    );

    expect(appSource).toContain("let suppressNextSelectionClick = false;");
    expect(finishDragSource).toContain("suppressNextSelectionClick = true;");
    expect(onSelectSource).toContain("if (suppressNextSelectionClick) {");
    expect(onSelectSource).toContain("suppressNextSelectionClick = false;");
    expect(onSelectSource.indexOf("if (suppressNextSelectionClick)")).toBeLessThan(onSelectSource.indexOf("selectElementById(id, event.evt.shiftKey);"));
  });

  it("opens the selected text editor when the transformer back area receives the second click", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const handlerSource = appSource.slice(
      appSource.indexOf("function handleTransformerDoubleClick(event)"),
      appSource.indexOf("function handleSelectPointerDown(event, worldPoint)"),
    );

    expect(appSource).toContain('transformer.on("dblclick dbltap", handleTransformerDoubleClick)');
    expect(handlerSource).toContain("getSelectableElementIdAtWorldPoint(worldPoint)");
    expect(handlerSource).toContain("const editable = board.elements.find((item) => item.id === id)");
    expect(handlerSource).toContain("shouldEditTextOnTransformerDoubleClick({");
    expect(handlerSource).toContain("target: event.target");
    expect(handlerSource).toContain("selectedIds");
    expect(handlerSource).toContain("event.cancelBubble = true");
    expect(handlerSource).toContain("requestAnimationFrame(() => editTextElement(id))");
  });

  it("suppresses the binary tree node click emitted after dragging the whole tree", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const finishDragSource = appSource.slice(
      appSource.indexOf("function finishSelectionDrag()"),
      appSource.indexOf("function setSelectionDragNodeDraggable(enabled)"),
    );
    const clickSource = appSource.slice(
      appSource.indexOf("function handleTreeNodeClick({ elementId, nodeId })"),
      appSource.indexOf("function connectGraphStructureNodes"),
    );

    expect(appSource).toContain("let suppressedBinaryTreeNodeClickElementIds = new Set();");
    expect(finishDragSource).toContain("suppressBinaryTreeNodeClickAfterDrag();");
    expect(clickSource).toContain("consumeSuppressedBinaryTreeNodeClick(elementId)");
    expect(clickSource.indexOf("consumeSuppressedBinaryTreeNodeClick(elementId)")).toBeLessThan(clickSource.indexOf("activeTreeNode = { elementId, nodeId };"));
  });

  it("renders the linear structure inspector without an outer category title", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const markup = renderShell();
    const linearMarkup = extractLinearInspectorMarkup(markup);

    expect(linearMarkup).toContain('data-inspector-section="linear"');
    expect(linearMarkup).toContain('data-section-content="linear"');
    expect(linearMarkup).not.toContain('data-section-toggle="linear"');
    expect(linearMarkup).not.toContain('data-linear-title');
    expect(linearMarkup).not.toContain("数组</span>");
    expect(appSource).not.toContain("linearTitle");
    expect(appSource).not.toContain("function getLinearInspectorTitle");
  });

  it("syncs and applies the linear structure values input from the property panel", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(appSource).toContain('const linearValuesInput = root.querySelector("[data-linear-values-input]")');
    expect(appSource).toContain("let linearValuesDraft = \"\";");
    expect(appSource).toContain('linearValuesInput?.addEventListener("input", () => {');
    expect(appSource).toContain("linearValuesDraft = linearValuesInput.value;");
    expect(appSource).toMatch(/import \{[\s\S]*?updateArrayValues,[\s\S]*?\} from "\.\.\/structures\/structure-templates\.js";/);
    expect(appSource).toContain('"linear-apply-values": () => editSelectedArrayStructure((element) => updateArrayValues(element, linearValuesDraft))');
    expect(appSource).not.toContain('runAction("linear-apply-values")');
    expect(appSource).not.toContain("button.dataset.linearValuesAction !== undefined");
    expect(appSource).toContain('linearValuesInput.value = (element.items ?? []).map((item) => item.value ?? "").join(",")');
    expect(appSource).toContain('linearValuesTitle.textContent = `当前${getLinearStructureDisplayName(element.type)}结构`;');
    expect(appSource).not.toContain('[data-structure-selection]:not([data-structure-selection="array-structure"]) [data-linear-values-field]');
  });

  it("syncs and applies graph structure input from the property panel", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(appSource).toContain('const graphStructureInput = root.querySelector("[data-graph-structure-input]")');
    expect(appSource).toContain('graphStructureInput?.addEventListener("input", () => {');
    expect(appSource).toContain("graphStructureDraft = graphStructureInput.value;");
    expect(appSource).toContain('"graph-apply-structure": () => editSelectedStructure("graph-structure", (element) => updateGraphFromInput(element, graphStructureDraft), "已更新图")');
    expect(appSource).toContain('graphStructureInput.value = element ? exportGraph(element, "edge-list") : "";');
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

  it("renders linear structure controls flat without inner categories or folding", () => {
    const markup = renderShell();
    const styles = readFileSync(new URL("../../src/styles.css", import.meta.url), "utf8");
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(markup).not.toContain("linear-panel-fields-edit");
    expect(markup).toContain("linear-panel-fields-highlight");
    expect(markup).toContain("quick-actions-compact");
    expect(markup).not.toContain("linear-panel-group");
    expect(markup).not.toContain('class="linear-panel-content"');
    expect(markup).not.toContain("linear-panel-toggle");
    expect(styles).toContain('[data-panel-mode="structure"] .style-panel');
    expect(styles).not.toContain('.linear-panel-group[data-collapsed="true"]');
    expect(styles).toContain(".quick-actions-linear");
    expect(appSource).toContain('appearance: context === "appearance"');
    expect(appSource).not.toContain("function applyLinearGroupState()");
    expect(appSource).not.toContain("linearGroupState");
  });

  it("prevents linear inspector controls from forcing the property panel wider", () => {
    const markup = renderShell();
    const styles = readFileSync(new URL("../../src/styles.css", import.meta.url), "utf8");

    expect(markup).toContain("linear-panel-content-inner");
    expect(markup).not.toContain('class="linear-panel-content"');
    expect(markup).not.toContain("data-linear-content");
    expect(styles).toMatch(/\.inspector-section-content \{[\s\S]*?min-width: 0;/);
    expect(styles).toMatch(/\.inspector-section-content > \* \{[\s\S]*?min-width: 0;/);
    expect(styles).toMatch(/\.linear-panel-content-inner \{[\s\S]*?min-width: 0;/);
    expect(styles).toMatch(/\.linear-panel-content-inner \{[\s\S]*?overflow: hidden;/);
    expect(styles).toMatch(/\.linear-panel-fields \{[\s\S]*?min-width: 0;/);
    expect(styles).toMatch(/\.linear-panel-fields-highlight \{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/);
    expect(styles).toMatch(/\.quick-actions \{[\s\S]*?min-width: 0;/);
    expect(styles).toMatch(/\.quick-actions-compact button \{[\s\S]*?white-space: normal;/);
    expect(styles).toMatch(/\.quick-actions-compact button \{[\s\S]*?overflow-wrap: anywhere;/);
  });

  it("keeps linear panel indexes in sync with zero-based and one-based settings", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(appSource).toContain("function getLinearIndexBase(element)");
    expect(appSource).toContain("function toLinearDisplayIndex(element, index)");
    expect(appSource).toContain("function readLinearDisplayIndexField(fieldName, element, fallback = 0)");
    expect(appSource).toContain('highlightPointer: String(toLinearDisplayIndex(element, pointer))');
    expect(appSource).toContain('pointer: readLinearDisplayIndexField("highlightPointer", element, getActiveLinearIndex(element, 0))');
  });

  it("renders a brush inspector with a horizontal width slider", () => {
    const markup = renderShell();
    const styles = readFileSync(new URL("../../src/styles.css", import.meta.url), "utf8");
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(markup).toContain("brush-inspector");
    expect(markup).toContain("brush-preset-row");
    expect(markup).toContain("data-brush-width-slider");
    expect(markup).toContain("brush-preview-card");
    expect(markup).toContain("data-brush-preview-path");
    expect(markup).toContain('aria-label="画笔粗细"');
    expect(markup).not.toContain("data-brush-width=\"2\"");
    expect(markup).not.toContain("data-brush-width=\"14\"");
    expect(markup).toContain("data-brush-style-option=\"dot\"");
    expect(markup).toContain("data-brush-custom-color");
    expect(styles).toContain(".brush-inspector");
    expect(styles).toContain(".brush-width-control");
    expect(styles).toContain(".brush-preview-card");
    expect(styles).toContain(".brush-slider-row");
    expect(styles).toContain(".brush-preset-button");
    expect(styles).toContain(".brush-custom-color");
    expect(styles).toContain(".brush-style-preset.active");
    expect(styles).toContain(".brush-style-line-dot::before");
    expect(styles).toContain("18px 0 0 #111827");
    expect(styles).toMatch(/\.brush-inspector \{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/);
    expect(styles).toMatch(/\.brush-field-cap,\n\.brush-field-style \{[\s\S]*?grid-column: span 1;/);
    expect(styles).toMatch(/\.brush-field-color,\n\.brush-field-width,\n\.brush-field-opacity,\n\.brush-field-font-family,\n\.brush-field-font-size,\n\.brush-field-text-format \{[\s\S]*?grid-column: 1 \/ -1;/);
    expect(styles).toMatch(/\.brush-style-line \{[\s\S]*?width: 26px;/);
    expect(styles).toMatch(/\.brush-field-opacity,\n\.brush-field-smoothing,\n\.brush-field-cap \{[\s\S]*?align-self: end;/);
    expect(appSource).toContain("brushWidthSlider");
    expect(appSource).toContain("brushPreviewPath");
    expect(appSource).toContain("syncBrushPreview");
    expect(appSource).toContain('brushPreviewPath.setAttribute("stroke-opacity", String(getBrushOpacityValue()))');
    expect(appSource).not.toContain("getBrushOpacity()");
    expect(appSource).toContain("syncBrushWidthControl");
    expect(appSource).not.toContain("[data-brush-width]");
    expect(appSource).toContain("brushCustomColorInput");
    expect(appSource).toContain("syncBrushPresetButtons");
  });

  it("syncs visible text and sticky typography controls from the selected element", () => {
    const markup = renderShell();
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(markup).toContain('data-ui-control="font-size"');
    expect(markup).toContain('data-ui-control="sticky-font-size"');
    expect(appSource).toMatch(/function hydrateControlsFromElement\(element\) \{[\s\S]*?syncTextInspectorControls\(element\);[\s\S]*?syncShapeEndpointControls\(\);/);
    expect(appSource).toContain("function syncTextInspectorControls(element = null)");
    expect(appSource).toContain('root.querySelectorAll("[data-ui-control=\'font-size\'], [data-ui-control=\'sticky-font-size\']")');
    expect(appSource).toMatch(/input\.value = fontSizeValue;/);
    expect(appSource).toContain('input.value = element?.type === "sticky" && element.fill && element.fill !== "transparent"');
  });

  it("flattens the brush tool inspector without the appearance section chrome", () => {
    const styles = readFileSync(new URL("../../src/styles.css", import.meta.url), "utf8");

    expect(styles).toMatch(/\[data-panel-mode="brush"\] \.inspector-section\[data-inspector-section="appearance"\],[\s\S]*?\{[\s\S]*?border: 0;/);
    expect(styles).toMatch(/\[data-panel-mode="brush"\] \.inspector-section\[data-inspector-section="appearance"\],[\s\S]*?\{[\s\S]*?background: transparent;/);
    expect(styles).toMatch(/\[data-panel-mode="brush"\] \.inspector-section\[data-inspector-section="appearance"\] > \.inspector-section-toggle,[\s\S]*?\{[\s\S]*?display: none;/);
  });

  it("keeps sticky note text color controls full width like text color controls", () => {
    const markup = renderShell();
    const styles = readFileSync(new URL("../../src/styles.css", import.meta.url), "utf8");

    expect(markup).toContain('aria-label="文字颜色"');
    expect(markup).toContain('aria-label="便签字体颜色"');
    expect(styles).toMatch(/\.brush-field-text-color \{[\s\S]*?grid-column: 1 \/ -1;/);
  });

  it("shows tailored shape and coordinate-plane controls in the property panel", () => {
    const markup = renderShell();
    const styles = readFileSync(new URL("../../src/styles.css", import.meta.url), "utf8");
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(markup).toContain("shape-endpoint-inspector");
    expect(markup).toContain('data-control="arrow-double-ended"');
    expect(markup).toContain("brush-field-fill");
    expect(markup).toContain("brush-color-label-default");
    expect(markup).toContain("brush-color-label-border");
    expect(markup).toContain("边框颜色");
    expect(markup).toContain("填充颜色");
    expect(markup).toContain("shape-width-fill-row");
    expect(markup).toContain("双箭头");
    expect(markup).toContain("coordinate-inspector");
    expect(markup).toContain('data-ui-control="coordinate-unit-size"');
    expect(markup).toContain('data-ui-control="coordinate-show-grid"');
    expect(markup).toContain('data-ui-control="coordinate-grid-color"');
    expect(styles).toMatch(/\[data-panel-mode="tool"\] \.brush-inspector,[\s\S]*?\[data-panel-mode="linear-tool"\] \.brush-inspector,[\s\S]*?\[data-panel-mode="coordinate-tool"\] \.coordinate-inspector,[\s\S]*?\[data-panel-mode="coordinate"\] \.coordinate-inspector \{[\s\S]*?display: grid !important;/);
    expect(styles).toMatch(/\[data-panel-mode="tool"\]\[data-active-shape="rect"\] \.shape-fill-inspector,[\s\S]*?\[data-panel-mode="element"\]\[data-active-shape="ellipse"\] \.shape-fill-inspector \{[\s\S]*?display: grid;/);
    expect(styles).toMatch(/\[data-panel-mode\]:not\(\[data-panel-mode="multi"\]\)\[data-active-shape="line"\] \.shape-fill-inspector,[\s\S]*?\[data-panel-mode\]:not\(\[data-panel-mode="multi"\]\)\[data-active-shape="arrow"\] \.shape-fill-inspector \{[\s\S]*?display: none !important;/);
    expect(styles).toMatch(/\[data-panel-mode="linear-tool"\]\[data-active-shape="arrow"\] \.shape-endpoint-inspector,[\s\S]*?\[data-panel-mode="linear"\]\[data-active-shape="arrow"\] \.shape-endpoint-inspector \{[\s\S]*?display: grid;/);
    expect(styles).toMatch(/\[data-panel-mode\]:not\(\[data-panel-mode="multi"\]\)\[data-active-shape="rect"\] \.shape-endpoint-inspector,[\s\S]*?\[data-panel-mode\]:not\(\[data-panel-mode="multi"\]\)\[data-active-shape="ellipse"\] \.shape-endpoint-inspector,[\s\S]*?\[data-panel-mode\]:not\(\[data-panel-mode="multi"\]\)\[data-active-shape="line"\] \.shape-endpoint-inspector \{[\s\S]*?display: none !important;/);
    expect(styles).toMatch(/\[data-panel-mode="tool"\] \.brush-preview-card,[\s\S]*?\[data-panel-mode="linear-tool"\] \.brush-preview-card,[\s\S]*?\[data-panel-mode="element"\] \.brush-preview-card,[\s\S]*?\[data-panel-mode="linear"\] \.brush-preview-card \{[\s\S]*?display: none;/);
    expect(styles).toMatch(/\.shape-width-fill-row \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\) auto;/);
    expect(styles).toMatch(/\.shape-width-fill-row > \.brush-field-width,[\s\S]*?\.shape-width-fill-row > \.shape-fill-inspector,[\s\S]*?\.shape-width-fill-row > \.shape-endpoint-inspector \{[\s\S]*?grid-column: auto;/);
    expect(styles).toMatch(/\[data-panel-mode="stroke"\] \.shape-fill-inspector,[\s\S]*?\[data-panel-mode="stroke"\] \.shape-endpoint-inspector \{[\s\S]*?display: none !important;/);
    expect(styles).toMatch(/\.brush-color-label-border \{[\s\S]*?display: none;/);
    expect(styles).toMatch(/\[data-panel-mode="tool"\]\[data-active-shape="rect"\] \.brush-color-label-default,[\s\S]*?\[data-panel-mode="element"\]\[data-active-shape="ellipse"\] \.brush-color-label-default \{[\s\S]*?display: none;/);
    expect(styles).toMatch(/\[data-panel-mode="tool"\]\[data-active-shape="rect"\] \.brush-color-label-border,[\s\S]*?\[data-panel-mode="element"\]\[data-active-shape="ellipse"\] \.brush-color-label-border \{[\s\S]*?display: inline;/);
    expect(styles).toMatch(/\[data-panel-mode="tool"\] \.brush-field-cap,[\s\S]*?\[data-panel-mode="linear-tool"\] \.brush-field-style,[\s\S]*?\[data-panel-mode="coordinate-tool"\] \.brush-inspector \{[\s\S]*?display: none !important;/);
    expect(appSource).toContain("arrowDoubleEndedInput");
    expect(appSource).toContain("coordinateUnitSizeInput");
    expect(appSource).toContain("applyCoordinateStyleToSelection");
    expect(appSource).toContain("hydrateCoordinateControlsFromElement");
    expect(appSource).toContain("syncShapeEndpointControls()");
    expect(appSource).toContain("masterInput.checked = uiInput.checked");
    expect(appSource).toContain("pointerAtBeginning");
    expect(appSource).toContain("pointerAtEnding");
  });

  it("does not leak shape-only fill controls into the brush inspector", () => {
    const styles = readFileSync(new URL("../../src/styles.css", import.meta.url), "utf8");

    expect(styles).not.toMatch(/^\[data-active-shape="rect"\] \.shape-fill-inspector,/m);
    expect(styles).not.toMatch(/^\[data-active-shape="ellipse"\] \.shape-fill-inspector/m);
    expect(styles).not.toMatch(/^\[data-active-shape="arrow"\] \.shape-endpoint-inspector/m);
    expect(styles).not.toMatch(/^\[data-active-shape="arrow"\] \.shape-endpoint-inspector \.control-fill-transparent/m);
    expect(styles).toMatch(/\[data-panel-mode="brush"\] \.shape-fill-inspector,[\s\S]*?\[data-panel-mode="brush"\] \.shape-endpoint-inspector,[\s\S]*?\[data-panel-mode="stroke"\] \.shape-fill-inspector,[\s\S]*?\[data-panel-mode="stroke"\] \.shape-endpoint-inspector \{[\s\S]*?display: none !important;/);
  });

  it("keeps selected brush strokes in the brush-style inspector instead of shape controls", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(appSource).toMatch(/selectedElements\.every\(\(element\) => element\.type === "stroke"\)[\s\S]*\? "brush"/);
    expect(appSource).not.toMatch(/selectedElements\.every\(\(element\) => element\.type === "stroke"\)[\s\S]*\? "stroke"/);
    expect(appSource).toContain("if (!selectedIds.includes(id)) {");
    expect(appSource).toContain("selectElementById(id);");
    expect(appSource).toContain("beginNodeDragSelection(node);");
  });

  it("drags grouped elements with one stable native anchor node", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const beginDragSource = appSource.slice(
      appSource.indexOf("function beginNodeDragSelection(node)"),
      appSource.indexOf("function updateNodeDragSelection(node)"),
    );
    const updateDragSource = appSource.slice(
      appSource.indexOf("function updateNodeDragSelection(node)"),
      appSource.indexOf("function finishNodeDragSelection(node)"),
    );

    expect(beginDragSource).toContain("selectElementById(id);");
    expect(beginDragSource).not.toContain("selectIds([id]);");
    expect(updateDragSource).toMatch(/for \(const original of nodeDragSelection\.originals\) \{[\s\S]*?if \(original\.id === nodeDragSelection\.id\) continue;[\s\S]*?selectedNode\?\.position/);
  });

  it("keeps shape inspectors tall enough without appearance section chrome", () => {
    const styles = readFileSync(new URL("../../src/styles.css", import.meta.url), "utf8");

    expect(styles).toMatch(/\[data-panel-mode="tool"\] \.style-panel,[\s\S]*?\[data-panel-mode="linear-tool"\] \.style-panel,[\s\S]*?\[data-panel-mode="element"\] \.style-panel,[\s\S]*?\[data-panel-mode="linear"\] \.style-panel \{[\s\S]*?max-height: calc\(100vh - 64px\);/);
    expect(styles).toMatch(/\[data-panel-mode="tool"\] \.style-panel,[\s\S]*?\[data-panel-mode="linear-tool"\] \.style-panel,[\s\S]*?\[data-panel-mode="element"\] \.style-panel,[\s\S]*?\[data-panel-mode="linear"\] \.style-panel \{[\s\S]*?padding-block: 14px;/);
    expect(styles).toMatch(/\[data-panel-mode="tool"\] \.panel-body,[\s\S]*?\[data-panel-mode="linear-tool"\] \.panel-body,[\s\S]*?\[data-panel-mode="element"\] \.panel-body,[\s\S]*?\[data-panel-mode="linear"\] \.panel-body \{[\s\S]*?gap: 8px;[\s\S]*?padding-right: 0;[\s\S]*?scrollbar-width: none;/);
    expect(styles).toMatch(/\[data-panel-mode="tool"\] \.brush-inspector,[\s\S]*?\[data-panel-mode="linear-tool"\] \.brush-inspector,[\s\S]*?\[data-panel-mode="element"\] \.brush-inspector,[\s\S]*?\[data-panel-mode="linear"\] \.brush-inspector \{[\s\S]*?gap: 10px;/);
    expect(styles).toMatch(/\[data-panel-mode="tool"\] \.inspector-section\[data-inspector-section="appearance"\],[\s\S]*?\[data-panel-mode="linear-tool"\] \.inspector-section\[data-inspector-section="appearance"\],[\s\S]*?\[data-panel-mode="element"\] \.inspector-section\[data-inspector-section="appearance"\],[\s\S]*?\[data-panel-mode="linear"\] \.inspector-section\[data-inspector-section="appearance"\] \{[\s\S]*?gap: 0;/);
    expect(styles).toMatch(/\[data-panel-mode="tool"\] \.inspector-section\[data-inspector-section="appearance"\] > \.inspector-section-toggle,[\s\S]*?\[data-panel-mode="linear-tool"\] \.inspector-section\[data-inspector-section="appearance"\] > \.inspector-section-toggle,[\s\S]*?\[data-panel-mode="element"\] \.inspector-section\[data-inspector-section="appearance"\] > \.inspector-section-toggle,[\s\S]*?\[data-panel-mode="linear"\] \.inspector-section\[data-inspector-section="appearance"\] > \.inspector-section-toggle \{[\s\S]*?display: none;/);
  });

  it("shows combined property controls for multi-selection and grouped selections", () => {
    const styles = readFileSync(new URL("../../src/styles.css", import.meta.url), "utf8");
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(appSource).toContain("function getSelectionInspectorCapabilities");
    expect(appSource).toContain('root.dataset.selectionHasText = String(capabilities.text)');
    expect(appSource).toContain('root.dataset.selectionHasSticky = String(capabilities.sticky)');
    expect(appSource).toContain('root.dataset.selectionHasDrawing = String(capabilities.drawing)');
    expect(appSource).toContain('root.dataset.selectionHasStroke = String(capabilities.stroke)');
    expect(appSource).toContain('root.dataset.selectionHasFillShape = String(capabilities.fillShape)');
    expect(appSource).toContain('root.dataset.selectionHasArrow = String(capabilities.arrow)');
    expect(appSource).toContain('root.dataset.selectionHasCoordinate = String(capabilities.coordinate)');
    expect(appSource).toContain('selectedElements.length > 1');
    expect(appSource).toContain('? "multi"');
    expect(appSource).toContain('["rect", "ellipse"].includes(element.type)');
    expect(appSource).toContain('if (element.type === "coordinate-plane" || element.type.endsWith?.("-structure")) return element;');

    expect(styles).toMatch(/\[data-panel-mode="multi"\] \.style-panel \{[\s\S]*?max-height: calc\(100vh - 168px\);/);
    expect(styles).not.toMatch(/\[data-panel-mode="multi"\] \.style-panel \{[\s\S]*?max-height: calc\(100vh - 64px\);/);
    expect(styles).toMatch(/\[data-panel-mode="multi"\] \.panel-body \{[\s\S]*?overflow-y: auto;/);
    expect(styles).toMatch(/\[data-panel-mode="multi"\]\[data-selection-has-drawing="true"\] \.brush-inspector \{[\s\S]*?display: grid !important;/);
    expect(styles).toContain('[data-panel-mode="multi"][data-selection-has-text="true"] .text-inspector');
    expect(styles).toContain('[data-panel-mode="multi"][data-selection-has-sticky="true"] .sticky-inspector');
    expect(styles).toMatch(/\[data-panel-mode="multi"\]\[data-selection-has-text="true"\] \.text-inspector,[\s\S]*?\[data-panel-mode="multi"\]\[data-selection-has-sticky="true"\] \.sticky-inspector \{[\s\S]*?display: grid !important;/);
    expect(styles).toMatch(/\[data-panel-mode="multi"\]\[data-selection-has-coordinate="true"\] \.coordinate-inspector \{[\s\S]*?display: grid !important;/);
    expect(styles).toMatch(/\[data-panel-mode="multi"\]\[data-selection-has-fill-shape="true"\] \.shape-fill-inspector \{[\s\S]*?display: grid !important;/);
    expect(styles).toMatch(/\[data-panel-mode="multi"\]\[data-selection-has-arrow="true"\] \.shape-endpoint-inspector \{[\s\S]*?display: grid !important;/);
    expect(styles).toMatch(/\[data-panel-mode="multi"\]\[data-selection-has-stroke="true"\] \.brush-field-cap,[\s\S]*?\[data-panel-mode="multi"\]\[data-selection-has-stroke="true"\] \.brush-field-style,[\s\S]*?\[data-panel-mode="multi"\]\[data-selection-has-stroke="true"\] \.brush-field-opacity \{[\s\S]*?display: grid !important;/);
    expect(styles).toMatch(/\[data-panel-mode="multi"\]\[data-selection-has-fill-shape="true"\]\[data-selection-has-stroke="false"\] \.brush-color-label-default \{[\s\S]*?display: none;/);
    expect(styles).toMatch(/\[data-panel-mode="multi"\]\[data-selection-has-fill-shape="true"\]\[data-selection-has-stroke="false"\] \.brush-color-label-border \{[\s\S]*?display: inline;/);
    expect(styles).not.toContain('[data-panel-mode="multi"][data-selection-has-fill-shape="true"] .brush-color-label-default');
    expect(appSource).toContain('if (controlName === "fill") syncFillTransparentControls(false);');
    expect(appSource).toContain('function syncFillTransparentControls(checked)');
    expect(appSource).toContain('const hydrateSource = getSelectionHydrateSource(selectedElements) ?? first;');
    expect(appSource).toContain('function getSelectionHydrateSource(elements)');
    expect(appSource).toContain('return elements.find((element) => ["rect", "ellipse"].includes(element.type))');
    expect(appSource).toContain('setBrushControlValue(fillInput, button.dataset.shapeFillColor, "input");');
    expect(appSource).not.toMatch(/setBrushControlValue\(fillInput, button\.dataset\.shapeFillColor, "input"\);\s*applyStyleToSelection\(\);/);
  });

  it("resets property panel controls and section state when switching tools", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(appSource).toContain("resetPropertyControlsForTool(tool)");
    expect(appSource).toContain("syncInspectorPanelState({ forceReset: true })");
    expect(appSource).toContain("colorInput.value = DEFAULT_PROPERTY_CONTROLS.color");
    expect(appSource).toContain("brushStyleInput.value = DEFAULT_PROPERTY_CONTROLS.brushStyle");
    expect(appSource).toContain("fontSizeInput.value = DEFAULT_PROPERTY_CONTROLS.fontSize");
  });

  it("preserves property panel scroll when syncing without a context reset", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(appSource).toMatch(/const shouldResetScroll = forceReset \|\| nextContext !== activeInspectorContext;/);
    expect(appSource).toMatch(/if \(shouldResetScroll\) \{[\s\S]*?panelBody\?\.scrollTo\?\.\(0, 0\);[\s\S]*?\}/);
    expect(appSource).not.toMatch(/applyInspectorSectionState\(\);\s*panelBody\?\.scrollTo\?\.\(0, 0\);/);
  });

  it("keeps the style panel hidden for text and sticky tools until an element is selected", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(appSource).toMatch(/selectedElements\.every\(\(element\) => element\.type === "text"\)[\s\S]*\? "text"/);
    expect(appSource).toMatch(/selectedElements\.every\(\(element\) => element\.type === "sticky"\)[\s\S]*\? "sticky"/);
    expect(appSource).toContain("const toolPanelModes = new Set([");
    expect(appSource).not.toContain("tool-text");
    expect(appSource).not.toContain("tool-sticky");
  });

  it("uses concrete property panel titles for single selections and configurable tools", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(appSource).toContain("const stylePanelTitle = root.querySelector(\"[data-style-panel-title]\")");
    expect(appSource).toContain("function syncPropertyPanelTitle(selectedElements = [])");
    expect(appSource).toContain("function getPropertyPanelTitle(selectedElements)");
    expect(appSource).toContain('if (selectedElements.length !== 1) return "属性";');
    expect(appSource).toContain('if (element.type === "tree-structure") return element.settings?.treeKind === "binary" ? "二叉树" : "树";');
    expect(appSource).toContain('const toolTitles = {');
    expect(appSource).toContain('[TOOLS.PEN]: "画笔"');
    expect(appSource).toContain('[TOOLS.SHAPE]: getShapeToolTitle(activeShapeTool)');
    expect(appSource).toContain('stylePanelTitle.textContent = getPropertyPanelTitle(selectedElements);');
    expect(appSource).not.toContain('[TOOLS.TEXT]: "文字"');
    expect(appSource).not.toContain('[TOOLS.STICKY]: "便签"');
    expect(appSource).not.toContain('[TOOLS.STRUCTURE]: "结构模板"');
  });

  it("uses safe closest lookups for delegated app interactions", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(appSource).toContain("function closestElement(target, selector)");
    expect(appSource).toContain('closestElement(event.target, "[data-linear-item-action]")');
    expect(appSource).toContain('closestElement(event.target, "[data-layer-id]")');
    expect(appSource).toContain('closestElement(event.target, "[data-main-menu], [data-menu-trigger]")');
    expect(appSource).not.toContain("event.target.closest(");
  });

  it("starts a drag gesture immediately after selecting an unselected text element", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(appSource).toContain('["text", "sticky"].includes(element.type)');
    expect(appSource).toContain("selectElementById(targetElement, event.evt.shiftKey)");
    expect(appSource).toContain("beginSelectionDrag(worldPoint)");
  });

  it("starts app-level drag when padded hit testing selects a nested element behind another hit target", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const selectSource = appSource.slice(
      appSource.indexOf("function handleSelectPointerDown(event, worldPoint)"),
      appSource.indexOf("function beginSelectionDrag(worldPoint)"),
    );

    expect(selectSource).toContain("const rawTargetElement = getElementIdFromNode(event.target);");
    expect(selectSource).toContain("targetElement !== rawTargetElement");
    expect(selectSource).toMatch(/selectElementById\(targetElement, event\.evt\.shiftKey\);[\s\S]*?targetElement !== rawTargetElement[\s\S]*?beginSelectionDrag\(worldPoint\);/);
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
    expect(appSource).toContain("rotateLineVisible: false");
    expect(appSource).toContain("rotateAnchorOffset: 28");
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

  it("requires a long press before selected linear items can start item reordering", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const pointerMoveSource = appSource.slice(
      appSource.indexOf("function handlePointerMove(event)"),
      appSource.indexOf("function handlePointerUp()"),
    );
    const itemPressMoveSource = pointerMoveSource.slice(
      pointerMoveSource.indexOf("if (linearItemPressState?.phase === \"start\""),
      pointerMoveSource.indexOf("if (isPanning && panStart)"),
    );
    const itemPressHandlerSource = appSource.slice(
      appSource.indexOf("function handleArrayStructureItemPress"),
      appSource.indexOf("function handleArrayStructureItemRelease"),
    );

    expect(itemPressMoveSource).not.toContain("activeLinearItem?.elementId");
    expect(itemPressMoveSource).not.toContain("beginLinearItemDrag({");
    expect(itemPressMoveSource).toContain("beginSelectionDrag(pressStart)");
    expect(itemPressHandlerSource).toContain("window.setTimeout(() =>");
    expect(itemPressHandlerSource).toContain("beginLinearItemDrag({");
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

  it("keeps whiteboard select-all from selecting browser page text", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const styles = readFileSync(new URL("../../src/styles.css", import.meta.url), "utf8");

    expect(appSource).toContain("shouldUseBrowserSelectAll");
    expect(appSource).toMatch(/if \(shouldSelectAll\(event\)\) \{[\s\S]*?if \(shouldUseBrowserSelectAll\(event\)\) return;[\s\S]*?event\.preventDefault\(\);[\s\S]*?clearNativeSelection\(\);/);
    expect(appSource).toMatch(/window\.addEventListener\("keydown", \(event\) => \{[\s\S]*?shouldSelectAll\(event\)[\s\S]*?\}, \{ capture: true \}\);/);
    expect(appSource).toMatch(/document\.addEventListener\("selectstart", \(event\) => \{[\s\S]*?isNativeTextEditingTarget\(event\.target\)[\s\S]*?event\.preventDefault\(\);[\s\S]*?\}, \{ capture: true \}\);/);
    expect(appSource.indexOf("if (shouldSelectAll(event)) {")).toBeLessThan(
      appSource.indexOf("if (isTypingInEditableControl(event.target)) return;"),
    );
    expect(appSource).toContain("clearNativeSelection();");
    expect(appSource).toContain("document.getSelection?.()?.removeAllRanges?.();");
    expect(styles).toMatch(/html,\nbody,\n#app \{[\s\S]*?user-select: none;/);
    expect(styles).toMatch(/html,\nbody,\n#app \{[\s\S]*?-webkit-user-select: none;/);
    expect(styles).toMatch(/\.app-shell input\[type="text"\],[\s\S]*?\.app-shell \[contenteditable="true"\] \{[\s\S]*?user-select: text;/);
  });

  it("cancels root-node drag state when committing a linear item reorder", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(appSource).toContain("suppressSelectionDragOnce = true");
    expect(appSource).toContain("suppressedNodeDragElementId = dragState.elementId");
    expect(appSource).toContain("contentLayer.findOne(`#${dragState.elementId}`)?.stopDrag()");
    expect(appSource).toContain("nodeDragSelection = null");
    expect(appSource).toContain("selectionDrag = null");
  });

  it("keeps array item selection suppressed until the post-drag click is consumed", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const commitSource = appSource.slice(
      appSource.indexOf("function commitLinearItemDrag()"),
      appSource.indexOf("function beginLinearPointerDrag"),
    );
    const selectSource = appSource.slice(
      appSource.indexOf("function handleArrayStructureItemSelect"),
      appSource.indexOf("function handleArrayStructureItemPress"),
    );

    expect(appSource).toContain("let suppressLinearItemSelectTimer = null;");
    expect(appSource).toContain("function suppressNextLinearItemSelect(elementId)");
    expect(appSource).toContain("function clearLinearItemSelectSuppression()");
    expect(commitSource).toContain("suppressNextLinearItemSelect(dragState.elementId)");
    expect(appSource).toContain("function suppressLinearItemSelectAfterSelectionDrag()");
    expect(appSource).toContain("if (didMove) suppressLinearItemSelectAfterSelectionDrag();");
    expect(commitSource).not.toContain("requestAnimationFrame(() =>");
    expect(selectSource).toMatch(/if \(suppressLinearItemSelect\?\.elementId === elementId\) \{[\s\S]*?clearLinearItemSelectSuppression\(\);[\s\S]*?return;/);
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

  it("keeps the current array item selected after inserting adjacent items", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const actionSource = appSource.slice(
      appSource.indexOf("function runLinearItemAction(action)"),
      appSource.indexOf("function runBinaryTreeNodeAction(action)"),
    );

    expect(actionSource).toContain("const nextActiveIndex = action === \"insert-before\" ? index + 1 : index;");
    expect(actionSource).toContain("setActiveLinearItem(elementId, nextActiveIndex);");
    expect(actionSource).not.toContain("setActiveLinearItem(elementId, insertIndex);");
  });

  it("only enables direct array item editing while the select tool is active", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(appSource).toContain("canEditArrayItems: currentTool === TOOLS.SELECT && !isTemporaryPanActive()");
  });

  it("keeps stale array item press handlers from selecting or dragging arrays while using the pen", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const selectHandlerSource = appSource.slice(
      appSource.indexOf("function handleArrayStructureItemSelect"),
      appSource.indexOf("function handleArrayStructureItemPress"),
    );
    const pressHandlerSource = appSource.slice(
      appSource.indexOf("function handleArrayStructureItemPress"),
      appSource.indexOf("function handleArrayStructureItemRelease"),
    );
    const pointerHandlerSource = appSource.slice(
      appSource.indexOf("function handleArrayPointerPress"),
      appSource.indexOf("function editArrayStructureItem"),
    );
    const setToolSource = appSource.slice(
      appSource.indexOf("function setTool(tool)"),
      appSource.indexOf("function getToolStatus(tool)"),
    );

    expect(selectHandlerSource).toContain("currentTool !== TOOLS.SELECT");
    expect(pressHandlerSource).toContain("currentTool !== TOOLS.SELECT");
    expect(pointerHandlerSource).toContain("currentTool !== TOOLS.SELECT");
    expect(setToolSource).toContain("resetLinearItemPressState()");
    expect(setToolSource).toContain("resetLinearPointerPressState()");
    expect(setToolSource).toContain("cancelSelectionDrag()");
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

    expect(appSource).toMatch(/function commitLinearPointerDrag\(\) \{[\s\S]*?suppressedNodeDragElementId = dragState\.elementId;[\s\S]*?contentLayer\.findOne\(`#\$\{dragState\.elementId\}`\)\?\.stopDrag\(\);[\s\S]*?nodeDragSelection = null;[\s\S]*?cancelSelectionDrag\(\);/);
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

    expect(appSource).toMatch(/if \(event\.code === "Space"\) \{[\s\S]*?isSpaceDown = true;[\s\S]*?classList\.add\("is-pan-ready"\);[\s\S]*?updateDraggableState\(\);[\s\S]*?hideToolCursors\(\);/);
    expect(appSource).toMatch(/if \(isSpaceDown \|\| currentTool === TOOLS\.PAN \|\| event\.evt\.button === 1\) \{[\s\S]*?isPanning = true;[\s\S]*?classList\.add\("is-panning"\);/);
    expect(appSource).toMatch(/if \(isPanning\) \{[\s\S]*?isPanning = false;[\s\S]*?classList\.remove\("is-panning"\);/);
    expect(appSource).toMatch(/if \(event\.code === "Space"\) \{[\s\S]*?isSpaceDown = false;[\s\S]*?classList\.remove\("is-pan-ready", "is-panning"\);[\s\S]*?updateDraggableState\(\);/);
    expect(appSource).toContain("function isTemporaryPanActive()");
    expect(appSource).toMatch(/function handlePointerMove\(event\) \{[\s\S]*?if \(isTemporaryPanActive\(\) && !isPanning\) \{[\s\S]*?hideToolCursors\(\);[\s\S]*?return;[\s\S]*?\}/);
    expect(appSource).toMatch(/if \(isPanning && panStart\) \{[\s\S]*?hideToolCursors\(\);[\s\S]*?const pointer = stage\.getPointerPosition\(\);/);
    expect(appSource).toMatch(/function updateBrushCursorStyle\(\) \{[\s\S]*?if \(isTemporaryPanActive\(\)\) return;/);
    expect(appSource).toMatch(/function updateEraserCursorStyle\(\) \{[\s\S]*?if \(isTemporaryPanActive\(\)\) return;/);
  });

  it("keeps temporary spacebar panning from selecting or dragging elements", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(appSource).toMatch(/onSelect: \(event, node\) => \{[\s\S]*?if \(isTemporaryPanActive\(\) \|\| currentTool !== TOOLS\.SELECT\) return;[\s\S]*?selectElementById\(id, event\.evt\.shiftKey\);/);
    expect(appSource).toMatch(/onEdit: \(event, node\) => \{[\s\S]*?if \(isTemporaryPanActive\(\) \|\| currentTool !== TOOLS\.SELECT\) return;/);
    expect(appSource).toMatch(/function shouldElementBeDraggable\(element\) \{[\s\S]*?return currentTool === TOOLS\.SELECT[\s\S]*?&& !isTemporaryPanActive\(\)[\s\S]*?&& !element\.locked/);
    expect(appSource).toMatch(/function handleArrayStructureItemSelect\(\{ elementId, index \}\) \{[\s\S]*?if \(isTemporaryPanActive\(\) \|\| currentTool !== TOOLS\.SELECT\) return;/);
    expect(appSource).toMatch(/function handleArrayStructureItemPress\(\{ elementId, index \}\) \{[\s\S]*?if \(isTemporaryPanActive\(\) \|\| currentTool !== TOOLS\.SELECT\) return;/);
  });

  it("uses lightweight chrome updates while panning and zooming the viewport", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const panMoveBlock = appSource.match(/if \(isPanning && panStart\) \{[\s\S]*?return;\n    \}/)?.[0] ?? "";
    const wheelBlock = appSource.match(/function handleWheel\(event\) \{[\s\S]*?schedulePersistCurrentDraft\(\);\n  \}/)?.[0] ?? "";
    const centerZoomBlock = appSource.match(/function setZoomAtCenter\(requestedScale\) \{[\s\S]*?schedulePersistCurrentDraft\(\);\n  \}/)?.[0] ?? "";

    expect(appSource).toContain("function updateViewportChrome()");
    expect(panMoveBlock).toContain("updateGrid();");
    expect(panMoveBlock).not.toContain("updateChrome();");
    expect(wheelBlock).toContain("updateViewportChrome();");
    expect(wheelBlock).not.toContain("updateChrome();");
    expect(centerZoomBlock).toContain("updateViewportChrome();");
    expect(centerZoomBlock).not.toContain("updateChrome();");
  });

  it("uses shared graph and tree connect state for structure node editing", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(appSource).toContain("let structureConnectState = null;");
    expect(appSource).toContain('"tree-connect-mode": beginTreeConnectMode');
    expect(appSource).toContain("function beginTreeConnectMode()");
    expect(appSource).toContain("function handleTreeNodeClick({ elementId, nodeId })");
    expect(appSource).toContain("function runBinaryTreeNodeAction(action)");
    expect(appSource).toContain("addBinaryTreeChild(element, nodeId, side, \"0\")");
    expect(appSource).not.toContain("activeTreeNode = { elementId, nodeId: nextNode?.id ?? nodeId };");
    expect(appSource).toContain("function runBinaryTreeTraversalAction(action)");
    expect(appSource).toContain("function renderBinaryTreeTraversalControls()");
    expect(appSource).toContain("function runTreeTraversalAction(action)");
    expect(appSource).toContain("function renderTreeTraversalControls()");
    expect(appSource).toContain("isSelectedTreeElementWithTraversal(item)");
    expect(appSource).toContain("function findTreeNodeGroup(group, nodeId)");
    expect(appSource).toContain("const treeNode = findTreeNodeGroup(group, activeTreeNode.nodeId)");
    expect(appSource).toContain("runtime.activeNodeId = activeTreeNode.nodeId");
    expect(appSource).toContain("activeTreeNode?.elementId === element.id");
    expect(appSource).toContain("isTreeElementWithTraversal(element) ? stepTreeTraversalHighlight(element, direction) : element");
    expect(appSource).toContain("selectedElements.some((element) => isInteractiveStructureElement(element))");
    expect(appSource).toContain("function connectGraphStructureNodes({ elementId, sourceNodeId, targetNodeId })");
    expect(appSource).toContain("function connectTreeStructureNodes({ elementId, sourceNodeId, targetNodeId })");
    expect(appSource).toContain("function moveTreeStructureNode({ elementId, nodeId, x, y })");
    expect(appSource).toContain("function handleTreeStructureNodePress(event, group)");
    expect(appSource).not.toContain("group.startDrag");
    expect(appSource).toContain("onGraphNodeConnect: connectGraphStructureNodes");
    expect(appSource).toContain("onTreeNodeMove: moveTreeStructureNode");
    expect(appSource).toContain("onTreeNodeConnect: connectTreeStructureNodes");
    expect(appSource).toContain("getTreeConnectState:");
    expect(appSource).toContain('"tree-layout": () => editSelectedStructure("tree-structure", layoutTreeStructure');
    expect(appSource).toContain('"tree-highlight-inorder"');
    expect(appSource).toContain("function syncTreeStructurePanelState()");
    expect(appSource).not.toContain("let graphConnectState = null;");
    expect(appSource).not.toContain("let activeTreeParent = null;");
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
    expect(styles.indexOf(".stage-container.is-pan-ready")).toBeGreaterThan(styles.indexOf(".stage-container[data-tool=\"pen\"]"));
    expect(styles.indexOf(".stage-container.is-pan-ready")).toBeGreaterThan(styles.indexOf(".stage-container[data-tool=\"eraser-object\"]"));
    expect(styles).toMatch(/\.stage-container\.is-panning,[\s\S]*?\.stage-container\.is-panning \* \{[\s\S]*?cursor: var\(--cursor-panning\);/);
  });
});
