import Konva from "konva";
import {
  ALGORITHM_STEP_TYPES,
} from "../../algorithms/array-algorithms.js";
import {
  DEFAULT_ARRAY_ALGORITHM_PANEL_STATE,
  applyArrayAlgorithmValues,
  clearArrayAlgorithmRuntimeMarkers,
  createArrayAlgorithmSteps,
  getArrayAlgorithmLabel,
} from "./array-algorithm-model.js";
import {
  ARRAY_STRUCTURE_STYLE,
  setArrayAlgorithmMarkers,
} from "../../structures/linear-structure.js";

export const ARRAY_ALGORITHM_BASE_STEP_MS = 460;

export function createArrayAlgorithmSessionController({
  contentLayer,
  getElements,
  setElements,
  getSelectedIds,
  getSelectedLinearStructure,
  structureInteraction,
  findLinearItemNode,
  hideLinearItemControls,
  syncLinearItemActiveVisual,
  renderBoard,
  selectIds,
  setStatus,
  pushHistory,
  updateChrome,
  konva = Konva,
  windowRef = window,
}) {
  let arrayAlgorithmPlayTimer = null;
  let arrayAlgorithmSwapTweens = [];
  let arrayAlgorithmAnimationNodes = [];
  let getArrayAlgorithmSpeed = () => DEFAULT_ARRAY_ALGORITHM_PANEL_STATE.speed;
  let syncArrayAlgorithmPanelState = () => {};

  function setPanelBindings(bindings = {}) {
    if (bindings.getArrayAlgorithmSpeed) getArrayAlgorithmSpeed = bindings.getArrayAlgorithmSpeed;
    if (bindings.syncArrayAlgorithmPanelState) syncArrayAlgorithmPanelState = bindings.syncArrayAlgorithmPanelState;
  }

  function getArrayAlgorithmPanelState(elementId) {
    return structureInteraction.getArrayAlgorithmPanelState(elementId, DEFAULT_ARRAY_ALGORITHM_PANEL_STATE);
  }

  function setArrayAlgorithmPanelState(elementId, patch) {
    structureInteraction.setArrayAlgorithmPanelState(elementId, patch, DEFAULT_ARRAY_ALGORITHM_PANEL_STATE);
  }

  function getSelectedArrayAlgorithmSession() {
    const element = getSelectedLinearStructure();
    return element ? structureInteraction.getArrayAlgorithmSession(element.id) : null;
  }

  function getArrayAlgorithmSession(elementId) {
    return structureInteraction.getArrayAlgorithmSession(elementId);
  }

  function setArrayAlgorithmSession(session) {
    structureInteraction.setArrayAlgorithmSession(session);
  }

  function deleteArrayAlgorithmSession(elementId) {
    structureInteraction.deleteArrayAlgorithmSession(elementId);
  }

  function deleteArrayAlgorithmState(elementId) {
    structureInteraction.deleteArrayAlgorithmState(elementId);
  }

  function clearArrayAlgorithmSessions() {
    structureInteraction.clearArrayAlgorithmSessions();
  }

  function pauseUnselectedArrayAlgorithmSessions() {
    structureInteraction.pauseUnselectedArrayAlgorithmSessions(getSelectedIds());
    cancelArrayAlgorithmTimer();
  }

  function startSelectedArrayAlgorithm() {
    const element = getSelectedLinearStructure();
    if (!element || element.type !== "array-structure" || element.locked) return;
    cancelArrayAlgorithmPlayback();
    cancelArrayAlgorithmSwapAnimation({ commitStableState: false });
    clearActiveLinearItemForAlgorithmStart(element.id);
    const values = (element.items ?? []).map((item) => item.value ?? "");
    const panelState = getArrayAlgorithmPanelState(element.id);
    const result = createArrayAlgorithmSteps(panelState.algorithm, values);
    if (!result.ok) {
      setArrayAlgorithmSession({
        elementId: element.id,
        error: result.message,
        speed: panelState.speed,
        isPlaying: false,
        isAnimating: false,
      });
      syncArrayAlgorithmPanelState();
      setStatus(result.message);
      return;
    }

    setArrayAlgorithmSession({
      elementId: element.id,
      algorithm: result.algorithm,
      algorithmLabel: getArrayAlgorithmLabel(result.algorithm),
      initialValues: result.initialValues,
      steps: result.steps,
      stepIndex: 0,
      speed: panelState.speed,
      isPlaying: false,
      isAnimating: false,
      committed: false,
      error: "",
      stableStepIndex: 0,
    });
    applyArrayAlgorithmStep(0, { render: true });
    selectIds([element.id]);
    syncArrayAlgorithmPanelState();
  }

  function clearActiveLinearItemForAlgorithmStart(elementId) {
    const activeLinearItem = structureInteraction.getActiveLinearItem();
    if (activeLinearItem?.elementId !== elementId) return;
    const { previousActiveLinearItem } = structureInteraction.clearActiveLinearItem();
    hideLinearItemControls();
    syncLinearItemActiveVisual(previousActiveLinearItem?.elementId);
  }

  function stepArrayAlgorithmPrevious() {
    const session = getSelectedArrayAlgorithmSession();
    if (!session || session.error || session.isAnimating) return;
    cancelArrayAlgorithmPlayback();
    runArrayAlgorithmReverseStep(session.stepIndex);
  }

  function stepArrayAlgorithmNext() {
    const session = getSelectedArrayAlgorithmSession();
    if (!session || session.error || session.isAnimating) return;
    const nextIndex = Math.min(getArrayAlgorithmLastStepIndex(session), session.stepIndex + 1);
    runArrayAlgorithmStep(nextIndex);
  }

  function toggleArrayAlgorithmPlayback() {
    const session = getSelectedArrayAlgorithmSession();
    if (!session || session.error || session.isAnimating) return;
    if (session.isPlaying) {
      cancelArrayAlgorithmPlayback();
      syncArrayAlgorithmPanelState();
      return;
    }
    if (session.stepIndex >= getArrayAlgorithmLastStepIndex(session)) return;
    setArrayAlgorithmSession({ ...session, isPlaying: true });
    syncArrayAlgorithmPanelState();
    scheduleArrayAlgorithmPlayback();
  }

  function resetArrayAlgorithmSession() {
    const session = getSelectedArrayAlgorithmSession();
    if (!session) return;
    const elementId = session.elementId;
    cancelArrayAlgorithmPlayback();
    cancelArrayAlgorithmSwapAnimation({ commitStableState: false });
    if (session.error || !session.steps) {
      deleteArrayAlgorithmSession(elementId);
      syncArrayAlgorithmPanelState();
      return;
    }
    const initialValues = session.initialValues ?? [];
    setElements(getElements().map((element) => (
      element.id === elementId
        ? applyArrayAlgorithmValues(clearArrayAlgorithmRuntimeMarkers(element), initialValues)
        : element
    )));
    setArrayAlgorithmSession({
      ...session,
      stepIndex: 0,
      stableStepIndex: 0,
      isPlaying: false,
      isAnimating: false,
      committed: false,
      error: "",
    });
    applyArrayAlgorithmStep(0, { render: false });
    renderBoard();
    selectIds([elementId]);
    syncArrayAlgorithmPanelState();
  }

  function stopArrayAlgorithmSession() {
    const session = getSelectedArrayAlgorithmSession();
    if (!session) return;
    const elementId = session.elementId;
    const algorithmLabel = session.algorithmLabel ?? "排序";
    const shouldCommit = Boolean(session.steps) && !session.committed;
    cancelArrayAlgorithmPlayback();
    cancelArrayAlgorithmSwapAnimation({ commitStableState: false });
    setElements(getElements().map((element) => (
      element.id === elementId ? clearArrayAlgorithmRuntimeMarkers(element) : element
    )));
    deleteArrayAlgorithmSession(elementId);
    renderBoard();
    selectIds(getElements().some((element) => element.id === elementId) ? [elementId] : []);
    if (shouldCommit) {
      pushHistory(`已执行${algorithmLabel}`);
    } else {
      updateChrome();
    }
  }

  function runArrayAlgorithmReverseStep(currentIndex) {
    const session = getSelectedArrayAlgorithmSession();
    if (!session?.steps) return;
    const previousIndex = Math.max(0, currentIndex - 1);
    const step = session.steps[currentIndex];
    if (!step || currentIndex <= 0) {
      applyArrayAlgorithmStep(previousIndex, { render: true });
      return;
    }
    if (step.type === ALGORITHM_STEP_TYPES.SWAP) {
      playArrayAlgorithmSwapStep(currentIndex, { reverse: true });
      return;
    }
    if (step.type === ALGORITHM_STEP_TYPES.SHIFT || (step.type === ALGORITHM_STEP_TYPES.INSERT && step.animation)) {
      playArrayAlgorithmMoveStep(currentIndex, { reverse: true });
      return;
    }
    if (step.type === ALGORITHM_STEP_TYPES.PICK_KEY) {
      playArrayAlgorithmPickKeyStep(currentIndex, { reverse: true });
      return;
    }
    applyArrayAlgorithmStep(previousIndex, { render: true });
  }

  function runArrayAlgorithmStep(nextIndex) {
    const session = getSelectedArrayAlgorithmSession();
    if (!session?.steps) return;
    const step = session.steps[nextIndex];
    if (!step) return;
    if (step.type === ALGORITHM_STEP_TYPES.PICK_KEY) {
      playArrayAlgorithmPickKeyStep(nextIndex);
      return;
    }
    if (step.type === ALGORITHM_STEP_TYPES.SWAP) {
      playArrayAlgorithmSwapStep(nextIndex);
      return;
    }
    if (step.type === ALGORITHM_STEP_TYPES.SHIFT || (step.type === ALGORITHM_STEP_TYPES.INSERT && step.animation)) {
      playArrayAlgorithmMoveStep(nextIndex);
      return;
    }
    applyArrayAlgorithmStep(nextIndex, { render: true });
    if (step.type === ALGORITHM_STEP_TYPES.COMPLETE) {
      const appliedSession = getArrayAlgorithmSession(session.elementId);
      if (!appliedSession) return;
      setArrayAlgorithmSession({
        ...appliedSession,
        isPlaying: false,
        committed: true,
      });
      pushHistory(`已执行${session.algorithmLabel ?? "排序"}`);
      syncArrayAlgorithmPanelState();
      return;
    }
    scheduleArrayAlgorithmPlayback();
  }

  function playArrayAlgorithmSwapStep(nextIndex, { reverse = false } = {}) {
    const session = getSelectedArrayAlgorithmSession();
    const step = session?.steps?.[nextIndex];
    const moves = step?.animation?.moves ?? step?.swapIndices?.map((index, moveIndex, indices) => ({
      from: index,
      to: indices[moveIndex === 0 ? 1 : 0],
    }));
    if (!session || !step || moves?.length !== 2) return;
    const previousStepIndex = session.stepIndex;
    const targetStepIndex = reverse ? Math.max(0, nextIndex - 1) : nextIndex;
    const element = getElements().find((item) => item.id === session.elementId);
    const group = contentLayer.findOne(`#${session.elementId}`);
    const firstItem = findLinearItemNode(group, reverse ? moves[0].to : moves[0].from);
    const secondItem = findLinearItemNode(group, reverse ? moves[1].to : moves[1].from);
    const firstValue = firstItem?.findOne?.(".array-item-value-group");
    const secondValue = secondItem?.findOne?.(".array-item-value-group");
    if (!element || !group || !firstValue || !secondValue) {
      applyArrayAlgorithmStep(targetStepIndex, { render: true });
      if (!reverse) scheduleArrayAlgorithmPlayback();
      return;
    }

    const style = { ...ARRAY_STRUCTURE_STYLE, ...(element.style ?? {}) };
    const duration = getArrayAlgorithmStepMs() / 1000;
    setArrayAlgorithmSession({
      ...session,
      isAnimating: true,
      stableStepIndex: previousStepIndex,
      pendingStepIndex: targetStepIndex,
    });
    syncArrayAlgorithmPanelState();

    const firstStartX = firstItem.x() + (firstValue.x() || 0);
    const secondStartX = secondItem.x() + (secondValue.x() || 0);
    const firstTargetX = (reverse ? moves[0].from : moves[0].to) * style.cellWidth;
    const secondTargetX = (reverse ? moves[1].from : moves[1].to) * style.cellWidth;

    const firstGhost = firstValue.clone({
      name: "array-swap-ghost",
      x: firstStartX,
      listening: false,
      opacity: 0.95,
    });
    const secondGhost = secondValue.clone({
      name: "array-swap-ghost",
      x: secondStartX,
      listening: false,
      opacity: 0.95,
    });
    group.add(firstGhost);
    group.add(secondGhost);
    arrayAlgorithmAnimationNodes.push(firstGhost, secondGhost);
    firstValue.visible(false);
    secondValue.visible(false);

    firstGhost.moveToTop();
    secondGhost.moveToTop();
    const firstTween = new konva.Tween({
      node: firstGhost,
      x: firstTargetX,
      duration,
      easing: konva.Easings.EaseInOut,
    });
    const secondTween = new konva.Tween({
      node: secondGhost,
      x: secondTargetX,
      duration,
      easing: konva.Easings.EaseInOut,
      onFinish: () => {
        firstTween.destroy();
        secondTween.destroy();
        firstGhost.destroy();
        secondGhost.destroy();
        arrayAlgorithmAnimationNodes = arrayAlgorithmAnimationNodes.filter((n) => n !== firstGhost && n !== secondGhost);
        arrayAlgorithmSwapTweens = [];
        const nextSession = getArrayAlgorithmSession(session.elementId);
        if (!nextSession) return;
        applyArrayAlgorithmStep(targetStepIndex, { render: true });
        const appliedSession = getArrayAlgorithmSession(session.elementId);
        if (!appliedSession) return;
        setArrayAlgorithmSession({
          ...appliedSession,
          isAnimating: false,
          pendingStepIndex: null,
          stableStepIndex: targetStepIndex,
        });
        syncArrayAlgorithmPanelState();
        if (!reverse) scheduleArrayAlgorithmPlayback();
      },
    });
    arrayAlgorithmSwapTweens = [firstTween, secondTween];
    firstTween.play();
    secondTween.play();
  }

  function playArrayAlgorithmPickKeyStep(nextIndex, { reverse = false } = {}) {
    const session = getSelectedArrayAlgorithmSession();
    const step = session?.steps?.[nextIndex];
    const floatingKey = step?.markers?.floatingKey;
    if (!session || !step || !floatingKey) return;
    const previousStepIndex = session.stepIndex;
    const targetStepIndex = reverse ? Math.max(0, nextIndex - 1) : nextIndex;
    const element = getElements().find((item) => item.id === session.elementId);
    const group = contentLayer.findOne(`#${session.elementId}`);
    const itemNode = findLinearItemNode(group, floatingKey.sourceIndex);
    if (!element || !group || !itemNode) {
      applyArrayAlgorithmStep(targetStepIndex, { render: true });
      if (!reverse) scheduleArrayAlgorithmPlayback();
      return;
    }

    const style = { ...ARRAY_STRUCTURE_STYLE, ...(element.style ?? {}) };
    const floatingKeyNode = findArrayAlgorithmFloatingKeyNode(group);
    const valueNode = reverse
      ? floatingKeyNode ?? createArrayAlgorithmValueGhostNode(itemNode, floatingKey.value, style)
      : createArrayAlgorithmValueGhostNode(itemNode, floatingKey.value, style);
    if (!valueNode) {
      applyArrayAlgorithmStep(targetStepIndex, { render: true });
      if (!reverse) scheduleArrayAlgorithmPlayback();
      return;
    }
    const ghost = valueNode;
    const startY = ghost.y();
    const liftedY = reverse ? getArrayAlgorithmValueY(element) : getArrayAlgorithmFloatingKeyY(style, element);
    setArrayAlgorithmSession({
      ...session,
      isAnimating: true,
      stableStepIndex: previousStepIndex,
      pendingStepIndex: targetStepIndex,
    });
    syncArrayAlgorithmPanelState();
    ghost.moveToTop();
    const tween = new konva.Tween({
      node: ghost,
      y: liftedY,
      duration: getArrayAlgorithmStepMs() / 1000,
      easing: konva.Easings.EaseOut,
      onFinish: () => {
        tween.destroy();
        ghost.destroy();
        arrayAlgorithmAnimationNodes = arrayAlgorithmAnimationNodes.filter((node) => node !== ghost);
        arrayAlgorithmSwapTweens = [];
        if (!getArrayAlgorithmSession(session.elementId)) return;
        applyArrayAlgorithmStep(targetStepIndex, { render: true });
        const appliedSession = getArrayAlgorithmSession(session.elementId);
        if (!appliedSession) return;
        setArrayAlgorithmSession({
          ...appliedSession,
          isAnimating: false,
          pendingStepIndex: null,
          stableStepIndex: targetStepIndex,
        });
        syncArrayAlgorithmPanelState();
        if (!reverse) scheduleArrayAlgorithmPlayback();
      },
    });
    arrayAlgorithmSwapTweens = [tween];
    tween.play();
    ghost.y(startY);
  }

  function playArrayAlgorithmMoveStep(nextIndex, { reverse = false } = {}) {
    const session = getSelectedArrayAlgorithmSession();
    const step = session?.steps?.[nextIndex];
    const move = step?.animation?.moves?.[0] ?? step?.shift ?? step?.insert;
    if (!session || !step || !move) return;
    const previousStepIndex = session.stepIndex;
    const targetStepIndex = reverse ? Math.max(0, nextIndex - 1) : nextIndex;
    const element = getElements().find((item) => item.id === session.elementId);
    const group = contentLayer.findOne(`#${session.elementId}`);
    const itemNode = findLinearItemNode(group, reverse ? move.to : move.from);
    if (!element || !group || !itemNode) {
      applyArrayAlgorithmStep(targetStepIndex, { render: true });
      if (!reverse) scheduleArrayAlgorithmPlayback();
      return;
    }

    const style = { ...ARRAY_STRUCTURE_STYLE, ...(element.style ?? {}) };
    const duration = getArrayAlgorithmStepMs() / 1000;
    if (step.type === ALGORITHM_STEP_TYPES.INSERT) {
      playArrayAlgorithmInsertStep({
        session,
        step,
        nextIndex,
        previousStepIndex,
        reverse,
        targetStepIndex,
        element,
        itemNode,
        move,
        style,
        duration,
      });
      return;
    }
    const valueGroup = itemNode.findOne?.(".array-item-value-group");
    if (!valueGroup) {
      applyArrayAlgorithmStep(targetStepIndex, { render: true });
      if (!reverse) scheduleArrayAlgorithmPlayback();
      return;
    }
    const startX = itemNode.x() + (valueGroup.x() || 0);
    const targetX = (reverse ? move.from : move.to) * style.cellWidth;
    setArrayAlgorithmSession({
      ...session,
      isAnimating: true,
      stableStepIndex: previousStepIndex,
      pendingStepIndex: targetStepIndex,
    });
    syncArrayAlgorithmPanelState();

    const ghost = valueGroup.clone({
      name: "array-shift-ghost",
      x: startX,
      listening: false,
      opacity: 0.95,
    });
    group.add(ghost);
    arrayAlgorithmAnimationNodes.push(ghost);
    valueGroup.visible(false);

    ghost.moveToTop();
    const tween = new konva.Tween({
      node: ghost,
      x: targetX,
      duration,
      easing: konva.Easings.EaseInOut,
      onFinish: () => {
        tween.destroy();
        ghost.destroy();
        arrayAlgorithmAnimationNodes = arrayAlgorithmAnimationNodes.filter((node) => node !== ghost);
        arrayAlgorithmSwapTweens = [];
        const nextSession = getArrayAlgorithmSession(session.elementId);
        if (!nextSession) return;
        applyArrayAlgorithmStep(targetStepIndex, { render: true });
        const appliedSession = getArrayAlgorithmSession(session.elementId);
        if (!appliedSession) return;
        setArrayAlgorithmSession({
          ...appliedSession,
          isAnimating: false,
          pendingStepIndex: null,
          stableStepIndex: targetStepIndex,
        });
        syncArrayAlgorithmPanelState();
        if (!reverse) scheduleArrayAlgorithmPlayback();
      },
    });
    arrayAlgorithmSwapTweens = [tween];
    tween.play();
  }

  function playArrayAlgorithmInsertStep({ session, step, nextIndex, previousStepIndex, reverse = false, targetStepIndex = nextIndex, element, itemNode, move, style, duration }) {
    const group = contentLayer.findOne(`#${session.elementId}`);
    const floatingKeyNode = findArrayAlgorithmFloatingKeyNode(group);
    const ghost = floatingKeyNode ?? createArrayAlgorithmValueGhostNode(itemNode, step.keyValue, style);
    if (!ghost) {
      applyArrayAlgorithmStep(targetStepIndex, { render: true });
      if (!reverse) scheduleArrayAlgorithmPlayback();
      return;
    }
    const startX = ghost.x();
    const startY = ghost.y();
    const liftedY = getArrayAlgorithmFloatingKeyY(style, element);
    const targetX = (reverse ? move.from : move.to) * style.cellWidth;
    const targetY = reverse ? liftedY : getArrayAlgorithmValueY(element);
    setArrayAlgorithmSession({
      ...session,
      isAnimating: true,
      stableStepIndex: previousStepIndex,
      pendingStepIndex: targetStepIndex,
    });
    syncArrayAlgorithmPanelState();
    ghost.moveToTop();
    const insertDuration = duration * 1.45;
    const liftDuration = Math.max(0.08, insertDuration * 0.24);
    const shouldMoveHorizontally = Math.abs(targetX - startX) > 0.5;
    const moveDuration = shouldMoveHorizontally ? Math.max(0.12, insertDuration * 0.52) : 0;
    const dropDuration = Math.max(0.08, insertDuration * 0.24);
    const finishDrop = () => {
      const dropTween = new konva.Tween({
        node: ghost,
        y: targetY,
        duration: dropDuration,
        easing: konva.Easings.EaseIn,
        onFinish: () => {
          dropTween.destroy();
          if (ghost !== floatingKeyNode) {
            ghost.destroy();
            arrayAlgorithmAnimationNodes = arrayAlgorithmAnimationNodes.filter((node) => node !== ghost);
          }
          arrayAlgorithmSwapTweens = [];
          if (!getArrayAlgorithmSession(session.elementId)) return;
          applyArrayAlgorithmStep(targetStepIndex, { render: true });
          const appliedSession = getArrayAlgorithmSession(session.elementId);
          if (appliedSession) {
            setArrayAlgorithmSession({
              ...appliedSession,
              isAnimating: false,
              pendingStepIndex: null,
              stableStepIndex: targetStepIndex,
            });
          }
          syncArrayAlgorithmPanelState();
          if (!reverse) scheduleArrayAlgorithmPlayback();
        },
      });
      arrayAlgorithmSwapTweens = [dropTween];
      dropTween.play();
    };
    const liftTween = new konva.Tween({
      node: ghost,
      y: liftedY,
      duration: liftDuration,
      easing: konva.Easings.EaseOut,
      onFinish: () => {
        liftTween.destroy();
        if (!shouldMoveHorizontally) {
          finishDrop();
          return;
        }
        const moveTween = new konva.Tween({
          node: ghost,
          x: targetX,
          duration: moveDuration,
          easing: konva.Easings.EaseInOut,
          onFinish: () => {
            moveTween.destroy();
            finishDrop();
          },
        });
        arrayAlgorithmSwapTweens = [moveTween];
        moveTween.play();
      },
    });
    arrayAlgorithmSwapTweens = [liftTween];
    liftTween.play();
    ghost.x(startX);
    ghost.y(startY);
  }

  function createArrayAlgorithmGhostNode(sourceNode, value) {
    const ghost = sourceNode.clone({
      listening: false,
      opacity: 0.92,
      y: sourceNode.y(),
      shadowColor: "rgba(245,158,11,0.28)",
      shadowBlur: 18,
      shadowOpacity: 1,
      shadowOffsetY: -8,
    });
    const valueText = ghost.find("Text").at(-1);
    valueText?.text(String(value ?? ""));
    ghost.moveTo(sourceNode.getParent());
    arrayAlgorithmAnimationNodes.push(ghost);
    return ghost;
  }

  function createArrayAlgorithmValueGhostNode(sourceNode, value, style = ARRAY_STRUCTURE_STYLE) {
    if (!sourceNode) return null;
    const cellWidth = Number(style.cellWidth) || ARRAY_STRUCTURE_STYLE.cellWidth;
    const cellHeight = Number(style.cellHeight) || ARRAY_STRUCTURE_STYLE.cellHeight;
    const valueY = getArrayAlgorithmValueYFromNode(sourceNode, style);
    const ghost = new konva.Group({
      name: "array-floating-key",
      linearIndex: sourceNode.getAttr?.("linearIndex"),
      x: sourceNode.x(),
      y: valueY,
      width: cellWidth,
      height: cellHeight,
      listening: false,
      opacity: 0.92,
      shadowColor: "rgba(245,158,11,0.28)",
      shadowBlur: 18,
      shadowOpacity: 1,
      shadowOffsetY: 8,
    });
    ghost.add(new konva.Rect({
      width: cellWidth,
      height: cellHeight,
      stroke: style.algorithmKeyStroke,
      strokeWidth: 3,
      fill: style.valueFill,
    }));
    ghost.add(new konva.Text({
      y: 10,
      width: cellWidth,
      height: 24,
      text: String(value ?? ""),
      fontSize: 20,
      fontFamily: "Inter, system-ui, sans-serif",
      fill: style.textFill,
      align: "center",
      verticalAlign: "middle",
    }));
    ghost.moveTo(sourceNode.getParent());
    arrayAlgorithmAnimationNodes.push(ghost);
    return ghost;
  }

  function findArrayAlgorithmFloatingKeyNode(group) {
    return group?.findOne?.(".array-floating-key") ?? null;
  }

  function getArrayAlgorithmFloatingKeyY(style = ARRAY_STRUCTURE_STYLE, element = null) {
    return getArrayAlgorithmValueY(element) + (Number(style.cellHeight) || ARRAY_STRUCTURE_STYLE.cellHeight) + 12;
  }

  function getArrayAlgorithmValueY(element = null) {
    const style = { ...ARRAY_STRUCTURE_STYLE, ...(element?.style ?? {}) };
    const showIndexes = element?.settings?.showIndexes ?? element?.type === "array-structure";
    return showIndexes ? Number(style.cellHeight) || ARRAY_STRUCTURE_STYLE.cellHeight : 0;
  }

  function getArrayAlgorithmValueYFromNode(sourceNode, style = ARRAY_STRUCTURE_STYLE) {
    const valueRect = sourceNode?.findOne?.(".array-item-value-hit");
    if (Number.isFinite(valueRect?.y?.())) return valueRect.y();
    return Number(style.cellHeight) || ARRAY_STRUCTURE_STYLE.cellHeight;
  }

  function applyArrayAlgorithmStep(stepIndex, { render = true } = {}) {
    const session = getSelectedArrayAlgorithmSession();
    const step = session?.steps?.[stepIndex];
    if (!session || !step) return;
    const pointer = step.activeIndices?.[0] ?? null;
    setElements(getElements().map((element) => (
      element.id === session.elementId
        ? setArrayAlgorithmMarkers(
          applyArrayAlgorithmValues(element, step.values),
          {
            activeIndices: step.markers?.activeIndices ?? step.activeIndices,
            sortedIndices: step.markers?.sortedIndices ?? step.sortedIndices,
            pendingSwapIndices: step.markers?.pendingSwapIndices,
            minIndex: step.markers?.minIndex,
            keyIndex: step.markers?.keyIndex,
            emptyIndex: step.markers?.emptyIndex,
            floatingKey: step.markers?.floatingKey,
            pointer,
            showPointer: Number.isInteger(pointer),
          },
        )
        : element
    )));
    setArrayAlgorithmSession({
      ...session,
      stepIndex,
      stableStepIndex: stepIndex,
      isAnimating: false,
      pendingStepIndex: null,
    });
    if (render) {
      renderBoard();
      selectIds([session.elementId]);
      syncArrayAlgorithmPanelState();
    }
  }

  function scheduleArrayAlgorithmPlayback() {
    cancelArrayAlgorithmTimer();
    const session = getSelectedArrayAlgorithmSession();
    if (!session?.isPlaying || session.isAnimating) return;
    if (session.stepIndex >= getArrayAlgorithmLastStepIndex(session)) {
      setArrayAlgorithmSession({ ...session, isPlaying: false });
      syncArrayAlgorithmPanelState();
      return;
    }
    arrayAlgorithmPlayTimer = windowRef.setTimeout(() => {
      arrayAlgorithmPlayTimer = null;
      stepArrayAlgorithmNext();
    }, getArrayAlgorithmStepMs());
  }

  function cancelArrayAlgorithmPlayback() {
    cancelArrayAlgorithmTimer();
    const session = getSelectedArrayAlgorithmSession();
    if (session) setArrayAlgorithmSession({ ...session, isPlaying: false });
  }

  function cancelArrayAlgorithmTimer() {
    if (!arrayAlgorithmPlayTimer) return;
    windowRef.clearTimeout(arrayAlgorithmPlayTimer);
    arrayAlgorithmPlayTimer = null;
  }

  function cancelArrayAlgorithmSwapAnimation({ commitStableState = true } = {}) {
    arrayAlgorithmSwapTweens.forEach((tween) => tween.destroy());
    arrayAlgorithmSwapTweens = [];
    arrayAlgorithmAnimationNodes.forEach((node) => node.destroy());
    arrayAlgorithmAnimationNodes = [];
    const session = getSelectedArrayAlgorithmSession();
    if (!session?.isAnimating) return;
    const stableStepIndex = session.stableStepIndex ?? session.stepIndex ?? 0;
    setArrayAlgorithmSession({
      ...session,
      isAnimating: false,
      pendingStepIndex: null,
      stepIndex: stableStepIndex,
    });
    if (commitStableState) applyArrayAlgorithmStep(stableStepIndex, { render: true });
  }

  function getArrayAlgorithmStepMs() {
    const speed = getSelectedArrayAlgorithmSession()?.speed ?? getArrayAlgorithmSpeed();
    return Math.round(ARRAY_ALGORITHM_BASE_STEP_MS / Math.max(0.5, speed));
  }

  function getArrayAlgorithmLastStepIndex(session = getSelectedArrayAlgorithmSession()) {
    return Math.max(0, (session?.steps?.length ?? 1) - 1);
  }

  function isArrayAlgorithmLocked(elementId) {
    return structureInteraction.isArrayAlgorithmLocked(elementId);
  }

  function clearArrayAlgorithmSessionForRemovedIds(ids) {
    const removedSet = new Set(ids);
    const selectedSession = getSelectedArrayAlgorithmSession();
    if (selectedSession && removedSet.has(selectedSession.elementId)) {
      cancelArrayAlgorithmPlayback();
      cancelArrayAlgorithmSwapAnimation({ commitStableState: false });
    }
    ids.forEach((id) => deleteArrayAlgorithmState(id));
  }

  function destroy() {
    cancelArrayAlgorithmTimer();
    arrayAlgorithmSwapTweens.forEach((tween) => tween.destroy());
    arrayAlgorithmSwapTweens = [];
    arrayAlgorithmAnimationNodes.forEach((node) => node.destroy());
    arrayAlgorithmAnimationNodes = [];
  }

  return {
    setPanelBindings,
    getArrayAlgorithmPanelState,
    setArrayAlgorithmPanelState,
    getSelectedArrayAlgorithmSession,
    getArrayAlgorithmSession,
    setArrayAlgorithmSession,
    deleteArrayAlgorithmSession,
    deleteArrayAlgorithmState,
    clearArrayAlgorithmSessions,
    pauseUnselectedArrayAlgorithmSessions,
    startSelectedArrayAlgorithm,
    stepArrayAlgorithmPrevious,
    stepArrayAlgorithmNext,
    toggleArrayAlgorithmPlayback,
    resetArrayAlgorithmSession,
    stopArrayAlgorithmSession,
    cancelArrayAlgorithmPlayback,
    cancelArrayAlgorithmTimer,
    cancelArrayAlgorithmSwapAnimation,
    getArrayAlgorithmLastStepIndex,
    isArrayAlgorithmLocked,
    clearArrayAlgorithmSessionForRemovedIds,
    destroy,
  };
}
