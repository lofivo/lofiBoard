import { describe, expect, it } from "vitest";
import { renderShell } from "../../../src/app/shell/shell.js";
import { existsSync, readFileSync } from "node:fs";

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

  function readStagePointerSource() {
    return readFileSync(new URL("../../../src/app/shell/stage-pointer-controller.js", import.meta.url), "utf8");
  }

  function readBoardSessionActionSource() {
    return readFileSync(new URL("../../../src/app/shell/board-session/action-controller.js", import.meta.url), "utf8");
  }

  function readStructureBoardActionSource() {
    return readFileSync(new URL("../../../src/app/structures/board-action-controller.js", import.meta.url), "utf8");
  }

  function readSelectionStyleActionSource() {
    return readFileSync(new URL("../../../src/app/inspector/selection-style/action-controller.js", import.meta.url), "utf8");
  }

  function readToolActivationSource() {
    return readFileSync(new URL("../../../src/app/tools/activation-controller.js", import.meta.url), "utf8");
  }

  function readOrchestratorSource() {
    return readFileSync(new URL("../../../src/app/shell/board-orchestrator.js", import.meta.url), "utf8");
  }

  function extractStageSelectPointerDownSource(source = readStagePointerSource()) {
    return source.slice(
      source.indexOf("function handleSelectPointerDown(event, worldPoint)"),
      source.indexOf("function hasActiveDrawingPointerCapture()"),
    );
  }

  it("uses only the React browser entrypoint", () => {
    const indexSource = readFileSync(new URL("../../../index.html", import.meta.url), "utf8");

    expect(indexSource).toContain('src="/src/app/main.jsx"');
    expect(indexSource).not.toMatch(/src="\/src\/app\/main\.js"/);
    expect(existsSync(new URL("../../../src/app/main.js", import.meta.url))).toBe(false);
  });

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
    const styles = readFileSync(new URL("../../../src/styles.css", import.meta.url), "utf8");

    expect(styles).toContain(".layer-label");
    expect(styles).toContain(".layer-item::after");
    expect(styles).toContain("content: attr(data-layer-level)");
    expect(styles).toContain("text-overflow: ellipsis");
    expect(styles).toContain("white-space: nowrap");
    expect(styles).toMatch(/\.layer-item \{[\s\S]*?position: relative;[\s\S]*?grid-template-columns: minmax\(0, 1fr\) auto;[\s\S]*?padding: 8px 44px 8px 10px;/);
    expect(styles).toMatch(/\.layer-item::after \{[\s\S]*?content: attr\(data-layer-level\);[\s\S]*?position: absolute;[\s\S]*?top: 50%;[\s\S]*?right: 10px;/);
  });

  it("uses Fluent-style acrylic side panels without gradient decoration", () => {
    const styles = readFileSync(new URL("../../../src/styles.css", import.meta.url), "utf8");
    const sidePanelStyles = [
      styles.match(/\.style-panel \{[\s\S]*?\n\}/)?.[0] ?? "",
      styles.match(/\.layer-panel \{[\s\S]*?\n\}/)?.[0] ?? "",
      styles.match(/\.inspector-section \{[\s\S]*?\n\}/)?.[0] ?? "",
      styles.match(/\.layer-item(?:,\n\.inspector-section-toggle)? \{[\s\S]*?\n\}/)?.[0] ?? "",
    ].join("\n");

    expect(styles).toContain("--fluent-panel-bg");
    expect(styles).toContain("--fluent-radius-lg");
    expect(sidePanelStyles).toContain("backdrop-filter: blur(24px)");
    expect(sidePanelStyles).toContain("border-radius: 0 24px 24px 0");
    expect(sidePanelStyles).toContain("border-radius: 24px 0 0 24px");
    expect(sidePanelStyles).not.toMatch(/gradient\(/);
    expect(styles).toMatch(/\.layer-item\.active \{[\s\S]*?box-shadow: 0 1px 5px rgba\(15, 23, 42, 0\.08\);/);
  });

  it("docks side panels to the viewport edges and keeps the property panel compact", () => {
    const styles = readFileSync(new URL("../../../src/styles.css", import.meta.url), "utf8");

    expect(styles).toMatch(/\.style-panel \{[\s\S]*?left: 0;[\s\S]*?width: 260px;[\s\S]*?max-height: calc\(100vh - 64px\);/);
    expect(styles).toMatch(/\.style-panel \{[\s\S]*?border-left: 0;[\s\S]*?border-radius: 0 24px 24px 0;/);
    expect(styles).toMatch(/\[data-panel-mode="structure"\] \.style-panel \{[\s\S]*?width: 268px;[\s\S]*?max-height: calc\(100vh - 64px\);/);
    expect(styles).toMatch(/\.layer-panel \{[\s\S]*?right: 0;/);
    expect(styles).toMatch(/\.layer-panel \{[\s\S]*?border-right: 0;[\s\S]*?border-radius: 24px 0 0 24px;/);
    expect(styles).toMatch(/\.layer-panel \{[\s\S]*?width: 236px;/);
  });

  it("keeps bottom status controls flush with the viewport sides", () => {
    const styles = readFileSync(new URL("../../../src/styles.css", import.meta.url), "utf8");

    expect(styles).toMatch(/\.statusbar \{[\s\S]*?right: 0;[\s\S]*?left: 0;/);
    expect(styles).toMatch(/@media \(max-width: 760px\) \{[\s\S]*?\.statusbar \{[\s\S]*?right: 0;[\s\S]*?left: 0;/);
  });

  it("uses per-element stacking instead of a global webpage/canvas stack switch", () => {
    const styles = readFileSync(new URL("../../../src/styles.css", import.meta.url), "utf8");

    expect(styles).toMatch(/\.webpage-overlay-layer \{[\s\S]*?pointer-events: none;/);
    expect(styles).toMatch(/\.webpage-overlay-controls-layer \{[\s\S]*?pointer-events: none;/);
    expect(styles).toMatch(/\.stage-container \.konvajs-content \{[\s\S]*?z-index: auto;/);
    expect(styles).toMatch(/\.stage-container\.is-webpage-interaction-hover \.konvajs-content canvas \{[\s\S]*?pointer-events: none;/);
    expect(styles).not.toContain(".webpage-overlay-layer.is-canvas-above-webpage");
    expect(styles).not.toContain(".webpage-overlay-controls-layer.is-canvas-above-webpage");
  });

  it("keeps the current selection when pointer down starts on an already selected element", () => {
    const stagePointerSource = readStagePointerSource();

    expect(stagePointerSource).toContain("targetIds.some((id) => getSelectedIds().includes(id))");
    expect(stagePointerSource).toContain("selectionDragController.beginSelectionDrag(worldPoint)");
    expect(stagePointerSource).toContain("selectElementById(targetElement, event.evt.shiftKey)");
  });

  it("lets selected elements drag from the transformer hit area while preserving anchor transforms", () => {
    const appSource = readFileSync(new URL("../../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const stagePointerSource = readStagePointerSource();
    const transformerSource = readFileSync(new URL("../../../src/app/selection/transformer-controller.js", import.meta.url), "utf8");

    expect(transformerSource).toContain("transformer.shouldOverdrawWholeArea(hasSelection && getTransformerOverdrawForState(getInteractionState(), selectedElements))");
    expect(transformerSource).toContain("transformer.forceUpdate()");
    expect(stagePointerSource).toContain("isTransformerAnchorTarget");
    expect(transformerSource).toContain("function disableHitAreaDrag()");
    expect(transformerSource).toContain('transformer.findOne?.(".back")?.draggable(false)');
    expect(appSource).toContain("stagePointerController.handlePointerDown");
    expect(stagePointerSource).toMatch(/if \(isTransformerTarget\(event\.target\) && !isTransformerAnchorTarget\(event\.target\)\) \{[\s\S]*?preferUnselected: true[\s\S]*?selectElementById\(passThroughId, event\.evt\.shiftKey\);[\s\S]*?if \(!event\.evt\.shiftKey\) \{[\s\S]*?selectionDragController\.beginSelectionDrag\(worldPoint\);[\s\S]*?\}[\s\S]*?return true;/);
  });

  it("uses padded z-order hit testing so nested elements inside shapes stay selectable", () => {
    const appSource = readFileSync(new URL("../../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const stagePointerSource = readStagePointerSource();
    const selectionHitSource = readFileSync(new URL("../../../src/app/selection/hit-query.js", import.meta.url), "utf8");
    const selectSource = extractStageSelectPointerDownSource(stagePointerSource);

    expect(appSource).toContain("createSelectionHitQuery");
    expect(selectionHitSource).toContain("function getSelectableElementIdAtWorldPoint(worldPoint");
    expect(selectionHitSource).toContain("pickElementIdAtPoint");
    expect(selectionHitSource).toContain("padding: getSelectionHitRadius(stage.scaleX())");
    expect(selectSource).toContain("getSelectableElementIdAtWorldPoint(worldPoint");
    expect(selectSource).toContain("fallbackNode: event.target");
  });

  it("keeps transformer hit area from covering selected structure internals", () => {
    const appSource = readFileSync(new URL("../../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const transformerSource = readFileSync(new URL("../../../src/app/selection/transformer-controller.js", import.meta.url), "utf8");
    const syncSelectionSource = transformerSource.slice(
      transformerSource.indexOf("function syncSelectionNodes()"),
      transformerSource.indexOf("function disableHitAreaDrag()"),
    );

    expect(transformerSource).toContain("getTransformerOverdrawForState");
    expect(appSource).toContain("import { createInteractionStateMachine, SM }");
    expect(syncSelectionSource).toContain("getInteractionState()");
    expect(syncSelectionSource).toContain("transformer.shouldOverdrawWholeArea");
  });

  it("resolves the post-placement tool before rendering newly inserted structures", () => {
    const structureBoardActionSource = readStructureBoardActionSource();
    const insertSource = structureBoardActionSource.slice(
      structureBoardActionSource.indexOf("function insertStructureFromPanel()"),
      structureBoardActionSource.indexOf("function editSelectedArrayStructure"),
    );

    expect(insertSource.indexOf("nextToolAfterPlacement(currentTool, getKeepToolActive())")).toBeGreaterThan(-1);
    expect(insertSource.indexOf("if (nextTool !== currentTool) setTool(nextTool)")).toBeGreaterThan(-1);
    expect(insertSource.indexOf("renderBoard()")).toBeGreaterThan(insertSource.indexOf("if (nextTool !== currentTool) setTool(nextTool)"));
    expect(insertSource.indexOf("selectIds(elements.map((element) => element.id))")).toBeGreaterThan(insertSource.indexOf("renderBoard()"));
  });

  it("keeps array algorithm sessions on the animated step after swap and move animations finish", () => {
    const algorithmSource = readFileSync(new URL("../../../src/app/algorithms/array/session-controller.js", import.meta.url), "utf8");
    const swapSource = algorithmSource.slice(
      algorithmSource.indexOf("function playArrayAlgorithmSwapStep"),
      algorithmSource.indexOf("function playArrayAlgorithmPickKeyStep"),
    );
    const moveSource = algorithmSource.slice(
      algorithmSource.indexOf("function playArrayAlgorithmMoveStep"),
      algorithmSource.indexOf("function playArrayAlgorithmInsertStep"),
    );
    const insertSource = algorithmSource.slice(
      algorithmSource.indexOf("function playArrayAlgorithmInsertStep"),
      algorithmSource.indexOf("function createArrayAlgorithmGhostNode"),
    );
    const completeSource = algorithmSource.slice(
      algorithmSource.indexOf("function runArrayAlgorithmStep"),
      algorithmSource.indexOf("function playArrayAlgorithmSwapStep"),
    );

    expect(swapSource).toMatch(/applyArrayAlgorithmStep\(targetStepIndex, \{ render: true \}\);[\s\S]*?const appliedSession = getArrayAlgorithmSession\(session\.elementId\);[\s\S]*?\.\.\.appliedSession/);
    expect(moveSource).toMatch(/applyArrayAlgorithmStep\(targetStepIndex, \{ render: true \}\);[\s\S]*?const appliedSession = getArrayAlgorithmSession\(session\.elementId\);[\s\S]*?\.\.\.appliedSession/);
    expect(insertSource).toMatch(/applyArrayAlgorithmStep\(targetStepIndex, \{ render: true \}\);[\s\S]*?const appliedSession = getArrayAlgorithmSession\(session\.elementId\);[\s\S]*?\.\.\.appliedSession/);
    expect(completeSource).toMatch(/applyArrayAlgorithmStep\(nextIndex, \{ render: true \}\);[\s\S]*?const appliedSession = getArrayAlgorithmSession\(session\.elementId\);[\s\S]*?\.\.\.appliedSession/);
  });

  it("animates insertion sort key pickup separately from final insertion", () => {
    const algorithmSource = readFileSync(new URL("../../../src/app/algorithms/array/session-controller.js", import.meta.url), "utf8");
    const runSource = algorithmSource.slice(
      algorithmSource.indexOf("function runArrayAlgorithmStep"),
      algorithmSource.indexOf("function playArrayAlgorithmSwapStep"),
    );
    const pickupSource = algorithmSource.slice(
      algorithmSource.indexOf("function playArrayAlgorithmPickKeyStep"),
      algorithmSource.indexOf("function playArrayAlgorithmMoveStep"),
    );
    const insertSource = algorithmSource.slice(
      algorithmSource.indexOf("function playArrayAlgorithmInsertStep"),
      algorithmSource.indexOf("function createArrayAlgorithmGhostNode"),
    );

    expect(runSource).toContain("step.type === ALGORITHM_STEP_TYPES.PICK_KEY");
    expect(runSource).toContain("playArrayAlgorithmPickKeyStep(nextIndex)");
    expect(pickupSource).toContain(": createArrayAlgorithmValueGhostNode(itemNode, floatingKey.value, style);");
    expect(pickupSource).toContain("const liftedY = reverse ? getArrayAlgorithmValueY(element) : getArrayAlgorithmFloatingKeyY(style, element);");
    expect(pickupSource).toContain("applyArrayAlgorithmStep(targetStepIndex, { render: true });");
    expect(insertSource).toContain("findArrayAlgorithmFloatingKeyNode(group)");
    expect(insertSource).toContain("const ghost = floatingKeyNode ?? createArrayAlgorithmValueGhostNode(itemNode, step.keyValue, style);");
    expect(insertSource).toContain("const targetY = reverse ? liftedY : getArrayAlgorithmValueY(element);");
    expect(insertSource).toContain("const insertDuration = duration * 1.45;");
    expect(insertSource).toContain("const moveDuration = shouldMoveHorizontally ? Math.max(0.12, insertDuration * 0.52) : 0;");
    expect(insertSource).toContain("element,");
    expect(insertSource).toContain("function playArrayAlgorithmInsertStep({ session, step, nextIndex, previousStepIndex, reverse = false, targetStepIndex = nextIndex, element, itemNode, move, style, duration })");
  });

  it("plays reverse transitions when stepping array algorithms backward", () => {
    const algorithmSource = readFileSync(new URL("../../../src/app/algorithms/array/session-controller.js", import.meta.url), "utf8");
    const prevSource = algorithmSource.slice(
      algorithmSource.indexOf("function stepArrayAlgorithmPrevious()"),
      algorithmSource.indexOf("function stepArrayAlgorithmNext()"),
    );
    const reverseSource = algorithmSource.slice(
      algorithmSource.indexOf("function runArrayAlgorithmReverseStep"),
      algorithmSource.indexOf("function runArrayAlgorithmStep"),
    );

    expect(prevSource).toContain("runArrayAlgorithmReverseStep(session.stepIndex)");
    expect(prevSource).not.toContain("applyArrayAlgorithmStep(Math.max(0, session.stepIndex - 1), { render: true });");
    expect(reverseSource).toContain("playArrayAlgorithmSwapStep(currentIndex, { reverse: true })");
    expect(reverseSource).toContain("playArrayAlgorithmMoveStep(currentIndex, { reverse: true })");
    expect(reverseSource).toContain("playArrayAlgorithmPickKeyStep(currentIndex, { reverse: true })");
    expect(reverseSource).toContain("applyArrayAlgorithmStep(previousIndex, { render: true });");
  });

  it("keeps history pushes behind the board session without replacing live board markers", () => {
    const appSource = readFileSync(new URL("../../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const boardSessionActionSource = readBoardSessionActionSource();
    const pushHistorySource = boardSessionActionSource.slice(
      boardSessionActionSource.indexOf("function pushHistory(message)"),
      boardSessionActionSource.indexOf("function persistCurrentDraft"),
    );
    const boardSessionSource = appSource.slice(
      appSource.indexOf("const boardSession = createBoardSessionController"),
      appSource.indexOf("board = boardSession.getBoard();"),
    );

    expect(pushHistorySource).toContain("boardSession.pushHistory(message);");
    expect(pushHistorySource).not.toContain("board = serializeCurrentBoard();");
    expect(boardSessionSource).toContain("sanitizeElementsForPersistence");
    expect(boardSessionSource).toContain("clearArrayAlgorithmRuntimeMarkers(element)");
  });

  it("initializes the selection rectangle before export PNG wiring uses it", () => {
    const appSource = readFileSync(new URL("../../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const draftSource = readFileSync(new URL("../../../src/app/tools/draft-interaction-controller.js", import.meta.url), "utf8");

    expect(draftSource).toContain("const selectionRect = new Konva.Rect");
    expect(appSource.indexOf("draftInteractionController = createDraftInteractionController"))
      .toBeLessThan(appSource.indexOf("const { exportPng } = createExportPngController"));
    expect(appSource).toContain("selectionRect: draftInteractionController.getSelectionRect()");
  });

  it("hides the native algorithm select arrow while an array algorithm is active", () => {
    const styles = readFileSync(new URL("../../../src/styles.css", import.meta.url), "utf8");

    expect(styles).toContain('[data-array-algorithm-active="true"] .algorithm-select-field select');
    expect(styles).toContain("appearance: none;");
    expect(styles).toContain("-webkit-appearance: none;");
  });

  it("allows random initialization for both general and binary tree structures", () => {
    const appSource = readFileSync(new URL("../../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const appPanelSource = readFileSync(new URL("../../../src/app/shell/panel-controller.js", import.meta.url), "utf8");
    const structurePanelSource = readFileSync(new URL("../../../src/app/structures/panel-controller.js", import.meta.url), "utf8");
    const hydrateSource = appPanelSource.slice(
      appPanelSource.indexOf("function hydrateStructurePanel"),
      appPanelSource.indexOf("function setActiveStructureType"),
    );

    expect(appSource).toContain("createAppPanelController");
    expect(structurePanelSource).toContain("STRUCTURE_TYPES.TREE");
    expect(structurePanelSource).toContain("STRUCTURE_TYPES.BINARY_TREE");
    expect(hydrateSource).toContain("structurePanelController.getHydrateState()");
  });

  it("reuses ordinary Konva nodes across board renders", () => {
    const appSource = readFileSync(new URL("../../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const orchestratorSource = readOrchestratorSource();
    const shapeRenderSource = readFileSync(new URL("../../../src/app/rendering/controller.js", import.meta.url), "utf8");

    expect(appSource).toContain("const shapeRenderController = createShapeRenderController({");
    expect(appSource).toContain("createLayeredContentController({");
    expect(appSource).toContain("createCanvasInteractionShieldController({");
    expect(orchestratorSource).toContain("const orderedElements = reorderElements(getElements());");
    expect(orchestratorSource).toContain("syncContentLayers(orderedElements);");
    expect(orchestratorSource).toContain("shapeRenderController.syncElementNodes(orderedElements);");
    expect(shapeRenderSource).toContain("const nodeRegistry = new Map();");
    expect(shapeRenderSource).toContain("function syncOrCreateElementNode(element)");
    expect(shapeRenderSource).toContain("if (existingNode && syncNode(existingNode, element, getHandlers(element)))");
    expect(shapeRenderSource).toContain("nodeRegistry.set(element.id, node)");
    expect(appSource).not.toContain('contentLayer.find(".element").forEach((node) => node.destroy());');
  });

  it("skips Konva node synchronization when an element did not change", () => {
    const appSource = readFileSync(new URL("../../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const orchestratorSource = readOrchestratorSource();
    const shapeRenderSource = readFileSync(new URL("../../../src/app/rendering/controller.js", import.meta.url), "utf8");

    expect(shapeRenderSource).toContain("const nodeRenderSnapshots = new Map();");
    expect(shapeRenderSource).toContain("const elementRenderSnapshotValues = new WeakMap();");
    expect(shapeRenderSource).toContain("function createElementRenderSnapshot(element)");
    expect(shapeRenderSource).toContain("const cachedSnapshot = elementRenderSnapshotValues.get(element);");
    expect(shapeRenderSource).toContain("const handlerSnapshot = getHandlerSnapshot(element);");
    expect(orchestratorSource).toContain("canEditArrayItems: getCurrentTool() === TOOLS.SELECT && !isTemporaryPanActive()");
    expect(shapeRenderSource).toMatch(/if \(existingNode && previousSnapshot === nextSnapshot\) \{[\s\S]*?return existingNode;[\s\S]*?\}/);
    expect(shapeRenderSource).toMatch(/if \(existingNode && syncNode\(existingNode, element, getHandlers\(element\)\)\) \{[\s\S]*?nodeRenderSnapshots\.set\(element\.id, nextSnapshot\);/);
    expect(shapeRenderSource).toMatch(/nodeRegistry\.set\(element\.id, node\);[\s\S]*?nodeRenderSnapshots\.set\(element\.id, nextSnapshot\);/);
    expect(shapeRenderSource).toMatch(/node\.destroy\(\);[\s\S]*?nodeRegistry\.delete\(id\);[\s\S]*?nodeRenderSnapshots\.delete\(id\);/);
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
    expect(markup).toContain('data-linear-algorithm-panel');
    expect(markup).toContain('data-array-algorithm-select');
    expect(markup).toContain('value="bubble-sort"');
    expect(markup).toContain('value="selection-sort"');
    expect(markup).toContain('value="insertion-sort"');
    expect(markup).toContain('data-action="array-algorithm-start"');
    expect(markup).toContain('data-action="array-algorithm-prev"');
    expect(markup).toContain('data-action="array-algorithm-next"');
    expect(markup).toContain('data-action="array-algorithm-play"');
    expect(markup).toContain('data-action="array-algorithm-reset"');
    expect(markup).toContain('data-action="array-algorithm-stop"');
    expect(markup).toContain('data-array-algorithm-speed');
    expect(markup).not.toContain('data-linear-group=');
    expect(markup).not.toContain('data-linear-toggle=');
    expect(markup).not.toContain("linear-panel-heading");
    expect(markup).not.toContain("linear-panel-chevron");
    expect(markup).not.toContain("高亮与下标");
    expect(markup).toContain('data-graph-structure-input');
    expect(markup).toContain("顶点与边关系");
    expect(markup).toContain('data-action="graph-apply-structure"');
    expect(markup).toContain('data-action="graph-directed-toggle"');
    expect(markup).toContain('class="structure-values-header"');
    expect(markup).not.toContain('data-action="graph-add-node"');
    expect(markup).not.toContain('data-action="graph-layout-force"');
    expect(markup).not.toContain('data-action="graph-export-edge-list"');
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
    expect(generalTreeMarkup).toContain('data-action="tree-highlight-inorder"');
    expect(generalTreeMarkup).toContain("中序遍历");
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
    const styles = readFileSync(new URL("../../../src/styles.css", import.meta.url), "utf8");

    expect(styles).toContain('[data-tree-kind="general"] .quick-actions-binary-tree');
    expect(styles).toContain('[data-tree-kind="binary"] .quick-actions-tree');
    expect(styles).toContain('[data-tree-kind="binary"] [data-tree-structure-input]');
    expect(styles).toContain("min-height: 168px;");
    expect(styles).toContain(".tree-node-controls");
    expect(styles).toContain(".binary-tree-node-controls");
    expect(styles).toContain(".binary-tree-traversal-controls");
  });

  it("uses floating node controls for ordinary tree edits", () => {
    const appSource = readFileSync(new URL("../../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const stagePointerSource = readStagePointerSource();
    const structureBoardActionSource = readStructureBoardActionSource();
    const editActionSource = readFileSync(new URL("../../../src/app/structures/edit-action-controller.js", import.meta.url), "utf8");
    const nodeActionSource = readFileSync(new URL("../../../src/app/structures/node-action-controller.js", import.meta.url), "utf8");
    const controlsSource = readFileSync(new URL("../../../src/app/structures/controls-controller.js", import.meta.url), "utf8");
    const controlsPositionSource = readFileSync(new URL("../../../src/app/structures/controls-position-controller.js", import.meta.url), "utf8");
    const structureNodeQuerySource = readFileSync(new URL("../../../src/app/structures/node-query.js", import.meta.url), "utf8");
    const controlSource = controlsSource.slice(
      controlsSource.indexOf("function ensureTreeNodeControls()"),
      controlsSource.indexOf("function ensureBinaryTreeNodeControls()"),
    );
    const actionSource = nodeActionSource.slice(
      nodeActionSource.indexOf("function runTreeNodeAction(action)"),
      nodeActionSource.indexOf("function runBinaryTreeNodeAction(action)"),
    );
    const clickSource = editActionSource.slice(
      editActionSource.indexOf("function handleTreeNodeClick({ elementId, nodeId })"),
      editActionSource.indexOf("function connectGraphStructureNodes"),
    );
    const pointerDownSource = extractStageSelectPointerDownSource(stagePointerSource);
    const generalTreeNodeBranch = pointerDownSource.match(/if \(isGeneralTreeElement\(element\) && isTreeNodeHitTarget\(event\.target\)\) \{[\s\S]*?return true;\n      \}/)?.[0] ?? "";

    expect(nodeActionSource).toContain("addTreeChild,");
    expect(nodeActionSource).toContain("addTreeSibling,");
    expect(controlsSource).toContain("let treeNodeControls = null;");
    expect(controlsSource).toContain("data-tree-node-action");
    expect(controlSource).toContain('data-tree-node-action="add-child"');
    expect(controlSource).toContain('data-tree-node-action="add-left-sibling"');
    expect(controlSource).toContain('data-tree-node-action="add-right-sibling"');
    expect(controlSource).toContain('data-tree-node-action="edit"');
    expect(controlSource).toContain('data-tree-node-action="delete"');
    expect(controlsSource).toContain("function renderTreeNodeControls()");
    expect(controlsSource).toContain("function renderTreeControls()");
    expect(controlsPositionSource).toContain("function updateTreeControlsPosition()");
    expect(controlsSource).toContain("function hideTreeControls()");
    expect(structureNodeQuerySource).toContain("function getTreeParentNodeId(element, nodeId)");
    expect(structureNodeQuerySource).toContain("function isTreeRootNode(element, nodeId)");
    expect(controlsSource).toContain("controls.querySelector(\"[data-tree-node-action='add-left-sibling']\").hidden = isRoot;");
    expect(controlsSource).toContain("controls.querySelector(\"[data-tree-node-action='add-right-sibling']\").hidden = isRoot;");
    expect(controlsPositionSource).toContain("controls.style.left = `${stageBox.left + box.x + box.width / 2}px`;");
    expect(controlsPositionSource).toContain("controls.style.top = `${stageBox.top + box.y + box.height + 8}px`;");
    expect(controlsPositionSource).toContain('controls.style.transform = "translateX(-50%)";');
    expect(actionSource).toContain("addTreeChild(element, nodeId, \"0\")");
    expect(actionSource).toContain("addTreeSibling(element, nodeId, side, \"0\")");
    expect(actionSource).toContain("structureInteraction.setActiveTreeNode({ elementId, nodeId });");
    expect(actionSource).toContain("editTreeStructureNode({ elementId, nodeId, label:");
    expect(clickSource).toContain("renderTreeNodeControls();");
    expect(generalTreeNodeBranch).toContain("isGeneralTreeElement(element) && isTreeNodeHitTarget(event.target)");
    expect(generalTreeNodeBranch).toContain("return true;");
    expect(generalTreeNodeBranch).not.toContain("beginSelectionDrag");
    expect(pointerDownSource).toContain("isGeneralTreeElement(element) && !isTreeNodeHitTarget(event.target) && activeTreeNode?.elementId === targetElement");
    expect(pointerDownSource).toContain("hideTreeControls();");
    expect(pointerDownSource).toContain("syncGeneralTreeActiveVisual(previousActiveTreeElementId);");
    expect(structureBoardActionSource).toContain("if (!element || !isBinaryTreeElement(element) || element.locked) return;");
    const orchestratorSource = readOrchestratorSource();
    expect(orchestratorSource).toContain("structureControlsController.renderTreeControls();");
    expect(orchestratorSource).toContain("structureControlsController.hideTreeControls();");
  });

  it("updates floating tree controls while the whole tree selection is dragged", () => {
    const appSource = readFileSync(new URL("../../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const selectionDragSource = readFileSync(new URL("../../../src/app/selection/drag-controller.js", import.meta.url), "utf8");
    const selectionDragBindingSource = appSource.slice(
      appSource.indexOf("selectionDragController = createSelectionDragController({"),
      appSource.indexOf("draftInteractionController = createDraftInteractionController"),
    );
    const nodeDragSource = selectionDragSource.slice(
      selectionDragSource.indexOf("function updateNodeDragSelection(node)"),
      selectionDragSource.indexOf("function finishNodeDragSelection"),
    );

    expect(selectionDragSource).toContain("updateTreeControlsPosition();");
    expect(nodeDragSource).toContain("updateTreeControlsPosition();");
    expect(selectionDragBindingSource).toContain("updateTreeControlsPosition: () => structureControlsPositionController.updateTreeControlsPosition()");
  });

  it("rerenders binary tree node selection immediately and clears it from blank tree clicks", () => {
    const appSource = readFileSync(new URL("../../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const stagePointerSource = readStagePointerSource();
    const editActionSource = readFileSync(new URL("../../../src/app/structures/edit-action-controller.js", import.meta.url), "utf8");
    const structureNodeQuerySource = readFileSync(new URL("../../../src/app/structures/node-query.js", import.meta.url), "utf8");
    const clickSource = editActionSource.slice(
      editActionSource.indexOf("function handleTreeNodeClick({ elementId, nodeId })"),
      editActionSource.indexOf("function connectGraphStructureNodes"),
    );
    const pointerDownSource = extractStageSelectPointerDownSource(stagePointerSource);

    expect(structureNodeQuerySource).toContain("function isTreeNodeHitTarget(target)");
    expect(appSource).toContain("function syncBinaryTreeActiveVisual(elementId)");
    expect(clickSource).toMatch(/if \(isBinaryTreeElement\(clickedElement\)\) \{[\s\S]*?const \{ previousActiveTreeNode \} = structureInteraction\.setActiveTreeNode\(\{ elementId, nodeId \}\);[\s\S]*?selectIds\(\[elementId\]\);[\s\S]*?syncBinaryTreeActiveVisual\(previousActiveTreeNode\?\.elementId\);[\s\S]*?syncBinaryTreeActiveVisual\(elementId\);/);
    expect(pointerDownSource).toContain("isBinaryTreeElement(element) && !isTreeNodeHitTarget(event.target)");
    expect(pointerDownSource).toMatch(/const previousActiveTreeElementId = activeTreeNode\.elementId;[\s\S]*?structureInteraction\.clearActiveTreeNode\(\);[\s\S]*?hideBinaryTreeControls\(\);[\s\S]*?syncBinaryTreeActiveVisual\(previousActiveTreeElementId\);/);
    expect(pointerDownSource).toMatch(/const shouldDragBinaryTreeBlank = !event\.evt\.shiftKey && targetIds\.some\(\(id\) => getSelectedIds\(\)\.includes\(id\)\);[\s\S]*?if \(shouldDragBinaryTreeBlank\) \{[\s\S]*?selectionDragController\.beginSelectionDrag\(worldPoint\);/);
    expect(pointerDownSource).toMatch(/if \(!event\.evt\.shiftKey && targetIds\.some\(\(id\) => getSelectedIds\(\)\.includes\(id\)\)\) \{[\s\S]*?selectionDragController\.beginSelectionDrag\(worldPoint\);[\s\S]*?return true;/);
  });

  it("does not rebuild binary tree nodes during pointer down before dragging can start", () => {
    const pointerDownSource = extractStageSelectPointerDownSource();
    const binaryBlankBranch = pointerDownSource.match(/if \(isBinaryTreeElement\(element\) && !isTreeNodeHitTarget\(event\.target\) && activeTreeNode\?\.elementId === targetElement\) \{[\s\S]*?return true;\n      \}/)?.[0] ?? "";

    expect(binaryBlankBranch).toContain("syncBinaryTreeActiveVisual(previousActiveTreeElementId)");
    expect(binaryBlankBranch).toContain("selectionDragController.beginSelectionDrag(worldPoint)");
    expect(binaryBlankBranch).not.toContain("renderBoard()");
  });

  it("lets binary tree node pointer down bubble into the whole-tree drag flow without selecting the node", () => {
    const appSource = readFileSync(new URL("../../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const structureBoardActionSource = readStructureBoardActionSource();
    const nodePressSource = structureBoardActionSource.slice(
      structureBoardActionSource.indexOf("function handleTreeStructureNodePress(event, group)"),
      structureBoardActionSource.indexOf("function moveArrayStructureItem"),
    );

    expect(nodePressSource).toContain("if (!readSelectedIds().includes(elementId)) selectIds([elementId]);");
    expect(nodePressSource).toContain("const worldPoint = getTreeNodePressWorldPoint();");
    expect(nodePressSource).toContain("if (!event.evt?.shiftKey && worldPoint) beginSelectionDrag(worldPoint);");
    expect(appSource).toContain("getTreeNodePressWorldPoint: () => getWorldPointer(stage),");
    expect(appSource).toContain("beginSelectionDrag: (worldPoint) => selectionDragController.beginSelectionDrag(worldPoint),");
    expect(nodePressSource).not.toContain("activeTreeNode = { elementId, nodeId };");
    expect(nodePressSource).not.toContain("activeTreeNode = null;");
    expect(nodePressSource).not.toContain("syncBinaryTreeActiveVisual");
    expect(nodePressSource).not.toContain("syncGeneralTreeActiveVisual");
    expect(nodePressSource).not.toContain("event.cancelBubble = true");
  });

  it("disables native node dragging while selected elements use selection drag", () => {
    const appSource = readFileSync(new URL("../../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const selectionDragSource = readFileSync(new URL("../../../src/app/selection/drag-controller.js", import.meta.url), "utf8");
    const beginDragSource = selectionDragSource.slice(
      selectionDragSource.indexOf("function beginSelectionDrag(worldPoint)"),
      selectionDragSource.indexOf("function updateSelectionDrag(worldPoint)"),
    );
    const finishDragSource = selectionDragSource.slice(
      selectionDragSource.indexOf("function finishSelectionDrag()"),
      selectionDragSource.indexOf("function cancelSelectionDrag()"),
    );

    expect(selectionDragSource).toContain("function setSelectionDragNodeDraggable(enabled)");
    expect(appSource).toContain("function isSelectionDragElement(elementId)");
    expect(appSource).toContain("&& !isSelectionDragElement(element.id)");
    const orchestratorSource = readOrchestratorSource();
    expect(orchestratorSource).toContain("&& !isSelectionDragElement(id)");
    expect(beginDragSource).toContain("setSelectionDragNodeDraggable(false);");
    expect(finishDragSource.indexOf("setSelectionDragNodeDraggable(true);")).toBeLessThan(finishDragSource.indexOf("selectionDrag = null;"));
  });

  it("locks selection identity until an active selection drag finishes", () => {
    const appSource = readFileSync(new URL("../../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const orchestratorSource = readOrchestratorSource();
    const selectionDragSource = readFileSync(new URL("../../../src/app/selection/drag-controller.js", import.meta.url), "utf8");
    const finishDragSource = selectionDragSource.slice(
      selectionDragSource.indexOf("function finishSelectionDrag()"),
      selectionDragSource.indexOf("function cancelSelectionDrag()"),
    );
    const onSelectSource = orchestratorSource.slice(
      orchestratorSource.indexOf("onSelect: (event, node) => {"),
      orchestratorSource.indexOf("onEdit: (event, node) => {"),
    );

    expect(appSource).toContain("let suppressNextSelectionClick = false;");
    expect(finishDragSource).toContain("setSuppressNextSelectionClick(true);");
    expect(onSelectSource).toContain("if (getSuppressNextSelectionClick()) {");
    expect(onSelectSource).toContain("setSuppressNextSelectionClick(false)");
    expect(onSelectSource.indexOf("if (getSuppressNextSelectionClick())")).toBeLessThan(onSelectSource.indexOf("selectElementById(id, event.evt.shiftKey);"));
  });

  it("opens the selected text editor when the transformer back area receives the second click", () => {
    const appSource = readFileSync(new URL("../../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const transformEventsSource = readFileSync(new URL("../../../src/app/selection/transform-events-controller.js", import.meta.url), "utf8");
    const stagePointerSource = readStagePointerSource();
    const handlerSource = stagePointerSource.slice(
      stagePointerSource.indexOf("function handleTransformerDoubleClick(event)"),
      stagePointerSource.indexOf("function handleSelectPointerDown(event, worldPoint)"),
    );

    expect(appSource).toContain("selectionTransformEventsController.bindTransformerEvents({");
    expect(transformEventsSource).toContain('transformer.on("dblclick dbltap", handleTransformerDoubleClick)');
    expect(handlerSource).toContain("getSelectableElementIdAtWorldPoint(worldPoint)");
    expect(handlerSource).toContain("const editable = getElements().find((item) => item.id === id)");
    expect(handlerSource).toContain("shouldEditTextOnTransformerDoubleClick({");
    expect(handlerSource).toContain("target: event.target");
    expect(handlerSource).toContain("selectedIds: getSelectedIds()");
    expect(handlerSource).toContain("event.cancelBubble = true");
    expect(handlerSource).toContain("requestAnimationFrame(() => editElement(id))");
  });

  it("suppresses the binary tree node click emitted after dragging the whole tree", () => {
    const appSource = readFileSync(new URL("../../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const editActionSource = readFileSync(new URL("../../../src/app/structures/edit-action-controller.js", import.meta.url), "utf8");
    const structureSource = readFileSync(new URL("../../../src/structures/interaction.js", import.meta.url), "utf8");
    const selectionDragSource = readFileSync(new URL("../../../src/app/selection/drag-controller.js", import.meta.url), "utf8");
    const finishDragSource = selectionDragSource.slice(
      selectionDragSource.indexOf("function finishSelectionDrag()"),
      selectionDragSource.indexOf("function cancelSelectionDrag()"),
    );
    const clickSource = editActionSource.slice(
      editActionSource.indexOf("function handleTreeNodeClick({ elementId, nodeId })"),
      editActionSource.indexOf("function connectGraphStructureNodes"),
    );

    expect(appSource).not.toContain("let suppressedBinaryTreeNodeClickElementIds = new Set();");
    expect(structureSource).toContain("let suppressedBinaryTreeNodeClickElementIds = new Set();");
    expect(selectionDragSource).toContain("structureInteraction.suppressBinaryTreeNodeClicks(");
    expect(finishDragSource).toContain("suppressBinaryTreeNodeClickAfterDrag();");
    expect(clickSource).toContain("consumeSuppressedBinaryTreeNodeClick(elementId)");
    expect(clickSource.indexOf("consumeSuppressedBinaryTreeNodeClick(elementId)")).toBeLessThan(clickSource.indexOf("structureInteraction.setActiveTreeNode({ elementId, nodeId });"));
  });

  it("renders the linear structure inspector without an outer category title", () => {
    const appSource = readFileSync(new URL("../../../src/app/whiteboard-app.js", import.meta.url), "utf8");
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
    const appSource = readFileSync(new URL("../../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const appActionSource = readFileSync(new URL("../../../src/app/shell/action-controller.js", import.meta.url), "utf8");
    const controlsBindingSource = readFileSync(new URL("../../../src/app/shell/controls-binding-controller.js", import.meta.url), "utf8");
    const refsSource = readFileSync(new URL("../../../src/app/shell/dom-refs.js", import.meta.url), "utf8");
    const structureInspectorSource = readFileSync(new URL("../../../src/app/structures/inspector-controller.js", import.meta.url), "utf8");
    const linearPanelSyncSource = readFileSync(new URL("../../../src/app/structures/linear-panel-sync-controller.js", import.meta.url), "utf8");

    expect(refsSource).toContain('linearValuesInput: query("[data-linear-values-input]")');
    expect(structureInspectorSource).toContain('let linearValuesDraft = initialLinearValuesDraft;');
    expect(appSource).toContain("createControlsBindingController");
    expect(controlsBindingSource).toContain('linearValuesInput?.addEventListener("input", () => {');
    expect(controlsBindingSource).toContain("setLinearValuesDraft(linearValuesInput.value);");
    expect(appActionSource).toMatch(/import \{[\s\S]*?updateArrayValues,[\s\S]*?\} from "\.\.\/\.\.\/structures\/linear-structure\.js";/);
    expect(appActionSource).toContain('"linear-apply-values": () => editSelectedArrayStructure((element) => updateArrayValues(element, getLinearValuesDraft()))');
    expect(appSource).not.toContain('runAction("linear-apply-values")');
    expect(appSource).not.toContain("button.dataset.linearValuesAction !== undefined");
    expect(linearPanelSyncSource).toContain('linearValuesInput.value = (element.items ?? []).map((item) => item.value ?? "").join(",")');
    expect(linearPanelSyncSource).toContain('linearValuesTitle.textContent = `当前${getLinearStructureDisplayName(element.type)}结构`;');
    expect(appSource).not.toContain('[data-structure-selection]:not([data-structure-selection="array-structure"]) [data-linear-values-field]');
  });

  it("syncs and applies graph structure input from the property panel", () => {
    const appSource = readFileSync(new URL("../../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const appActionSource = readFileSync(new URL("../../../src/app/shell/action-controller.js", import.meta.url), "utf8");
    const controlsBindingSource = readFileSync(new URL("../../../src/app/shell/controls-binding-controller.js", import.meta.url), "utf8");
    const refsSource = readFileSync(new URL("../../../src/app/shell/dom-refs.js", import.meta.url), "utf8");
    const structureInspectorSyncSource = readFileSync(new URL("../../../src/app/structures/inspector-sync-controller.js", import.meta.url), "utf8");

    expect(refsSource).toContain('graphStructureInput: query("[data-graph-structure-input]")');
    expect(appSource).toContain("createControlsBindingController");
    expect(appSource).toContain("createStructureInspectorSyncController");
    expect(controlsBindingSource).toContain('graphStructureInput?.addEventListener("input", () => {');
    expect(controlsBindingSource).toContain("setGraphStructureDraft(graphStructureInput.value);");
    expect(appActionSource).toContain('"graph-apply-structure": () => editSelectedStructure("graph-structure", (element) => updateGraphFromInput(element, getGraphStructureDraft()), "已更新图")');
    expect(structureInspectorSyncSource).toContain('graphStructureInput.value = element ? exportGraph(element, "edge-list") : "";');
  });

  it("removes secondary linear structure action groups from the property panel", () => {
    const markup = renderShell();
    const appSource = readFileSync(new URL("../../../src/app/whiteboard-app.js", import.meta.url), "utf8");

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
    const styles = readFileSync(new URL("../../../src/styles.css", import.meta.url), "utf8");
    const appSource = readFileSync(new URL("../../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const styleSource = readFileSync(new URL("../../../src/app/inspector/selection-style/controller.js", import.meta.url), "utf8");
    const propertyDomSource = readFileSync(new URL("../../../src/app/inspector/property-controls/dom-controller.js", import.meta.url), "utf8");
    const panelStateSource = readFileSync(new URL("../../../src/app/panels/state-controller.js", import.meta.url), "utf8");

    expect(markup).not.toContain("linear-panel-fields-edit");
    expect(markup).toContain("linear-panel-fields-highlight");
    expect(markup).toContain("quick-actions-compact");
    expect(markup).not.toContain("linear-panel-group");
    expect(markup).not.toContain('class="linear-panel-content"');
    expect(markup).not.toContain("linear-panel-toggle");
    expect(styles).toContain('[data-panel-mode="structure"] .style-panel');
    expect(styles).not.toContain('.linear-panel-group[data-collapsed="true"]');
    expect(styles).toContain(".quick-actions-linear");
    expect(panelStateSource).toContain("INSPECTOR_SECTIONS.map((section) => [section, section === context])");
    expect(appSource).not.toContain("function applyLinearGroupState()");
    expect(appSource).not.toContain("linearGroupState");
  });

  it("prevents linear inspector controls from forcing the property panel wider", () => {
    const markup = renderShell();
    const styles = readFileSync(new URL("../../../src/styles.css", import.meta.url), "utf8");

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
    const appActionSource = readFileSync(new URL("../../../src/app/shell/action-controller.js", import.meta.url), "utf8");
    const linearPanelSyncSource = readFileSync(new URL("../../../src/app/structures/linear-panel-sync-controller.js", import.meta.url), "utf8");

    expect(linearPanelSyncSource).toContain("function getLinearIndexBase(element)");
    expect(linearPanelSyncSource).toContain("function toLinearDisplayIndex(element, index)");
    expect(linearPanelSyncSource).toContain("function readLinearDisplayIndexField(fieldName, element, fallback = 0)");
    expect(linearPanelSyncSource).toContain('highlightPointer: String(toLinearDisplayIndex(element, pointer))');
    expect(appActionSource).toContain('pointer: readLinearDisplayIndexField("highlightPointer", element, getActiveLinearIndex(element, 0))');
  });

  it("keeps selected brush strokes in the brush-style inspector instead of shape controls", () => {
    const appSource = readFileSync(new URL("../../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const inspectorPanelSource = readFileSync(new URL("../../../src/app/inspector/panel-dom-controller.js", import.meta.url), "utf8");
    const selectionDragSource = readFileSync(new URL("../../../src/app/selection/drag-controller.js", import.meta.url), "utf8");

    expect(inspectorPanelSource).toContain("getSelectionPanelMode(selectedElements)");
    expect(appSource).not.toContain('"stroke";');
    expect(selectionDragSource).toContain("if (!getSelectedIds().includes(id)) {");
    expect(selectionDragSource).toContain("selectElementById(id);");
    expect(selectionDragSource).toContain("return beginNodeDragSelection(node);");
  });

  it("drags grouped elements with one stable native anchor node", () => {
    const selectionDragSource = readFileSync(new URL("../../../src/app/selection/drag-controller.js", import.meta.url), "utf8");
    const beginDragSource = selectionDragSource.slice(
      selectionDragSource.indexOf("function beginNodeDragSelection(node)"),
      selectionDragSource.indexOf("function updateNodeDragSelection(node)"),
    );
    const updateDragSource = selectionDragSource.slice(
      selectionDragSource.indexOf("function updateNodeDragSelection(node)"),
      selectionDragSource.indexOf("function finishNodeDragSelection(node)"),
    );

    expect(beginDragSource).toContain("selectElementById(id);");
    expect(beginDragSource).not.toContain("selectIds([id]);");
    expect(updateDragSource).toMatch(/for \(const original of nodeDragSelection\.originals\) \{[\s\S]*?if \(original\.id === nodeDragSelection\.id\) continue;[\s\S]*?selectedNode\?\.position/);
  });

  it("keeps grouped drag transformer bounds synced during the live drag", () => {
    const selectionDragSource = readFileSync(new URL("../../../src/app/selection/drag-controller.js", import.meta.url), "utf8");
    const updateDragSource = selectionDragSource.slice(
      selectionDragSource.indexOf("function updateNodeDragSelection(node)"),
      selectionDragSource.indexOf("function finishNodeDragSelection(node)"),
    );

    expect(updateDragSource).toMatch(/setElements\(getElements\(\)\.map[\s\S]*?transformer\.forceUpdate\(\);[\s\S]*?contentLayer\.batchDraw\(\);/);
  });

  it("does not recompute grouped drag positions again on drag end", () => {
    const selectionDragSource = readFileSync(new URL("../../../src/app/selection/drag-controller.js", import.meta.url), "utf8");
    const finishDragSource = selectionDragSource.slice(
      selectionDragSource.indexOf("function finishNodeDragSelection(node)"),
      selectionDragSource.indexOf("function clearRootDragState(elementId)"),
    );
    const multiDragFinishSource = finishDragSource.slice(
      finishDragSource.indexOf("if (dragSelection.originals.length <= 1)"),
    );

    expect(multiDragFinishSource).toContain("renderBoard();");
    expect(multiDragFinishSource).not.toContain("const dx = node.x() - dragSelection.start.x");
    expect(multiDragFinishSource).not.toContain("const dy = node.y() - dragSelection.start.y");
    expect(multiDragFinishSource).not.toContain("original.x + dx");
    expect(multiDragFinishSource).not.toContain("original.y + dy");
  });

  it("restores saved tool property controls and section state when switching tools", () => {
    const appSource = readFileSync(new URL("../../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const toolActivationSource = readToolActivationSource();
    const propertyControlsSource = readFileSync(new URL("../../../src/app/inspector/property-controls/controller.js", import.meta.url), "utf8");
    const propertyDomSource = readFileSync(new URL("../../../src/app/inspector/property-controls/dom-controller.js", import.meta.url), "utf8");

    expect(appSource).toContain("createToolActivationController");
    expect(toolActivationSource).toContain("saveToolPropertyControlsForCurrentTool()");
    expect(toolActivationSource).toContain("restorePropertyControlsForTool(tool)");
    expect(toolActivationSource).toContain("syncInspectorPanelState({ forceReset: true })");
    expect(propertyDomSource).toContain("applyPropertyControlsSnapshot(propertyControlsController.getDefaultControlsForTool(tool))");
    expect(propertyControlsSource).toContain('color: "#111827"');
    expect(propertyControlsSource).toContain('brushStyle: "solid"');
    expect(propertyControlsSource).toContain('fontSize: "28"');
  });

  it("keeps selected stroke controls separate from saved brush tool controls", () => {
    const appSource = readFileSync(new URL("../../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const selectionStyleActionSource = readSelectionStyleActionSource();
    const propertyControlsSource = readFileSync(new URL("../../../src/app/inspector/property-controls/controller.js", import.meta.url), "utf8");
    const propertyDomSource = readFileSync(new URL("../../../src/app/inspector/property-controls/dom-controller.js", import.meta.url), "utf8");

    expect(propertyControlsSource).toContain("const toolPropertyControlSnapshots = new Map()");
    expect(appSource).toContain("getSelectedIds: () => selectedIds");
    expect(propertyDomSource).toMatch(/function saveToolPropertyControlsForCurrentTool\(\) \{[\s\S]*?if \(getSelectedIds\(\)\.length > 0\) return;[\s\S]*?canPersistToolPropertyControls\(currentTool\)[\s\S]*?propertyControlsController\.saveToolControls\(currentTool, capturePropertyControls\(\)\);/);
    expect(propertyDomSource).toMatch(/function restorePropertyControlsForTool\(tool\) \{[\s\S]*?propertyControlsController\.getToolControls\(tool\)[\s\S]*?resetPropertyControlsForTool\(tool\);/);
    expect(selectionStyleActionSource).toMatch(/if \(getSelectedIds\(\)\.length === 0\) \{[\s\S]*?saveToolPropertyControlsForCurrentTool\(\);[\s\S]*?updateContextPanel\(\);[\s\S]*?return;/);
  });

  it("preserves property panel scroll when syncing without a context reset", () => {
    const appSource = readFileSync(new URL("../../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const panelDomSource = readFileSync(new URL("../../../src/app/panels/dom-controller.js", import.meta.url), "utf8");
    const panelStateSource = readFileSync(new URL("../../../src/app/panels/state-controller.js", import.meta.url), "utf8");

    expect(appSource).toContain("createPanelDomController");
    expect(panelDomSource).toContain("panelStateController.syncInspectorContext(nextContext, { forceReset })");
    expect(panelStateSource).toMatch(/const shouldResetScroll = forceReset \|\| nextContext !== activeInspectorContext;/);
    expect(panelDomSource).toMatch(/if \(shouldResetScroll\) \{[\s\S]*?panelBody\?\.scrollTo\?\.\(0, 0\);[\s\S]*?\}/);
    expect(panelDomSource).not.toMatch(/applyInspectorSectionState\(\);\s*panelBody\?\.scrollTo\?\.\(0, 0\);/);
  });

  it("keeps the style panel hidden for text and sticky tools until an element is selected", () => {
    const appSource = readFileSync(new URL("../../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const inspectorPanelSource = readFileSync(new URL("../../../src/app/inspector/panel-dom-controller.js", import.meta.url), "utf8");

    expect(appSource).toContain("createInspectorPanelDomController");
    expect(inspectorPanelSource).toContain("getSelectionPanelMode(selectedElements)");
    expect(inspectorPanelSource).toContain("isToolPropertyPanelAvailable(currentTool)");
    expect(appSource).not.toContain("tool-text");
    expect(appSource).not.toContain("tool-sticky");
  });

  it("uses concrete property panel titles for single selections and configurable tools", () => {
    const appSource = readFileSync(new URL("../../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const inspectorPanelSource = readFileSync(new URL("../../../src/app/inspector/panel-dom-controller.js", import.meta.url), "utf8");

    expect(appSource).toContain("stylePanelTitle,");
    expect(inspectorPanelSource).toContain("function syncPropertyPanelTitle(selectedElements = [])");
    expect(inspectorPanelSource).toContain('stylePanelTitle.textContent = getPropertyPanelTitle(selectedElements);');
    expect(inspectorPanelSource).toContain("getToolPropertyPanelTitle(currentTool, activeShapeTool)");
    expect(appSource).not.toContain('[TOOLS.TEXT]: "文字"');
    expect(appSource).not.toContain('[TOOLS.STICKY]: "便签"');
    expect(appSource).not.toContain('[TOOLS.STRUCTURE]: "结构模板"');
  });

  it("uses safe closest lookups for delegated app interactions", () => {
    const appSource = readFileSync(new URL("../../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const controlsBindingSource = readFileSync(new URL("../../../src/app/shell/controls-binding-controller.js", import.meta.url), "utf8");
    const layerPanelSource = readFileSync(new URL("../../../src/app/panels/layer/controller.js", import.meta.url), "utf8");
    const uiEventsSource = readFileSync(new URL("../../../src/app/shell/ui-events-controller.js", import.meta.url), "utf8");
    const delegatedInteractionSource = `${appSource}\n${controlsBindingSource}\n${layerPanelSource}\n${uiEventsSource}`;

    expect(appSource).toContain("function closestElement(target, selector)");
    expect(appSource).toContain("createControlsBindingController");
    expect(appSource).toContain("createLayerPanelController");
    expect(controlsBindingSource).toContain('closestElement(event.target, "[data-linear-item-action]")');
    expect(layerPanelSource).toContain('closestElement(event.target, "[data-layer-id]")');
    expect(uiEventsSource).toContain('closestElement(event.target, "[data-main-menu], [data-menu-trigger]")');
    expect(delegatedInteractionSource).not.toContain("event.target.closest(");
  });

  it("starts a drag gesture immediately after selecting an unselected text element", () => {
    const stagePointerSource = readStagePointerSource();

    expect(stagePointerSource).toContain('["text", "sticky"].includes(element.type)');
    expect(stagePointerSource).toContain("selectElementById(targetElement, event.evt.shiftKey)");
    expect(stagePointerSource).toContain("selectionDragController.beginSelectionDrag(worldPoint)");
  });

  it("starts app-level drag when padded hit testing selects a nested element behind another hit target", () => {
    const selectSource = extractStageSelectPointerDownSource();

    expect(selectSource).toContain("const rawTargetElement = getElementIdFromNode(event.target);");
    expect(selectSource).toContain("targetElement !== rawTargetElement");
    expect(selectSource).toMatch(/selectElementById\(targetElement, event\.evt\.shiftKey\);[\s\S]*?targetElement !== rawTargetElement[\s\S]*?selectionDragController\.beginSelectionDrag\(worldPoint\);/);
  });

  it("fits latex editor height while preserving plain text box normalization", () => {
    const editSource = readFileSync(new URL("../../../src/app/editing/controller.js", import.meta.url), "utf8");
    const textMeasureSource = readFileSync(new URL("../../../src/app/editing/text-element-measure.js", import.meta.url), "utf8");

    expect(editSource).toContain("const measureTextContentHeight");
    expect(editSource).toContain("return measureTextContentHeight(width) + editorHeightSlack");
    expect(editSource).toContain("fitEditorToContent({ expandOnly: !usesSeparateEditBox });");
    expect(textMeasureSource).toContain("verticalGap: 2");
  });

  it("uses the textarea as the visible editing surface instead of Konva text", () => {
    const appSource = readFileSync(new URL("../../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const editSource = readFileSync(new URL("../../../src/app/editing/controller.js", import.meta.url), "utf8");

    expect(appSource).toContain("getTextEditorStyle");
    expect(editSource).toContain("Object.assign(textarea.style, getTextEditorStyle");
    expect(editSource).toContain("hideVisualTextNode();");
    expect(editSource).toContain("showVisualTextNode();");
    expect(editSource).toContain("syncTextNodeContent(node, {");
    expect(editSource).toContain("text: textarea.value");
    expect(editSource).toContain("}, { renderLatex: false });");
  });

  it("uses a DOM vector overlay for rendered latex text while editing keeps source input", () => {
    const styles = readFileSync(new URL("../../../src/styles.css", import.meta.url), "utf8");
    const appSource = readFileSync(new URL("../../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const orchestratorSource = readOrchestratorSource();
    const editSource = readFileSync(new URL("../../../src/app/editing/controller.js", import.meta.url), "utf8");

    expect(appSource).toContain("createTextOverlayController");
    expect(orchestratorSource).toContain("textOverlayController.sync(elements)");
    expect(editSource).toContain("textOverlayController.setHiddenIds([id])");
    expect(styles).toContain(".text-latex-overlay,");
    expect(styles).toContain("pointer-events: none;");
    expect(styles).toMatch(/\.text-latex-overlay[\s\S]*?\.katex \.base \{[\s\S]*?white-space: nowrap;/);
  });

  it("keeps latex source editor width bounded without overwriting the render width", () => {
    const textMeasureSource = readFileSync(new URL("../../../src/app/editing/text-element-measure.js", import.meta.url), "utf8");
    const editSource = readFileSync(new URL("../../../src/app/editing/controller.js", import.meta.url), "utf8");

    expect(textMeasureSource).toContain("getPreferredTextBoxWidth({");
    expect(editSource).not.toContain("latexDefaultWidth: 520 * scale");
    expect(editSource).not.toContain("preferredTextWidth > maxAutoEditorWidth");
    expect(editSource).toContain("Math.min(maxAutoEditorWidth, measuredAutoWidth)");
    expect(editSource).toContain("const renderWidth = hadRenderableLatex");
    expect(editSource).toContain("width: renderWidth");
    expect(editSource).toContain("getAutoFitTextElementWidth");
    expect(editSource).toContain("(originalText ? manualEditorWidth : committedWidth) / scale");
  });

  it("keeps text measurement font setup centralized without dead editor resize state", () => {
    const appSource = readFileSync(new URL("../../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const textMeasureSource = readFileSync(new URL("../../../src/app/editing/text-element-measure.js", import.meta.url), "utf8");

    expect(textMeasureSource).toContain("function getTextMeasureContextForElement");
    expect(appSource).not.toContain("hasManualEditorResize");
    expect((textMeasureSource.match(/context\.font =/g) ?? []).length).toBeLessThanOrEqual(1);
  });

  it("normalizes sticky note scale before editing commits clear transient scale", () => {
    const appSource = readFileSync(new URL("../../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const commitSource = readFileSync(new URL("../../../src/app/selection/transform-commit-controller.js", import.meta.url), "utf8");
    const transformerSource = readFileSync(new URL("../../../src/app/selection/transformer-controller.js", import.meta.url), "utf8");

    expect(commitSource).toContain("getStickyScaleCommitBox");
    expect(appSource).toContain("getStickyEditorCommitBox");
    expect(commitSource).toContain('if (element.type === "sticky")');
    expect(commitSource).toContain("nodeScaleX: node.scaleX()");
    expect(commitSource).toContain("nodeScaleY: node.scaleY()");
    expect(commitSource).toContain("fontSize: stickyCommit.fontSize");
    expect(transformerSource).toContain("stageScale: getStageScale()");
  });

  it("keeps text editor backgrounds transparent while the textarea renders text and sticky fill", () => {
    const styles = readFileSync(new URL("../../../src/styles.css", import.meta.url), "utf8");
    const styleSource = readFileSync(new URL("../../../src/app/inspector/selection-style/controller.js", import.meta.url), "utf8");
    const editSource = readFileSync(new URL("../../../src/app/editing/controller.js", import.meta.url), "utf8");

    expect(styles).toMatch(/\.text-editor \{[\s\S]*?background: transparent;/);
    expect(styles).toMatch(/\.text-editor-frame\.is-sticky-editor \{[\s\S]*?box-shadow: none;/);
    expect(styleSource).toContain('if (element.type === "sticky")');
    expect(editSource).toContain('editorFrame.classList.add("is-sticky-editor")');
    expect(editSource).toContain('const minLiveEditorWidth = element.type === "sticky" ? editorWidth : minEditorWidth;');
    expect(editSource).toContain('const minLiveEditorHeight = element.type === "sticky" ? editorHeight : minEditorHeight;');
    expect(editSource).toContain('element.type !== "sticky" && canAutoFitWidth && textarea.value');
    expect(editSource).toContain('const stickyFill = node.findOne?.("Rect")?.fill?.() ?? element.fill;');
    expect(editSource).toContain("const stickyInsets = getStickyTextInsets(element.fontSize)");
    expect(editSource).toContain("textarea.style.padding = `${stickyInsets.y * scale}px ${stickyInsets.x * scale}px`");
    expect(editSource).not.toContain("editorFrame.style.background = stickyFill");
    expect(editSource).toContain("editorFrame.style.borderColor = getStickyBorderColor(stickyFill)");
    expect(editSource).toContain("Math.max(element.width, stickyBox.width)");
    expect(editSource).toContain("Math.max(element.height, stickyBox.height)");
  });

  it("hides transformer handles while linear item drag preview is active", () => {
    const transformerSource = readFileSync(new URL("../../../src/app/selection/transformer-controller.js", import.meta.url), "utf8");

    expect(transformerSource).toContain("if (structureInteraction.hasLinearItemDragState() || structureInteraction.hasLinearPointerDragState())");
    expect(transformerSource).toContain("transformer.enabledAnchors([])");
    expect(transformerSource).toContain("transformer.visible(false)");
  });

  it("keeps layer ordering available through context menu commands", () => {
    const appSource = readFileSync(new URL("../../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const appActionSource = readFileSync(new URL("../../../src/app/shell/action-controller.js", import.meta.url), "utf8");
    const selectionActionSource = readFileSync(new URL("../../../src/app/selection/action-controller.js", import.meta.url), "utf8");
    const markup = renderShell();

    expect(appActionSource).toContain('"bring-forward": bringSelectionForward');
    expect(appActionSource).toContain('"send-backward": sendSelectionBackward');
    expect(appActionSource).toContain('"bring-front": bringSelectionToFront');
    expect(appActionSource).toContain('"send-back": sendSelectionToBack');
    expect(appSource).toContain("createSelectionActionController");
    expect(selectionActionSource).toContain("const nextElements = moveElementsByLayer(elements, selectedIds, direction)");
    expect(appSource).not.toContain("arrange:");
    expect(appSource).not.toContain("arrange: selectedIds.length > 0");
    expect(markup).not.toContain('data-section-toggle="arrange"');
  });

  it("styles transformer edge handles as invisible hit areas and applies type-aware resizing", () => {
    const appSource = readFileSync(new URL("../../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const transformerNodeSource = readFileSync(new URL("../../../src/app/selection/transformer-node.js", import.meta.url), "utf8");

    expect(transformerNodeSource).toContain("anchorCornerRadius: 3");
    expect(transformerNodeSource).toContain("rotateLineVisible: false");
    expect(transformerNodeSource).toContain("rotateAnchorOffset: 28");
    expect(transformerNodeSource).toContain('anchor.hasName("top-center") || anchor.hasName("bottom-center")');
    expect(transformerNodeSource).toContain('anchor.hasName("middle-left") || anchor.hasName("middle-right")');
    expect(transformerNodeSource).toContain('anchor.fill("rgba(0,0,0,0)")');
    expect(transformerNodeSource).toContain("getUniformScaledBoxForResize");
    expect(transformerNodeSource).toContain("elements: selectionTransformerController.getActiveElements()");
    expect(appSource).toContain("createSelectionTransformerNode");
    expect(appSource).toContain("createSelectionTransformerController");
  });

  it("rerenders coordinate plane internals during creation and resizing instead of stretching the group", () => {
    const appSource = readFileSync(new URL("../../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const orchestratorSource = readOrchestratorSource();
    const previewSource = readFileSync(new URL("../../../src/app/selection/transform-preview-controller.js", import.meta.url), "utf8");
    const transformEventsSource = readFileSync(new URL("../../../src/app/selection/transform-events-controller.js", import.meta.url), "utf8");

    expect(appSource).toContain("function rerenderCoordinatePlaneNode");
    expect(orchestratorSource).toContain('if (element.type === "coordinate-plane") {');
    expect(orchestratorSource).toContain("rerenderCoordinatePlaneNode(element, node)");
    expect(previewSource).toContain("syncCoordinatePlaneTransformPreview");
    expect(transformEventsSource).toContain('transformer.on("transform", selectionTransformPreviewController.syncCoordinatePlaneTransformPreview)');
    expect(previewSource).toContain("node.scaleX(1)");
    expect(previewSource).toContain("node.scaleY(1)");
  });

  it("commits text corner scaling without changing the text wrapping ratio", () => {
    const appSource = readFileSync(new URL("../../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const commitSource = readFileSync(new URL("../../../src/app/selection/transform-commit-controller.js", import.meta.url), "utf8");

    expect(commitSource).toContain("getTextScaleCommitBox");
    expect(commitSource).toContain("fontSize: textCommit.fontSize");
    expect(commitSource).toContain("width: textCommit.width");
    expect(commitSource).toContain("height: textCommit.height");
    expect(appSource).not.toContain("width: node.width() * Math.abs(node.scaleX() || 1)");
  });

  it("previews latex text resize through the vector overlay instead of hiding it", () => {
    const previewSource = readFileSync(new URL("../../../src/app/selection/transform-preview-controller.js", import.meta.url), "utf8");
    const transformerSource = readFileSync(new URL("../../../src/app/selection/transformer-controller.js", import.meta.url), "utf8");
    const transformEventsSource = readFileSync(new URL("../../../src/app/selection/transform-events-controller.js", import.meta.url), "utf8");
    const resizePreviewSource = previewSource.slice(
      previewSource.indexOf("function syncTextWidthResize()"),
      previewSource.indexOf("function syncTextTransformPreview()"),
    );
    const minWidthSource = transformerSource.slice(
      transformerSource.indexOf("function getActiveMinWidth()"),
      transformerSource.indexOf("function getActiveMinHeight()"),
    );

    expect(resizePreviewSource).toContain("syncTextOverlays({ elements: getTextOverlayPreviewElements() })");
    expect(resizePreviewSource).toContain("getMinimumTextElementWidth(element)");
    expect(minWidthSource).toContain("getTextTransformMinimumSize({");
    expect(resizePreviewSource).not.toContain("textOverlayController.setHiddenIds([id])");
    expect(transformEventsSource).toContain("transformer.on(\"transform\", selectionTransformPreviewController.syncTextTransformPreview)");
    expect(previewSource).toContain("fontSize: isTextWidthResizeAnchor(anchor)");
    const transformPreviewSource = previewSource.slice(
      previewSource.indexOf("function syncTextTransformPreview()"),
      previewSource.indexOf("function syncCoordinatePlaneTransformPreview()"),
    );
    expect(transformPreviewSource).not.toContain("node.scaleX(1)");
    expect(transformPreviewSource).not.toContain("node.scaleY(1)");
    expect(transformPreviewSource).not.toContain("syncTextNodeContent(node, previewElement");
  });

  it("samples fast eraser movement instead of erasing only the latest pointer position", () => {
    const appSource = readFileSync(new URL("../../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const drawingSource = readFileSync(new URL("../../../src/app/tools/drawing-interaction-controller.js", import.meta.url), "utf8");

    expect(appSource).toContain("createDrawingInteractionController");
    expect(drawingSource).toContain("getEraserPathSamples");
    expect(drawingSource).toContain("function eraseStrokeAlongPath");
    expect(drawingSource).toContain("eraseStrokeAlongPath(previousPoint, worldPoint, radius)");
  });

  it("captures the active drawing pointer so pen and touch strokes do not drop events", () => {
    const stagePointerSource = readStagePointerSource();
    const styles = readFileSync(new URL("../../../src/styles.css", import.meta.url), "utf8");

    expect(stagePointerSource).toContain("captureDrawingPointer");
    expect(stagePointerSource).toContain("preventDrawingPointerDefault");
    expect(stagePointerSource).toContain("releaseDrawingPointer");
    expect(stagePointerSource).toContain("shouldHandlePointerEvent");
    expect(stagePointerSource).toContain("let activeDrawingPointerCapture = null;");
    expect(stagePointerSource).toContain("function beginDrawingPointerSession(event)");
    expect(stagePointerSource).toContain("function endDrawingPointerSession()");
    expect(stagePointerSource).toMatch(/if \(!shouldHandlePointerEvent\(event\?\.evt, activeDrawingPointerCapture\?\.pointerId\)\) return false;/);
    expect(stagePointerSource).toMatch(/if \(currentTool === TOOLS\.PEN\) \{[\s\S]*?beginDrawingPointerSession\(event\);[\s\S]*?drawingInteractionController\.startStroke/);
    expect(stagePointerSource).toMatch(/if \(currentTool === TOOLS\.ERASER_STROKE\) \{[\s\S]*?beginDrawingPointerSession\(event\);[\s\S]*?drawingInteractionController\.beginEraser/);
    // showStrokeEraser must fire before eraseStrokeAt to keep cursor visible during board re-render
    const eraserPointerDown = stagePointerSource.slice(
      stagePointerSource.indexOf("if (currentTool === TOOLS.ERASER_STROKE) {"),
      stagePointerSource.indexOf("if (currentTool === TOOLS.ERASER_OBJECT) {"),
    );
    expect(eraserPointerDown.indexOf("showStrokeEraser")).toBeLessThan(eraserPointerDown.indexOf("eraseStrokeAt"));
    expect(stagePointerSource).toMatch(/if \(isShapeTool\(drawingTool\)\) \{[\s\S]*?beginDrawingPointerSession\(event\);[\s\S]*?draftInteractionController\.startShapeDraft/);
    expect(styles).toMatch(/\.stage-container \{[\s\S]*?touch-action: none;/);
  });

  it("treats endpoint-clipped eraser fragments as changed strokes", () => {
    const drawingSource = readFileSync(new URL("../../../src/app/tools/drawing-interaction-controller.js", import.meta.url), "utf8");
    const eraseSource = drawingSource.slice(
      drawingSource.indexOf("function eraseStrokeAt(worldPoint, radius)"),
      drawingSource.indexOf("function eraseStrokeAlongPath"),
    );

    expect(drawingSource).toContain("areStrokeFragmentsEquivalent");
    expect(eraseSource).toContain("!areStrokeFragmentsEquivalent(element, fragments)");
    expect(eraseSource).not.toContain("fragments.length !== 1 || fragments[0].points.length !== element.points.length");
  });

  it("guards pointerleave hideToolCursors behind hasActiveDrawingPointerCapture so eraser stays visible", () => {
    const appSource = readFileSync(new URL("../../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const pointerleaveLine = appSource.slice(
      appSource.indexOf('"pointerleave"'),
      appSource.indexOf('"pointerleave"') + 130,
    );
    expect(pointerleaveLine).toContain("hasActiveDrawingPointerCapture");
  });

  it("keeps eraser cursor visible during active erasing even when hideToolCursors fires", () => {
    const cursorSource = readFileSync(new URL("../../../src/app/tools/cursor-controller.js", import.meta.url), "utf8");
    const hideSource = cursorSource.slice(
      cursorSource.indexOf("function hideToolCursors()"),
      cursorSource.indexOf("function updateBrushCursorStyle()"),
    );
    // During active erasing (hasActiveEraserSnapshot), eraser cursors stay visible
    expect(hideSource).toContain("hasActiveEraserSnapshot()");
    expect(hideSource).toContain("eraserCursor.visible(false)");
    expect(hideSource.indexOf("hasActiveEraserSnapshot()")).toBeLessThan(hideSource.indexOf("eraserCursor.visible(false)"));
  });

  it("always calls showStrokeEraser on pointermove during active erasing to track cursor position", () => {
    const stagePointerSource = readFileSync(new URL("../../../src/app/shell/stage-pointer-controller.js", import.meta.url), "utf8");
    // Skip the first (hover) block — target the active erasing block
    const first = stagePointerSource.indexOf("hasActiveEraserSnapshot()) {");
    const second = stagePointerSource.indexOf("hasActiveEraserSnapshot()) {", first + 1);
    const activeBlock = stagePointerSource.slice(second, second + 200);
    // showStrokeEraser must be called unconditionally (no radius guard) to track cursor position
    expect(activeBlock).toContain("showStrokeEraser(worldPoint, radius)");
    expect(activeBlock).not.toContain("lastDisplayedEraserRadius");
  });

  it("uses scale-aware stroke eraser sizing without the old minimum radius floor", () => {
    const appSource = readFileSync(new URL("../../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const toolCursorSource = readFileSync(new URL("../../../src/app/tools/cursor-controller.js", import.meta.url), "utf8");
    const eraserSource = toolCursorSource.slice(
      toolCursorSource.indexOf("function getBaseEraserRadius()"),
      toolCursorSource.indexOf("function showObjectEraser"),
    );

    expect(appSource).not.toContain("getMinimumEraserRadius");
    expect(appSource).toContain("createToolCursorController");
    expect(eraserSource).toContain("getBaseEraserRadiusForWidth(getStrokeWidth())");
    expect(eraserSource).toContain("getScaledEraserRadius(radius, getScale())");
    expect(eraserSource).toContain("getSquareEraserPreviewAttrs(worldPoint, visibleRadius, getScale())");
  });

  it("shows a small icon for object eraser instead of the square erase footprint", () => {
    const appSource = readFileSync(new URL("../../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const toolCursorSource = readFileSync(new URL("../../../src/app/tools/cursor-controller.js", import.meta.url), "utf8");
    const objectEraserSource = toolCursorSource.slice(
      toolCursorSource.indexOf("function showObjectEraser(worldPoint)"),
      toolCursorSource.indexOf("function hideEraser"),
    );
    const strokeEraserSource = toolCursorSource.slice(
      toolCursorSource.indexOf("function showStrokeEraser(worldPoint"),
      toolCursorSource.indexOf("function showObjectEraser"),
    );

    expect(appSource).toContain("createToolCursorController");
    expect(toolCursorSource).toContain("const objectEraserCursor = new Konva.Group");
    expect(objectEraserSource).toContain("getObjectEraserIconAttrs(worldPoint, getScale())");
    expect(objectEraserSource).toContain("eraserCursor.visible(false)");
    expect(objectEraserSource).not.toContain("getSquareEraserPreviewAttrs");
    expect(strokeEraserSource).toContain("getSquareEraserPreviewAttrs");
  });

  it("keeps array cell pointer down on the cell event route instead of the canvas drag route", () => {
    const appSource = readFileSync(new URL("../../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const gestureSource = readFileSync(new URL("../../../src/app/structures/linear-gesture-controller.js", import.meta.url), "utf8");
    const selectPointerDownSource = extractStageSelectPointerDownSource();
    const itemPressSource = gestureSource.slice(
      gestureSource.indexOf("function handleArrayStructureItemPress"),
      gestureSource.indexOf("function handleArrayStructureItemRelease"),
    );

    expect(appSource).not.toContain("const arrayValueHitNode");
    expect(selectPointerDownSource).not.toContain('array-item-value-hit');
    expect(selectPointerDownSource).not.toContain("if (arrayValueHitNode && isLinearStructureElement(element))");
    expect(itemPressSource).toContain("linearItemPressState = {");
    expect(itemPressSource).toContain("setElementDraggableState(result.pressState.elementId, false)");
  });

  it("moves the whole array from a linear item press movement before long press reordering starts", () => {
    const appSource = readFileSync(new URL("../../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const stagePointerSource = readStagePointerSource();
    const gestureSource = readFileSync(new URL("../../../src/app/structures/linear-gesture-controller.js", import.meta.url), "utf8");
    const pointerMoveSource = stagePointerSource.slice(
      stagePointerSource.indexOf("function handlePointerMove(event)"),
      stagePointerSource.indexOf("function handlePointerUp(event)"),
    );
    const itemPressMoveSource = gestureSource.slice(
      gestureSource.indexOf("if (linearItemPressState?.phase === \"start\""),
      gestureSource.indexOf("return false;"),
    );
    const itemPressHandlerSource = gestureSource.slice(
      gestureSource.indexOf("function handleArrayStructureItemPress"),
      gestureSource.indexOf("function handleArrayStructureItemRelease"),
    );

    expect(appSource).toContain("handleLinearPointerMove: (worldPoint) => linearGestureController.handlePointerMove(worldPoint)");
    expect(pointerMoveSource).toContain("handleLinearPointerMove(worldPoint)");
    expect(itemPressMoveSource).not.toContain("activeLinearItem?.elementId");
    expect(itemPressMoveSource).not.toContain("beginLinearItemDrag({");
    expect(itemPressMoveSource).toContain("const pressedElementId = linearItemPressState.elementId");
    expect(itemPressMoveSource).toContain("selectIds([pressedElementId]);");
    expect(itemPressMoveSource).toContain("beginSelectionDrag(pressStart);");
    expect(itemPressMoveSource).toContain("updateSelectionDrag(worldPoint);");
    expect(itemPressMoveSource).toContain("return true;");
    expect(itemPressHandlerSource).toContain("setTimeoutFn(() =>");
    expect(itemPressHandlerSource).toContain("phase: \"hold\"");
    expect(itemPressHandlerSource).toContain("beginLinearItemDrag({");
  });

  it("does not auto-activate the first linear item just because the array itself became selected", () => {
    const appSource = readFileSync(new URL("../../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const orchestratorSource = readOrchestratorSource();
    const interactionSource = readFileSync(new URL("../../../src/structures/interaction.js", import.meta.url), "utf8");

    expect(appSource).toContain("const structureInteraction = createStructureInteraction();");
    expect(orchestratorSource).toContain("structureInteraction.syncSelection({");
    expect(interactionSource).toContain("if (!selectedLinear) {");
    expect(interactionSource).toContain("activeLinearItem = null;");
    expect(interactionSource).toContain("if (activeLinearItem?.elementId === selectedLinear.id) {");
    expect(interactionSource).not.toContain("const fallbackIndex = activeLinearItem?.elementId === elementId ? activeLinearItem.index : 0;");
    expect(appSource).not.toContain("setActiveLinearItem(selectedLinear.id, 0, { syncPanel: false })");
  });

  it("ignores global delete shortcuts while typing in form controls", () => {
    const appSource = readFileSync(new URL("../../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const keyboardSource = readFileSync(new URL("../../../src/app/shell/keyboard-controller.js", import.meta.url), "utf8");

    expect(appSource).toContain("isTypingInEditableControl,");
    expect(keyboardSource).toContain("isTypingInEditableControl(event.target)");
    expect(keyboardSource).toContain("if (isTypingInEditableControl(event.target)) return;");
    expect(appSource).toContain("target instanceof HTMLInputElement");
    expect(appSource).toContain("target instanceof HTMLTextAreaElement");
    expect(appSource).toContain("target?.isContentEditable");
  });

  it("keeps whiteboard select-all from selecting browser page text", () => {
    const appSource = readFileSync(new URL("../../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const keyboardSource = readFileSync(new URL("../../../src/app/shell/keyboard-controller.js", import.meta.url), "utf8");
    const uiEventsSource = readFileSync(new URL("../../../src/app/shell/ui-events-controller.js", import.meta.url), "utf8");
    const styles = readFileSync(new URL("../../../src/styles.css", import.meta.url), "utf8");

    expect(appSource).toContain("createKeyboardController");
    expect(appSource).toContain("createUiEventsController");
    expect(keyboardSource).toContain("shouldUseBrowserSelectAll");
    expect(keyboardSource).toMatch(/if \(shouldSelectAll\(event\)\) \{[\s\S]*?if \(shouldUseBrowserSelectAll\(event\)\) return;[\s\S]*?event\.preventDefault\(\);[\s\S]*?clearNativeSelection\(\);/);
    expect(keyboardSource).toMatch(/windowTarget\.addEventListener\("keydown", handleKeyDown, \{ capture: true \}\);/);
    expect(uiEventsSource).toMatch(/bind\(documentTarget, "selectstart", \(event\) => \{[\s\S]*?isNativeTextEditingTarget\(event\.target\)[\s\S]*?event\.preventDefault\(\);[\s\S]*?\}, \{ capture: true \}\);/);
    expect(uiEventsSource).toContain("target.removeEventListener(type, listener, options)");
    expect(keyboardSource.indexOf("if (shouldSelectAll(event)) {")).toBeLessThan(
      keyboardSource.indexOf("if (isTypingInEditableControl(event.target)) return;"),
    );
    expect(keyboardSource).toContain("clearNativeSelection();");
    expect(appSource).toContain("document.getSelection?.()?.removeAllRanges?.();");
    expect(styles).toMatch(/html,\nbody,\n#app \{[\s\S]*?user-select: none;/);
    expect(styles).toMatch(/html,\nbody,\n#app \{[\s\S]*?-webkit-user-select: none;/);
    expect(styles).toMatch(/\.app-shell input\[type="text"\],[\s\S]*?\.app-shell \[contenteditable="true"\] \{[\s\S]*?user-select: text;/);
  });

  it("cancels root-node drag state when committing a linear item reorder", () => {
    const appSource = readFileSync(new URL("../../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const itemDragSource = readFileSync(new URL("../../../src/app/structures/linear-item-drag-controller.js", import.meta.url), "utf8");
    const gestureSource = readFileSync(new URL("../../../src/app/structures/linear-gesture-controller.js", import.meta.url), "utf8");
    const selectionDragSource = readFileSync(new URL("../../../src/app/selection/drag-controller.js", import.meta.url), "utf8");

    expect(appSource).toContain("setSuppressSelectionDragOnce: (value) => { suppressSelectionDragOnce = value; }");
    expect(gestureSource).toContain("setSuppressSelectionDragOnce(true)");
    expect(selectionDragSource).toContain("function clearRootDragState(elementId)");
    expect(selectionDragSource).toContain("suppressedNodeDragElementId = elementId");
    expect(selectionDragSource).toContain("contentLayer.findOne(`#${elementId}`)?.stopDrag()");
    expect(selectionDragSource).toContain("nodeDragSelection = null");
    expect(selectionDragSource).toContain("selectionDrag = null");
    expect(itemDragSource).toContain("clearRootDragState(dragState.elementId)");
  });

  it("keeps array item selection suppressed until the post-drag click is consumed", () => {
    const appSource = readFileSync(new URL("../../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const structureSource = readFileSync(new URL("../../../src/structures/interaction.js", import.meta.url), "utf8");
    const itemDragSource = readFileSync(new URL("../../../src/app/structures/linear-item-drag-controller.js", import.meta.url), "utf8");
    const gestureSource = readFileSync(new URL("../../../src/app/structures/linear-gesture-controller.js", import.meta.url), "utf8");
    const commitSource = itemDragSource.slice(
      itemDragSource.indexOf("function commitLinearItemDrag()"),
    );
    const selectSource = gestureSource.slice(
      gestureSource.indexOf("function handleArrayStructureItemSelect"),
      gestureSource.indexOf("function handleArrayStructureItemPress"),
    );

    expect(appSource).not.toContain("let suppressLinearItemSelect = null;");
    expect(structureSource).toContain("let suppressLinearItemSelect = null;");
    expect(appSource).not.toContain("let suppressLinearItemSelectTimer = null;");
    expect(gestureSource).toContain("let suppressLinearItemSelectTimer = null;");
    expect(gestureSource).toContain("function suppressNextLinearItemSelect(elementId)");
    expect(gestureSource).toContain("function clearLinearItemSelectSuppression()");
    expect(gestureSource).toContain("structureInteraction.suppressNextLinearItemSelect(elementId);");
    expect(gestureSource).toContain("structureInteraction.clearLinearItemSelectSuppression();");
    expect(commitSource).toContain("suppressNextLinearItemSelect(dragState.elementId)");
    const selectionDragSource = readFileSync(new URL("../../../src/app/selection/drag-controller.js", import.meta.url), "utf8");
    expect(selectionDragSource).toContain("function suppressLinearItemSelectAfterSelectionDrag()");
    expect(selectionDragSource).toContain("if (didMove) suppressLinearItemSelectAfterSelectionDrag();");
    expect(selectionDragSource).toContain("suppressNextLinearItemSelect(draggedLinearElement.id)");
    expect(commitSource).not.toContain("requestAnimationFrame(() =>");
    expect(selectSource).not.toContain("isLinearItemSelectSuppressed: suppressLinearItemSelect?.elementId === elementId");
    expect(selectSource).toContain("structureInteraction.handleEvent({");
    expect(selectSource).toMatch(/if \(result\.clearSuppression\) \{[\s\S]*?clearLinearItemSelectSuppression\(\);[\s\S]*?return;/);
  });

  it("activates an array item without rerendering the clicked node before dblclick", () => {
    const appSource = readFileSync(new URL("../../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const activeVisualSource = readFileSync(new URL("../../../src/app/structures/active-visual-controller.js", import.meta.url), "utf8");
    const gestureSource = readFileSync(new URL("../../../src/app/structures/linear-gesture-controller.js", import.meta.url), "utf8");

    expect(appSource).toContain("const linearStructureEventAdapter = createLinearStructureEventAdapter((event) => {");
    expect(appSource).toContain("linearGestureController?.dispatchLinearStructureEvent(event);");
    expect(readOrchestratorSource()).toContain("onArrayItemSelect: linearStructureEventAdapter.onArrayItemSelect");
    expect(gestureSource).toContain("function dispatchLinearStructureEvent(event)");
    expect(gestureSource).toContain("function handleArrayStructureItemSelect({ elementId, index })");
    expect(gestureSource).toContain("structureInteraction.handleEvent({");
    expect(gestureSource).toContain("type: LINEAR_STRUCTURE_EVENT_TYPES.ITEM_SELECT");
    expect(gestureSource).toContain("selectIds(result.selectedIds)");
    expect(appSource).toMatch(/import \{[\s\S]*syncLinearStructureNodeContent,[\s\S]*\} from "\.\.\/canvas\/konva-elements\.js";/);
    expect(gestureSource).toContain("syncLinearItemActiveVisual(result.previousActiveLinearItem?.elementId)");
    expect(gestureSource).toContain("syncLinearItemActiveVisual(result.activeLinearItem?.elementId)");
    expect(activeVisualSource).toContain("syncLinearStructureNodeContent(group, runtimeElement, getElementNodeHandlers(runtimeElement));");
    expect(activeVisualSource).not.toContain("node.stroke(isActive ? \"#2563eb\" : style.stroke)");
  });

  it("clears array item active styling when the canvas selection is cleared", () => {
    const appSource = readFileSync(new URL("../../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const orchestratorSource = readOrchestratorSource();

    expect(orchestratorSource).toContain("const { previousActiveLinearItem, activeLinearItem } = structureInteraction.syncSelection({");
    expect(orchestratorSource).toContain("syncLinearItemActiveVisual(previousActiveLinearItem?.elementId)");
    expect(orchestratorSource).toContain("contentLayer.batchDraw()");
  });

  it("uses setAttrs for linear drag preview group styling and always hides the drop indicator", () => {
    const itemDragSource = readFileSync(new URL("../../../src/app/structures/linear-item-drag-controller.js", import.meta.url), "utf8");

    expect(itemDragSource).toContain("itemNode.setAttrs({");
    expect(itemDragSource).not.toContain("itemNode.shadowBlur(");
    expect(itemDragSource).toContain("indicator.visible(false)");
  });

  it("animates the long-press array item lift and drop states", () => {
    const itemDragSource = readFileSync(new URL("../../../src/app/structures/linear-item-drag-controller.js", import.meta.url), "utf8");

    expect(itemDragSource).toContain("animateLinearItemLift");
    expect(itemDragSource).toContain("animateLinearItemDrop");
    expect(itemDragSource).toContain("structureInteraction.markLinearItemDragLifted()");
    expect(itemDragSource).toContain("onFinish: finishLinearItemDrop");
  });

  it("keeps the dragged array item under direct pointer control during gap animations", () => {
    const itemDragSource = readFileSync(new URL("../../../src/app/structures/linear-item-drag-controller.js", import.meta.url), "utf8");

    expect(itemDragSource).toContain("if (index === linearItemDragState.fromIndex) {");
    expect(itemDragSource).toContain("updateLinearDragVisualPosition();");
    expect(itemDragSource).toContain("return;");
    expect(itemDragSource).toContain("linearItemLiftTween?.destroy()");
    expect(itemDragSource).not.toContain("itemNode.stop()");
  });

  it("renders direct array item controls around the selected item", () => {
    const appSource = readFileSync(new URL("../../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const nodeActionSource = readFileSync(new URL("../../../src/app/structures/node-action-controller.js", import.meta.url), "utf8");
    const controlsSource = readFileSync(new URL("../../../src/app/structures/controls-controller.js", import.meta.url), "utf8");
    const styles = readFileSync(new URL("../../../src/styles.css", import.meta.url), "utf8");

    expect(appSource).toContain("renderLinearItemControls");
    expect(controlsSource).toContain("data-linear-item-action");
    expect(nodeActionSource).toContain('"insert-before"');
    expect(nodeActionSource).toContain('"insert-after"');
    expect(nodeActionSource).toContain('"delete"');
    expect(nodeActionSource).toContain('insertArrayItem(item, insertIndex, "0")');
    expect(styles).toContain(".linear-item-controls");
  });

  it("keeps the current array item selected after inserting adjacent items", () => {
    const nodeActionSource = readFileSync(new URL("../../../src/app/structures/node-action-controller.js", import.meta.url), "utf8");
    const actionSource = nodeActionSource.slice(
      nodeActionSource.indexOf("function runLinearItemAction(action)"),
      nodeActionSource.indexOf("function runTreeNodeAction(action)"),
    );

    expect(actionSource).toContain("const nextActiveIndex = action === \"insert-before\" ? index + 1 : index;");
    expect(actionSource).toContain("setActiveLinearItem(elementId, nextActiveIndex);");
    expect(actionSource).not.toContain("setActiveLinearItem(elementId, insertIndex);");
  });

  it("only enables direct array item editing while the select tool is active", () => {
    const appSource = readFileSync(new URL("../../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const orchestratorSource = readOrchestratorSource();

    expect(orchestratorSource).toContain("canEditArrayItems: getCurrentTool() === TOOLS.SELECT && !isTemporaryPanActive()");
  });

  it("keeps stale array item press handlers from selecting or dragging arrays while using the pen", () => {
    const appSource = readFileSync(new URL("../../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const interactionSource = readFileSync(new URL("../../../src/structures/interaction.js", import.meta.url), "utf8");
    const gestureSource = readFileSync(new URL("../../../src/app/structures/linear-gesture-controller.js", import.meta.url), "utf8");
    const selectHandlerSource = gestureSource.slice(
      gestureSource.indexOf("function handleArrayStructureItemSelect"),
      gestureSource.indexOf("function handleArrayStructureItemPress"),
    );
    const pressHandlerSource = gestureSource.slice(
      gestureSource.indexOf("function handleArrayStructureItemPress"),
      gestureSource.indexOf("function handleArrayStructureItemRelease"),
    );
    const pointerHandlerSource = gestureSource.slice(
      gestureSource.indexOf("function handleArrayPointerPress"),
      gestureSource.indexOf("function resetLinearItemPressState"),
    );
    const setToolSource = readToolActivationSource();

    expect(selectHandlerSource).toContain("structureInteraction.handleEvent");
    expect(gestureSource).toContain("currentTool: getCurrentTool()");
    expect(gestureSource).toContain("isTemporaryPanActive: isTemporaryPanActive()");
    expect(interactionSource).toContain("currentTool !== SELECT_TOOL");
    expect(pressHandlerSource).toContain("structureInteraction.handleEvent({");
    expect(pressHandlerSource).toContain("type: LINEAR_STRUCTURE_EVENT_TYPES.ITEM_PRESS");
    expect(pressHandlerSource).toContain("getInteractionContext()");
    expect(gestureSource).toContain("currentTool: getCurrentTool()");
    expect(gestureSource).toContain("isTemporaryPanActive: isTemporaryPanActive()");
    expect(pointerHandlerSource).toContain("getCurrentTool() !== selectTool");
    expect(appSource).toContain("resetLinearItemPressState: () => linearGestureController.resetLinearItemPressState()");
    expect(appSource).toContain("resetLinearPointerPressState: () => linearGestureController.resetLinearPointerPressState()");
    expect(appSource).toContain("cancelSelectionDrag: () => selectionDragController.cancelSelectionDrag()");
    expect(setToolSource).toContain("resetLinearItemPressState()");
    expect(setToolSource).toContain("resetLinearPointerPressState()");
    expect(setToolSource).toContain("cancelSelectionDrag()");
    expect(setToolSource).toContain("if (toolChanged && (tool === tools.SELECT || previousTool === tools.SELECT))");
    expect(setToolSource).toContain("renderBoard();");
  });

  it("re-renders the board after the initial setTool so linear structure cells get interactivity", () => {
    const appSource = readFileSync(new URL("../../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(appSource).toMatch(/setTool\(TOOLS\.PEN\);\s*\n\s*renderBoard\(\);/);
  });

  it("clears the active array item when starting an array algorithm", () => {
    const algorithmSource = readFileSync(new URL("../../../src/app/algorithms/array/session-controller.js", import.meta.url), "utf8");
    const startSource = algorithmSource.slice(
      algorithmSource.indexOf("function startSelectedArrayAlgorithm()"),
      algorithmSource.indexOf("function clearActiveLinearItemForAlgorithmStart"),
    );

    expect(startSource).toContain("clearActiveLinearItemForAlgorithmStart(element.id);");
    expect(algorithmSource).toContain("function clearActiveLinearItemForAlgorithmStart(elementId)");
    expect(algorithmSource).toContain("hideLinearItemControls();");
  });

  it("keeps the selected algorithm name when stopping an unfinished array algorithm", () => {
    const algorithmSource = readFileSync(new URL("../../../src/app/algorithms/array/session-controller.js", import.meta.url), "utf8");
    const stopSource = algorithmSource.slice(
      algorithmSource.indexOf("function stopArrayAlgorithmSession()"),
      algorithmSource.indexOf("function runArrayAlgorithmReverseStep"),
    );

    expect(stopSource).toContain("const algorithmLabel = session.algorithmLabel ?? \"排序\";");
    expect(stopSource).toContain("deleteArrayAlgorithmSession(elementId);");
    expect(stopSource).toContain("pushHistory(`已执行${algorithmLabel}`);");
    expect(stopSource).not.toContain("pushHistory(`已执行${arrayAlgorithmSession?.algorithmLabel");
  });

  it("keeps array algorithm sessions independent per array element", () => {
    const appSource = readFileSync(new URL("../../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const algorithmSource = readFileSync(new URL("../../../src/app/algorithms/array/session-controller.js", import.meta.url), "utf8");
    const structureSource = readFileSync(new URL("../../../src/structures/interaction.js", import.meta.url), "utf8");

    expect(appSource).not.toContain("let arrayAlgorithmSessions = new Map();");
    expect(structureSource).toContain("let arrayAlgorithmSessions = new Map();");
    expect(appSource).toContain("createArrayAlgorithmSessionController");
    expect(algorithmSource).toContain("function getArrayAlgorithmSession(elementId)");
    expect(algorithmSource).toContain("return structureInteraction.getArrayAlgorithmSession(elementId);");
    expect(algorithmSource).toContain("function setArrayAlgorithmSession(session)");
    expect(algorithmSource).toContain("structureInteraction.setArrayAlgorithmSession(session);");
    expect(algorithmSource).toContain("function pauseUnselectedArrayAlgorithmSessions()");
    expect(algorithmSource).toContain("structureInteraction.pauseUnselectedArrayAlgorithmSessions(getSelectedIds());");
    expect(appSource).not.toContain("let arrayAlgorithmSession = null;");
  });

  it("keeps array algorithm panel choices independent per array element", () => {
    const appSource = readFileSync(new URL("../../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const algorithmSource = readFileSync(new URL("../../../src/app/algorithms/array/session-controller.js", import.meta.url), "utf8");
    const structureSource = readFileSync(new URL("../../../src/structures/interaction.js", import.meta.url), "utf8");
    const panelSource = readFileSync(new URL("../../../src/app/algorithms/array/panel-controller.js", import.meta.url), "utf8");
    const startSource = algorithmSource.slice(
      algorithmSource.indexOf("function startSelectedArrayAlgorithm()"),
      algorithmSource.indexOf("function clearActiveLinearItemForAlgorithmStart"),
    );
    const syncSource = panelSource.slice(
      panelSource.indexOf("function syncArrayAlgorithmPanelState()"),
      panelSource.indexOf("return {"),
    );

    expect(appSource).not.toContain("let arrayAlgorithmPanelStateByElement = new Map();");
    expect(structureSource).toContain("let arrayAlgorithmPanelStateByElement = new Map();");
    expect(algorithmSource).toContain("function getArrayAlgorithmPanelState(elementId)");
    expect(algorithmSource).toContain("return structureInteraction.getArrayAlgorithmPanelState(elementId, DEFAULT_ARRAY_ALGORITHM_PANEL_STATE);");
    expect(algorithmSource).toContain("function setArrayAlgorithmPanelState(elementId, patch)");
    expect(algorithmSource).toContain("structureInteraction.setArrayAlgorithmPanelState(elementId, patch, DEFAULT_ARRAY_ALGORITHM_PANEL_STATE);");
    expect(appSource).toContain("createControlsBindingController");
    expect(readFileSync(new URL("../../../src/app/shell/controls-binding-controller.js", import.meta.url), "utf8")).toContain("bindArrayAlgorithmPanelEvents();");
    expect(panelSource).toContain("arrayAlgorithmSelect?.addEventListener(\"change\"");
    expect(startSource).toContain("const panelState = getArrayAlgorithmPanelState(element.id);");
    expect(startSource).toContain("createArrayAlgorithmSteps(panelState.algorithm, values)");
    expect(syncSource).toContain("arrayAlgorithmSelect.value = session?.algorithm ?? panelState.algorithm;");
    expect(syncSource).toContain("arrayAlgorithmSpeed.value = String(session?.speed ?? panelState.speed);");
  });

  it("uses a faster base duration for array algorithm animations", () => {
    const algorithmSource = readFileSync(new URL("../../../src/app/algorithms/array/session-controller.js", import.meta.url), "utf8");

    expect(algorithmSource).toContain("export const ARRAY_ALGORITHM_BASE_STEP_MS = 460;");
    expect(algorithmSource).toContain("ARRAY_ALGORITHM_BASE_STEP_MS / Math.max(0.5, speed)");
    expect(algorithmSource).not.toContain("Math.round(700 / Math.max(0.5, speed))");
  });

  it("returns to select after placement unless the toolbar tool is locked", () => {
    const stagePointerSource = readStagePointerSource();
    const drawingSource = readFileSync(new URL("../../../src/app/tools/drawing-interaction-controller.js", import.meta.url), "utf8");
    const draftSource = readFileSync(new URL("../../../src/app/tools/draft-interaction-controller.js", import.meta.url), "utf8");

    expect(draftSource).toMatch(/function finishShapeDraft\(\) \{[\s\S]*?addElement\(element, "已添加形状"\);[\s\S]*?selectIds\(\[element\.id\]\);[\s\S]*?nextToolAfterPlacement\(currentTool, getKeepToolActive\(\)\);/);
    expect(drawingSource).toMatch(/function finishStroke\(\) \{[\s\S]*?addElement\(element, "已添加笔触"\);[\s\S]*?\}/);
    expect(stagePointerSource).toContain("nextToolAfterPlacement(tool, getKeepToolActive())");
    expect(stagePointerSource).toContain("updateToolAfterPlacement(currentTool)");
  });

  it("opens image import from the toolbar without switching drawing tools", () => {
    const markup = renderShell();
    const appSource = readFileSync(new URL("../../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const appActionSource = readFileSync(new URL("../../../src/app/shell/action-controller.js", import.meta.url), "utf8");
    const controlsBindingSource = readFileSync(new URL("../../../src/app/shell/controls-binding-controller.js", import.meta.url), "utf8");
    const importWorkflowSource = readFileSync(new URL("../../../src/app/import-export/import-workflow-controller.js", import.meta.url), "utf8");

    expect(markup).toContain('data-tool-action="import-image"');
    expect(markup).toContain('data-image-input type="file" accept="image/*" hidden');
    expect(appSource).toContain("createControlsBindingController");
    expect(controlsBindingSource).toContain('root.querySelectorAll("[data-tool-action]")');
    expect(controlsBindingSource).toContain('runToolAction(button.dataset.toolAction)');
    expect(appActionSource).toContain('"import-image": openImagePicker');
    expect(appSource).toContain("createImportWorkflowController");
    expect(importWorkflowSource).toContain('insertImageFile(file, "已导入图片", { preferViewportCenter: true })');
    expect(importWorkflowSource).toContain('anchor: preferViewportCenter ? "center" : "top-left"');
  });

  it("commits text and sticky editors when pointer down starts outside the editor", () => {
    const appSource = readFileSync(new URL("../../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const editSource = readFileSync(new URL("../../../src/app/editing/controller.js", import.meta.url), "utf8");

    expect(appSource).toContain("editController.editElement");
    expect(editSource).toContain("handleEditorOutsidePointerDown");
    expect(editSource).toContain("window.addEventListener(\"pointerdown\", handleEditorOutsidePointerDown, { capture: true })");
    expect(editSource).toContain("shouldPreserveTextEditorOnPointerDown({");
    expect(editSource).toContain("doCommit();");
  });

  it("preserves empty text boxes when the property panel receives pointer focus", () => {
    const editSource = readFileSync(new URL("../../../src/app/editing/controller.js", import.meta.url), "utf8");

    expect(editSource).toContain("shouldPreserveTextEditorOnPointerDown");
    expect(editSource).toContain("doCommit({ preserveEmptyText: true });");
    expect(editSource).toMatch(/if \(!nextText && element\.type !== "sticky" && !preserveEmptyText\) \{[\s\S]*?已删除空文字/);
  });

  it("prevents array cell editor outside clicks from starting a tiny selection box", () => {
    const appSource = readFileSync(new URL("../../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const stagePointerSource = readStagePointerSource();
    const editorSource = readFileSync(new URL("../../../src/app/structures/cell-editor-controller.js", import.meta.url), "utf8");

    expect(appSource).toContain("setSuppressNextCanvasSelection: (value) => { suppressNextCanvasSelection = value; }");
    expect(appSource).toContain("consumeSuppressNextCanvasSelection: () => {");
    expect(stagePointerSource).toContain("if (consumeSuppressNextCanvasSelection()) {");
    expect(editorSource).toContain("setSuppressNextCanvasSelection(container.contains(event.target))");
    expect(editorSource).toContain("windowRef.addEventListener(\"pointerdown\", handleCellEditorOutsidePointerDown, { capture: true })");
    expect(editorSource).toContain("windowRef.removeEventListener(\"pointerdown\", handleCellEditorOutsidePointerDown, { capture: true })");
  });

  it("keeps the array cell editor synced when the viewport or structure scale changes", () => {
    const appSource = readFileSync(new URL("../../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const editorSource = readFileSync(new URL("../../../src/app/structures/cell-editor-controller.js", import.meta.url), "utf8");
    const viewportSource = readFileSync(new URL("../../../src/app/viewport/controller.js", import.meta.url), "utf8");
    const viewportControllerSource = appSource.slice(
      appSource.indexOf("const viewportController = createViewportController"),
      appSource.indexOf("hydrateLocalDraft();"),
    );

    expect(appSource).toContain("createStructureCellEditorController");
    expect(editorSource).toContain("let activeCellEditorSync = null;");
    expect(editorSource).toContain("function syncActiveCellEditor()");
    expect(viewportControllerSource).toContain("syncActiveCellEditor,");
    expect(editorSource).toContain("activeCellEditorSync = syncCellEditorStyle;");
    expect(editorSource).toContain("const scale = stage.scaleX() * (node.scaleX() || 1)");
    expect(editorSource).toContain("syncCellEditorStyle();");
    expect(editorSource).toContain("activeCellEditorSync = null;");
    expect(viewportSource).toMatch(/function updateGrid\(\) \{[\s\S]*?syncActiveCellEditor\(\);/);
  });

  it("keeps long-press linear item reordering separate from whole-array dragging", () => {
    const gestureSource = readFileSync(new URL("../../../src/app/structures/linear-gesture-controller.js", import.meta.url), "utf8");
    const itemPressMoveSource = gestureSource.slice(
      gestureSource.indexOf("if (linearItemPressState?.phase === \"start\""),
      gestureSource.indexOf("return false;"),
    );

    expect(itemPressMoveSource).toContain("linearItemPressState?.phase === \"start\"");
    expect(itemPressMoveSource).toContain("beginSelectionDrag(pressStart)");
    expect(itemPressMoveSource).toContain("updateSelectionDrag(worldPoint)");
    expect(itemPressMoveSource).not.toContain("beginLinearItemDrag({");
  });

  it("supports dragging the linear pointer and syncing the pointer field", () => {
    const appSource = readFileSync(new URL("../../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const pointerDragSource = readFileSync(new URL("../../../src/app/structures/linear-pointer-drag-controller.js", import.meta.url), "utf8");
    const gestureSource = readFileSync(new URL("../../../src/app/structures/linear-gesture-controller.js", import.meta.url), "utf8");

    expect(readOrchestratorSource()).toContain("onArrayPointerPress: (event) => linearGestureController.handleArrayPointerPress(event)");
    expect(gestureSource).toContain("function handleArrayPointerPress({ elementId, index })");
    expect(appSource).toContain("createLinearStructurePointerDragController");
    expect(pointerDragSource).toContain("function beginLinearPointerDrag");
    expect(pointerDragSource).toContain("function updateLinearPointerDrag");
    expect(pointerDragSource).toContain("setArrayPointer(item, nextIndex)");
    expect(pointerDragSource).toContain("animateLinearPointerDragVisual");
    expect(appSource).toContain("setLinearPanelState: (patch) => structureInspectorController.setLinearPanelState(patch)");
    expect(pointerDragSource).toContain("highlightPointer: String(nextIndex)");
  });

  it("cleans root drag state when committing a linear pointer drag", () => {
    const appSource = readFileSync(new URL("../../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const pointerDragSource = readFileSync(new URL("../../../src/app/structures/linear-pointer-drag-controller.js", import.meta.url), "utf8");
    const gestureSource = readFileSync(new URL("../../../src/app/structures/linear-gesture-controller.js", import.meta.url), "utf8");
    const selectionDragSource = readFileSync(new URL("../../../src/app/selection/drag-controller.js", import.meta.url), "utf8");

    expect(selectionDragSource).toContain("function clearRootDragState(elementId)");
    expect(pointerDragSource).toContain("clearRootDragState(dragState.elementId)");
    expect(gestureSource).toMatch(/function handleArrayPointerPress\(\{ elementId, index \}\) \{[\s\S]*?clearRootDragState\(elementId\);/);
  });

  it("animates linear pointer movement without rerendering the full array on every index change", () => {
    const pointerDragSource = readFileSync(new URL("../../../src/app/structures/linear-pointer-drag-controller.js", import.meta.url), "utf8");

    expect(pointerDragSource).toContain("let linearPointerTween = null");
    expect(pointerDragSource).toContain("function animateLinearPointerDragVisual");
    expect(pointerDragSource).toContain("createTween = (config) => new Konva.Tween(config)");
    expect(pointerDragSource).toMatch(/function updateLinearPointerDrag\(worldPoint\) \{[\s\S]*?structureInteraction\.getLinearPointerDragState\(\);[\s\S]*?structureInteraction\.updateLinearPointerDrag\(\{[\s\S]*?nextIndex,[\s\S]*?\}\);[\s\S]*?animateLinearPointerDragVisual\(dragState\.elementId, nextIndex\);[\s\S]*?return true;[\s\S]*?\}/);
  });

  it("lifts the linear pointer when dragging starts and drops it before rerendering on release", () => {
    const pointerDragSource = readFileSync(new URL("../../../src/app/structures/linear-pointer-drag-controller.js", import.meta.url), "utf8");
    const linearRuntimeSource = readFileSync(new URL("../../../src/app/structures/linear-runtime.js", import.meta.url), "utf8");

    expect(linearRuntimeSource).toContain("export const LINEAR_POINTER_BASE_Y = -30");
    expect(linearRuntimeSource).toContain("export const LINEAR_POINTER_DRAG_Y = -40");
    expect(pointerDragSource).toContain("function animateLinearPointerLift");
    expect(pointerDragSource).toContain("function animateLinearPointerDrop");
    expect(pointerDragSource).toMatch(/function beginLinearPointerDrag\(\{ elementId, index, worldPoint \}\) \{[\s\S]*?animateLinearPointerLift\(elementId\);[\s\S]*?updateLinearPointerDrag\(worldPoint\);/);
    expect(pointerDragSource).toMatch(/function commitLinearPointerDrag\(\) \{[\s\S]*?const finishLinearPointerDrop = \(\) => \{[\s\S]*?renderBoard\(\);[\s\S]*?selectIds\(\[dragState\.elementId\]\);[\s\S]*?\};[\s\S]*?animateLinearPointerDrop\(dragState, finishLinearPointerDrop\);/);
  });

  it("hides transformer bounds while the linear pointer is being dragged", () => {
    const transformerSource = readFileSync(new URL("../../../src/app/selection/transformer-controller.js", import.meta.url), "utf8");

    expect(transformerSource).toContain("if (structureInteraction.hasLinearItemDragState() || structureInteraction.hasLinearPointerDragState()) {");
    expect(transformerSource).toMatch(/if \(structureInteraction\.hasLinearItemDragState\(\) \|\| structureInteraction\.hasLinearPointerDragState\(\)\) \{[\s\S]*?transformer\.nodes\(\[\]\);[\s\S]*?transformer\.visible\(false\);/);
  });

  it("suppresses custom tool cursors while spacebar panning is active", () => {
    const appSource = readFileSync(new URL("../../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const stagePointerSource = readStagePointerSource();
    const keyboardSource = readFileSync(new URL("../../../src/app/shell/keyboard-controller.js", import.meta.url), "utf8");
    const toolCursorSource = readFileSync(new URL("../../../src/app/tools/cursor-controller.js", import.meta.url), "utf8");

    expect(appSource).toContain("setIsSpaceDown: (nextValue) => { isSpaceDown = nextValue; }");
    expect(keyboardSource).toMatch(/if \(event\.code === "Space"\) \{[\s\S]*?setIsSpaceDown\(true\);[\s\S]*?classList\.add\("is-pan-ready"\);[\s\S]*?updateDraggableState\(\);[\s\S]*?hideToolCursors\(\);/);
    expect(stagePointerSource).toMatch(/if \(getIsSpaceDown\(\) \|\| currentTool === TOOLS\.PAN \|\| event\.evt\.button === 1\) \{[\s\S]*?isPanning = true;[\s\S]*?classList\.add\("is-panning"\);/);
    expect(stagePointerSource).toMatch(/if \(isPanning\) \{[\s\S]*?isPanning = false;[\s\S]*?classList\.remove\("is-panning"\);/);
    expect(keyboardSource).toMatch(/if \(event\.code === "Space"\) \{[\s\S]*?setIsSpaceDown\(false\);[\s\S]*?classList\.remove\("is-pan-ready", "is-panning"\);[\s\S]*?updateDraggableState\(\);/);
    expect(appSource).toContain("function isTemporaryPanActive()");
    expect(stagePointerSource).toMatch(/function handlePointerMove\(event\) \{[\s\S]*?if \(isTemporaryPanActive\(\) && !isPanning\) \{[\s\S]*?hideToolCursors\(\);[\s\S]*?return true;[\s\S]*?\}/);
    expect(stagePointerSource).toMatch(/if \(isPanning && panStart\) \{[\s\S]*?hideToolCursors\(\);[\s\S]*?const pointer = stage\.getPointerPosition\(\);/);
    expect(appSource).toContain("isTemporaryPanActive,");
    expect(toolCursorSource).toMatch(/function updateBrushCursorStyle\(\) \{[\s\S]*?if \(isTemporaryPanActive\(\)\) return;/);
    expect(toolCursorSource).toMatch(/function updateEraserCursorStyle\(\) \{[\s\S]*?if \(isTemporaryPanActive\(\)\) return;/);
  });

  it("keeps temporary spacebar panning from selecting or dragging elements", () => {
    const appSource = readFileSync(new URL("../../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const appActionSource = readFileSync(new URL("../../../src/app/shell/action-controller.js", import.meta.url), "utf8");
    const interactionSource = readFileSync(new URL("../../../src/structures/interaction.js", import.meta.url), "utf8");
    const gestureSource = readFileSync(new URL("../../../src/app/structures/linear-gesture-controller.js", import.meta.url), "utf8");
    const orchestratorSource = readOrchestratorSource();

    expect(orchestratorSource).toMatch(/onSelect: \(event, node\) => \{[\s\S]*?if \(isTemporaryPanActive\(\) \|\| getCurrentTool\(\) !== TOOLS\.SELECT\) return;[\s\S]*?selectElementById\(id, event\.evt\.shiftKey\);/);
    expect(orchestratorSource).toMatch(/onEdit: \(event, node\) => \{[\s\S]*?if \(isTemporaryPanActive\(\) \|\| getCurrentTool\(\) !== TOOLS\.SELECT\) return;/);
    expect(appSource).toMatch(/function shouldElementBeDraggable\(element\) \{[\s\S]*?return currentTool === TOOLS\.SELECT[\s\S]*?&& !isTemporaryPanActive\(\)[\s\S]*?&& !element\.locked/);
    expect(appSource).toContain("createLinearStructureEventAdapter((event) => {");
    expect(interactionSource).toContain("currentTool !== SELECT_TOOL");
    expect(gestureSource).toContain("currentTool: getCurrentTool()");
    expect(gestureSource).toContain("isTemporaryPanActive: isTemporaryPanActive()");
    expect(gestureSource).toMatch(/function handleArrayPointerPress\(\{ elementId, index \}\) \{[\s\S]*?if \(isTemporaryPanActive\(\) \|\| getCurrentTool\(\) !== selectTool\) return;/);
  });

  it("uses lightweight chrome updates while panning and zooming the viewport", () => {
    const appSource = readFileSync(new URL("../../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const stagePointerSource = readStagePointerSource();
    const viewportSource = readFileSync(new URL("../../../src/app/viewport/controller.js", import.meta.url), "utf8");
    const panMoveBlock = stagePointerSource.match(/if \(isPanning && panStart\) \{[\s\S]*?return true;\n    \}/)?.[0] ?? "";
    const wheelBlock = viewportSource.match(/function handleWheel\(event\) \{[\s\S]*?schedulePersistCurrentDraft\(\);\n  \}/)?.[0] ?? "";
    const centerZoomBlock = viewportSource.match(/function setZoomAtCenter\(requestedScale\) \{[\s\S]*?schedulePersistCurrentDraft\(\);\n  \}/)?.[0] ?? "";

    expect(appSource).toContain("function updateViewportChrome()");
    expect(appSource).toContain("viewportController.updateViewportChrome();");
    expect(panMoveBlock).toContain("updateGrid();");
    expect(panMoveBlock).not.toContain("updateChrome();");
    expect(wheelBlock).toContain("updateViewportChrome();");
    expect(wheelBlock).not.toContain("updateChrome();");
    expect(centerZoomBlock).toContain("updateViewportChrome();");
    expect(centerZoomBlock).not.toContain("updateChrome();");
  });

  it("uses shared graph and tree connect state for structure node editing", () => {
    const appSource = readFileSync(new URL("../../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const appActionSource = readFileSync(new URL("../../../src/app/shell/action-controller.js", import.meta.url), "utf8");
    const editActionSource = readFileSync(new URL("../../../src/app/structures/edit-action-controller.js", import.meta.url), "utf8");
    const nodeActionSource = readFileSync(new URL("../../../src/app/structures/node-action-controller.js", import.meta.url), "utf8");
    const interactionSource = readFileSync(new URL("../../../src/structures/interaction.js", import.meta.url), "utf8");
    const shapeRenderAdapterSource = readFileSync(new URL("../../../src/app/rendering/adapter.js", import.meta.url), "utf8");
    const controlsSource = readFileSync(new URL("../../../src/app/structures/controls-controller.js", import.meta.url), "utf8");
    const controlsPositionSource = readFileSync(new URL("../../../src/app/structures/controls-position-controller.js", import.meta.url), "utf8");
    const structureNodeQuerySource = readFileSync(new URL("../../../src/app/structures/node-query.js", import.meta.url), "utf8");
    const structureBoardActionSource = readStructureBoardActionSource();
    const structureInspectorSyncSource = readFileSync(new URL("../../../src/app/structures/inspector-sync-controller.js", import.meta.url), "utf8");

    expect(interactionSource).toContain("let structureConnectState = null;");
    expect(appSource).not.toContain("let structureConnectState = null;");
    expect(editActionSource).toContain("structureInteraction.beginStructureConnect({ kind: \"tree\", elementId: treeId })");
    expect(editActionSource).toContain("structureInteraction.getStructureConnectState({ kind: \"tree\", elementId })");
    expect(editActionSource).toContain("structureInteraction.setStructureConnectSource({ kind: \"tree\", elementId, sourceNodeId: nodeId })");
    expect(editActionSource).toContain("structureInteraction.finishStructureConnect({");
    expect(editActionSource).toContain("structureInteraction.clearStructureConnectState()");
    expect(appActionSource).toContain('"tree-connect-mode": beginTreeConnectMode');
    expect(editActionSource).toContain("function beginTreeConnectMode()");
    expect(editActionSource).toContain("function handleTreeNodeClick({ elementId, nodeId })");
    expect(nodeActionSource).toContain("function runBinaryTreeNodeAction(action)");
    expect(nodeActionSource).toContain("addBinaryTreeChild(element, nodeId, side, \"0\")");
    expect(appSource).not.toContain("activeTreeNode = { elementId, nodeId: nextNode?.id ?? nodeId };");
    expect(nodeActionSource).toContain("function runBinaryTreeTraversalAction(action)");
    expect(controlsSource).toContain("function renderTreeTraversalControls()");
    expect(nodeActionSource).toContain("function runTreeTraversalAction(action)");
    expect(controlsSource).toContain("isSelectedTreeElementWithTraversal(item)");
    expect(structureNodeQuerySource).toContain("function findTreeNodeGroup(group, nodeId)");
    expect(controlsPositionSource).toContain("const treeNode = findTreeNodeGroup(contentLayer.findOne(`#${element.id}`), activeTreeNode.nodeId);");
    expect(shapeRenderAdapterSource).toContain("structureInteraction.projectRuntime(element)");
    expect(interactionSource).toContain("runtime.activeNodeId = activeTreeNode.nodeId");
    expect(shapeRenderAdapterSource).toContain("activeTreeNode?.elementId === element.id");
    expect(nodeActionSource).toContain("isTreeElementWithTraversal(element) ? stepTreeTraversalHighlight(element, direction) : element");
    expect(structureNodeQuerySource).toContain("function isInteractiveStructureElement(element");
    expect(editActionSource).toContain("function connectTreeStructureNodes({ elementId, sourceNodeId, targetNodeId })");
    expect(editActionSource).toContain("function moveTreeStructureNode({ elementId, nodeId, x, y })");
    expect(structureBoardActionSource).toContain("function handleTreeStructureNodePress(event, group)");
    expect(appSource).not.toContain("group.startDrag");
    const orchestratorSource = readOrchestratorSource();
    expect(orchestratorSource).toContain("onTreeNodeMove: moveTreeStructureNode");
    expect(orchestratorSource).toContain("onTreeNodeConnect: connectTreeStructureNodes");
    expect(orchestratorSource).toContain("getTreeConnectState:");
    expect(appActionSource).toContain('"tree-layout": () => editSelectedStructure("tree-structure", layoutTreeStructure');
    expect(appActionSource).toContain('"tree-highlight-inorder"');
    expect(appSource).toContain("createStructureInspectorSyncController");
    expect(structureInspectorSyncSource).toContain("function syncTreeStructurePanelState()");
    expect(appSource).not.toContain("let graphConnectState = null;");
    expect(appSource).not.toContain("let activeTreeParent = null;");
  });

  it("uses custom SVG cursors for select and pan tools", () => {
    const styles = readFileSync(new URL("../../../src/styles.css", import.meta.url), "utf8");

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

  it("keeps the blue selection border visible during and after array cell editing", () => {
    const editorSource = readFileSync(new URL("../../../src/app/structures/cell-editor-controller.js", import.meta.url), "utf8");

    const editSource = editorSource.slice(
      editorSource.indexOf("function editArrayStructureItem"),
      editorSource.indexOf("function editLinearStructureItemInline"),
    );

    expect(editSource).toContain("selectIds([elementId])");
    expect(editSource).toContain("renderBoard()");

    const closeSource = editorSource.slice(
      editorSource.indexOf("function editLinearStructureItemInline"),
      editorSource.indexOf("function syncActiveCellEditor"),
    );

    expect(closeSource).toContain("const close = (commit) => {");
    expect(closeSource).toContain('selectIds([elementId]);');
    expect(closeSource).toContain('setActiveLinearItem(elementId, index');
  });

  it("imports and uses clampTransformerAnchorDragBySize for anchor drag bounds", () => {
    const appSource = readFileSync(new URL("../../../src/app/whiteboard-app.js", import.meta.url), "utf8");
    const transformerSource = readFileSync(new URL("../../../src/app/selection/transformer-controller.js", import.meta.url), "utf8");
    const transformerNodeSource = readFileSync(new URL("../../../src/app/selection/transformer-node.js", import.meta.url), "utf8");

    expect(transformerSource).toContain("clampTransformerAnchorDragBySize");
    expect(appSource).toContain("createSelectionTransformerNode");
    expect(transformerNodeSource).toContain("anchorDragBoundFunc: (oldAbsPos, newAbsPos) => {");
    expect(transformerNodeSource).toContain("return getSelectionTransformerController().clampAnchorDrag(oldAbsPos, newAbsPos)");
    expect(transformerSource).toContain("function clampAnchorDrag(oldAbsPos, newAbsPos)");
    expect(transformerSource).toContain("return clampTransformerAnchorDragBySize({");
  });

  it("prevents CoordinateCore ColorPicker flash by only closing on visibleChange(false)", () => {
    const stylePanelSource = readFileSync(new URL("../../../src/app/components/StylePanel.jsx", import.meta.url), "utf8");

    // ColorPicker onVisibleChange must only close when v is false
    expect(stylePanelSource).toContain("onVisibleChange: (v) => { if (!v) onClose?.(); }");
    // activeColor state at CoordinateCore level for mutual exclusion
    expect(stylePanelSource).toContain("const [activeColor, setActiveColor] = useState(null)");
    // LabeledColor uses separate onToggle (click) and onClose (visibleChange)
    expect(stylePanelSource).toContain("function LabeledColor({ label, value, set, open, onToggle, onClose })");
    // onClose only clears its own key, avoiding cross-key clash
    expect(stylePanelSource).toContain("onClose={() => setActiveColor(v => v === 'grid' ? null : v)}");
  });

  it("replaces InputNumber with Input in LinearStructureInspector and uses grid layout with outline button theme", () => {
    const stylePanelSource = readFileSync(new URL("../../../src/app/components/StylePanel.jsx", import.meta.url), "utf8");

    // Input replaces InputNumber for highlight/pointer fields (no stepper)
    expect(stylePanelSource).toContain("Input,");
    expect(stylePanelSource).not.toContain("InputNumber");
    // Grid layout for shortcut action buttons (3 columns, matching legacy 3-col layout)
    expect(stylePanelSource).toContain("'repeat(3, 1fr)'");
    // Grid layout for tree structure buttons (2 columns)
    expect(stylePanelSource).toContain("'repeat(2, 1fr)'");
    // Unified outline button theme for all structure action button groups
    const outlineMatches = (stylePanelSource.match(/theme="outline" type="tertiary"/g) || []).length;
    expect(outlineMatches).toBeGreaterThanOrEqual(2);
  });

  it("uses custom card grid and segmented control in StructurePanel popup", () => {
    const structurePanelSource = readFileSync(new URL("../../../src/app/components/StructurePanel.jsx", import.meta.url), "utf8");

    // Uses Semi Design Card and Typography components for polished UI
    expect(structurePanelSource).toContain("Card, Typography");
    // No legacy Tabs component (replaced by custom card grid + segmented control)
    expect(structurePanelSource).not.toContain("Tabs,");
    // Input replaces InputNumber (no stepper)
    expect(structurePanelSource).not.toContain("InputNumber");
    // Card with shadow, no border, and proper structure
    expect(structurePanelSource).toContain("bordered={false}");
    expect(structurePanelSource).toContain('shadows="always"');
    expect(structurePanelSource).toContain("footer=");
    // Modern button styles in footer
    expect(structurePanelSource).toContain('theme="borderless"');
    expect(structurePanelSource).toContain('theme="solid" type="primary"');
    // Custom card grid for structure types
    expect(structurePanelSource).toContain('className="structure-type-grid"');
    expect(structurePanelSource).toContain('className={`structure-type-card${');
    // Custom segmented control for init mode
    expect(structurePanelSource).toContain('className="segmented-control"');
    expect(structurePanelSource).toContain('className="segmented-slider"');
    expect(structurePanelSource).toContain('translateX(${initMode');
    // Fade-in animation class
    expect(structurePanelSource).toContain('className="structure-panel-react"');
  });

  it("renders structure inspectors with cardGroupStyle container grouping and primary/tertiary button style theme", () => {
    const stylePanelSource = readFileSync(new URL("../../../src/app/components/StylePanel.jsx", import.meta.url), "utf8");

    // Container style for semantic card grouping
    expect(stylePanelSource).toContain("cardGroupStyle");
    // Class name or text matching semantic groups
    expect(stylePanelSource).toContain("图结构数据");
    expect(stylePanelSource).toContain("图设置");
    // Enhanced theme colors for main buttons (light primary or solid primary)
    expect(stylePanelSource).toContain('theme="light" type="primary"');
  });

});
