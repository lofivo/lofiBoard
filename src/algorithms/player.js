const EMPTY_OBJECT = Object.freeze({});

export const ALGORITHM_PLAYER_PHASES = Object.freeze({
  READY: "ready",
  PLAYING: "playing",
  ANIMATING: "animating",
  COMPLETE: "complete",
  ERROR: "error",
});

function cloneValue(value) {
  if (value === undefined || value === null) return value;
  if (typeof structuredClone === "function") return structuredClone(value);
  if (Array.isArray(value)) return value.map((item) => cloneValue(item));
  if (typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneValue(item)]));
  }
  return value;
}

function normalizeStepIndex(index, lastIndex) {
  const numericIndex = Number.isFinite(Number(index)) ? Math.trunc(Number(index)) : 0;
  return Math.min(Math.max(0, numericIndex), Math.max(0, lastIndex));
}

function getStepState(step, fallbackState) {
  if (step && Object.prototype.hasOwnProperty.call(step, "state")) {
    return cloneValue(step.state);
  }
  if (step && Object.prototype.hasOwnProperty.call(step, "values")) {
    return { values: cloneValue(step.values) };
  }
  return cloneValue(fallbackState);
}

/**
 * Normalizes the common teaching data carried by one algorithm step while
 * preserving domain-specific fields such as array values and swap moves.
 */
export function normalizeAlgorithmStep(step = {}, index = 0, fallbackState = undefined) {
  const source = step && typeof step === "object" ? step : {};
  const markers = source.visual?.markers ?? source.markers ?? EMPTY_OBJECT;
  const animation = source.visual?.animation ?? source.animation ?? null;

  return {
    ...source,
    index: Number.isInteger(source.index) ? source.index : index,
    state: getStepState(source, fallbackState),
    explanation: source.explanation ?? source.message ?? "",
    codeLine: source.codeLine ?? null,
    variables: cloneValue(source.variables ?? EMPTY_OBJECT),
    visual: {
      ...(source.visual ?? {}),
      markers: cloneValue(markers),
      animation: cloneValue(animation),
    },
  };
}

/**
 * Creates the serializable trace shared by algorithm implementations and
 * playback adapters. A trace contains no timers, Konva nodes, or UI state.
 */
export function createAlgorithmTrace({
  algorithm = "unknown",
  label = null,
  algorithmLabel = null,
  initialState = undefined,
  initialValues = undefined,
  steps = [],
  metadata = EMPTY_OBJECT,
} = {}) {
  const safeSteps = Array.isArray(steps) ? steps : [];
  const sourceState = initialState !== undefined ? initialState : initialValues;
  const normalizedSteps = safeSteps.map((step, index) => (
    normalizeAlgorithmStep(step, index, sourceState)
  ));
  const resolvedLabel = label ?? algorithmLabel ?? String(algorithm);

  return {
    ok: true,
    algorithm,
    label: resolvedLabel,
    algorithmLabel: resolvedLabel,
    initialState: cloneValue(sourceState),
    initialValues: cloneValue(initialValues),
    steps: normalizedSteps,
    metadata: cloneValue(metadata),
  };
}

export function createAlgorithmPlayerSession(trace, {
  elementId = null,
  speed = 1,
} = {}) {
  const safeTrace = trace ?? createAlgorithmTrace();
  return {
    elementId,
    algorithm: safeTrace.algorithm,
    label: safeTrace.label ?? safeTrace.algorithmLabel ?? String(safeTrace.algorithm ?? "unknown"),
    algorithmLabel: safeTrace.algorithmLabel ?? safeTrace.label ?? String(safeTrace.algorithm ?? "unknown"),
    initialState: cloneValue(safeTrace.initialState),
    initialValues: cloneValue(safeTrace.initialValues),
    steps: Array.isArray(safeTrace.steps) ? safeTrace.steps.map((step, index) => (
      normalizeAlgorithmStep(step, index, safeTrace.initialState)
    )) : [],
    metadata: cloneValue(safeTrace.metadata ?? EMPTY_OBJECT),
    stepIndex: 0,
    stableStepIndex: 0,
    speed,
    isPlaying: false,
    isAnimating: false,
    committed: false,
    error: "",
    pendingStepIndex: null,
  };
}

