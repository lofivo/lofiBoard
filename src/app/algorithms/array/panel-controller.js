export function createArrayAlgorithmPanelController({
  root,
  arrayAlgorithmSelect,
  arrayAlgorithmSpeed,
  arrayAlgorithmStatus,
  getSelectedLinearStructure,
  getSelectedArrayAlgorithmSession,
  getArrayAlgorithmPanelState,
  setArrayAlgorithmPanelState,
  setArrayAlgorithmSession,
  getArrayAlgorithmLastStepIndex,
  defaultPanelState,
}) {
  function bindArrayAlgorithmPanelEvents() {
    arrayAlgorithmSpeed?.addEventListener("input", () => {
      const session = getSelectedArrayAlgorithmSession();
      const selected = getSelectedLinearStructure();
      if (!selected) return;
      const speed = getArrayAlgorithmSpeed();
      setArrayAlgorithmPanelState(selected.id, { speed });
      if (session) {
        setArrayAlgorithmSession({
          ...session,
          speed,
        });
      }
      syncArrayAlgorithmPanelState();
    });
    arrayAlgorithmSelect?.addEventListener("change", () => {
      const selected = getSelectedLinearStructure();
      if (!selected) return;
      setArrayAlgorithmPanelState(selected.id, { algorithm: arrayAlgorithmSelect.value });
      syncArrayAlgorithmPanelState();
    });
  }

  function getArrayAlgorithmSpeed() {
    const value = Number(arrayAlgorithmSpeed?.value ?? 1);
    return Number.isFinite(value) ? Math.min(3, Math.max(0.5, value)) : 1;
  }

  function syncArrayAlgorithmPanelState() {
    if (!arrayAlgorithmStatus) return;
    const selected = getSelectedLinearStructure();
    const session = selected ? getSelectedArrayAlgorithmSession() : null;
    const panelState = selected ? getArrayAlgorithmPanelState(selected.id) : defaultPanelState;
    const isBoundSelection = Boolean(session && selected?.id === session.elementId);
    root.dataset.arrayAlgorithmActive = isBoundSelection ? "true" : "false";
    if (arrayAlgorithmSelect) {
      arrayAlgorithmSelect.value = session?.algorithm ?? panelState.algorithm;
      arrayAlgorithmSelect.disabled = Boolean(session);
    }
    if (arrayAlgorithmSpeed) {
      arrayAlgorithmSpeed.value = String(session?.speed ?? panelState.speed);
    }
    const buttons = {
      start: root.querySelector("[data-action='array-algorithm-start']"),
      prev: root.querySelector("[data-action='array-algorithm-prev']"),
      next: root.querySelector("[data-action='array-algorithm-next']"),
      play: root.querySelector("[data-action='array-algorithm-play']"),
      reset: root.querySelector("[data-action='array-algorithm-reset']"),
      stop: root.querySelector("[data-action='array-algorithm-stop']"),
    };
    if (!selected || selected.type !== "array-structure") {
      arrayAlgorithmStatus.textContent = "选择数组后开始演示";
      arrayAlgorithmStatus.dataset.state = "";
      Object.values(buttons).forEach((button) => {
        if (button) button.disabled = true;
      });
      return;
    }
    buttons.start.disabled = Boolean(session);
    buttons.prev.disabled = !isBoundSelection || Boolean(session?.error) || session?.isAnimating || (session?.stepIndex ?? 0) <= 0;
    buttons.next.disabled = !isBoundSelection || Boolean(session?.error) || session?.isAnimating || (session?.stepIndex ?? 0) >= getArrayAlgorithmLastStepIndex(session);
    buttons.play.disabled = !isBoundSelection || Boolean(session?.error) || session?.isAnimating || (session?.stepIndex ?? 0) >= getArrayAlgorithmLastStepIndex(session);
    buttons.reset.disabled = !isBoundSelection;
    buttons.stop.disabled = !isBoundSelection;
    if (buttons.play) buttons.play.textContent = session?.isPlaying ? "暂停" : "播放";
    if (!session) {
      arrayAlgorithmStatus.textContent = "选择排序算法后点击开始";
      arrayAlgorithmStatus.dataset.state = "";
      return;
    }
    if (!isBoundSelection) {
      arrayAlgorithmStatus.textContent = "算法已暂停，重新选中原数组继续";
      arrayAlgorithmStatus.dataset.state = "";
      return;
    }
    if (session.error) {
      arrayAlgorithmStatus.textContent = session.error;
      arrayAlgorithmStatus.dataset.state = "error";
      return;
    }
    const step = session.steps?.[session.stepIndex];
    arrayAlgorithmStatus.textContent = `${session.stepIndex + 1} / ${session.steps.length}：${step?.message ?? ""}`;
    arrayAlgorithmStatus.dataset.state = "";
  }

  return {
    bindArrayAlgorithmPanelEvents,
    getArrayAlgorithmSpeed,
    syncArrayAlgorithmPanelState,
  };
}