export function createAlgorithmPlayerErrorSession({
  elementId = null,
  error = "算法无法开始",
  algorithm = "unknown",
  algorithmLabel = "算法演示",
  speed = 1,
} = {}) {
  return {
    elementId,
    algorithm,
    label: algorithmLabel,
    algorithmLabel,
    initialState: null,
    initialValues: null,
    steps: null,
    metadata: {},
    stepIndex: 0,
    stableStepIndex: 0,
    speed,
    isPlaying: false,
    isAnimating: false,
    committed: false,
    error: String(error ?? "算法无法开始"),
    pendingStepIndex: null,
  };
}

export function getAlgorithmPlayerLastStepIndex(session) {
  return Math.max(0, (session?.steps?.length ?? 1) - 1);
}

export function getAlgorithmPlayerStep(session, index = session?.stepIndex ?? 0) {
  if (!session?.steps?.length) return null;
  return session.steps[normalizeStepIndex(index, getAlgorithmPlayerLastStepIndex(session))] ?? null;
}

export function getAlgorithmPlayerPhase(session) {
  if (session?.error) return ALGORITHM_PLAYER_PHASES.ERROR;
  if (session?.isAnimating) return ALGORITHM_PLAYER_PHASES.ANIMATING;
  if (session?.isPlaying) return ALGORITHM_PLAYER_PHASES.PLAYING;
  if (session?.steps?.length && session.stepIndex >= getAlgorithmPlayerLastStepIndex(session)) {
    return ALGORITHM_PLAYER_PHASES.COMPLETE;
  }
  return ALGORITHM_PLAYER_PHASES.READY;
}

export function setAlgorithmPlayerStep(session, index, {
  isPlaying = session?.isPlaying ?? false,
  isAnimating = false,
  pendingStepIndex = null,
} = {}) {
  if (!session?.steps?.length || session.error) return session;
  const stepIndex = normalizeStepIndex(index, getAlgorithmPlayerLastStepIndex(session));
  return {
    ...session,
    stepIndex,
    stableStepIndex: stepIndex,
    isPlaying: stepIndex >= getAlgorithmPlayerLastStepIndex(session) ? false : Boolean(isPlaying),
    isAnimating: Boolean(isAnimating),
    pendingStepIndex,
  };
}

export function advanceAlgorithmPlayer(session) {
  if (!session?.steps?.length || session.error || session.isAnimating) return session;
  return setAlgorithmPlayerStep(session, (session.stepIndex ?? 0) + 1);
}

export function rewindAlgorithmPlayer(session) {
  if (!session?.steps?.length || session.error || session.isAnimating) return session;
  return setAlgorithmPlayerStep(session, (session.stepIndex ?? 0) - 1, { isPlaying: false });
}

export function setAlgorithmPlayerPlayback(session, isPlaying) {
  if (!session?.steps?.length || session.error || session.isAnimating) return session;
  const shouldPlay = Boolean(isPlaying) && session.stepIndex < getAlgorithmPlayerLastStepIndex(session);
  return { ...session, isPlaying: shouldPlay };
}

export function resetAlgorithmPlayer(session) {
  if (!session?.steps?.length || session.error) return session;
  return {
    ...session,
    stepIndex: 0,
    stableStepIndex: 0,
    isPlaying: false,
    isAnimating: false,
    committed: false,
    error: "",
    pendingStepIndex: null,
  };
}

export function completeAlgorithmPlayer(session) {
  if (!session?.steps?.length || session.error) return session;
  const lastStepIndex = getAlgorithmPlayerLastStepIndex(session);
  return {
    ...session,
    stepIndex: lastStepIndex,
    stableStepIndex: lastStepIndex,
    isPlaying: false,
    isAnimating: false,
    committed: true,
    pendingStepIndex: null,
  };
}
