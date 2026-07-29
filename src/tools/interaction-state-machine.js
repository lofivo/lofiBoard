export const SM = {
  IDLE: "idle",
  PANNING: "panning",
  SELECTING: "selecting",
  DRAGGING: "dragging",
  EDITING: "editing",
  DRAWING: "drawing",
  RESIZING: "resizing",
  ERASING: "erasing",
  STRUCTURE_INTERACTING: "structure-interacting",
};

export function createInteractionStateMachine() {
  let state = SM.IDLE;
  let context = null;
  const listeners = new Set();

  const guard = (desiredState, condition, ...args) => {
    if (typeof condition === "function" ? !condition(...args) : !condition) {
      return false;
    }
    return true;
  };

  const transition = (nextState, nextContext = null) => {
    if (state === nextState && context === nextContext) return true;
    const previousState = state;
    state = nextState;
    context = nextContext;
    for (const listener of listeners) {
      listener({ previousState, state, context });
    }
    return true;
  };

  return {
    get state() { return state; },
    get context() { return context; },

    is(oneOrMore) {
      const states = Array.isArray(oneOrMore) ? oneOrMore : [oneOrMore];
      return states.includes(state);
    },

    canEnter(nextState, condition = true, ...args) {
      return guard(nextState, condition, ...args);
    },

    enter(nextState, nextContext = null) {
      return transition(nextState, nextContext);
    },

    exitToIdle() {
      return transition(SM.IDLE, null);
    },

    guardEnter(nextState, condition, ...args) {
      if (!guard(nextState, condition, ...args)) return false;
      return transition(nextState);
    },

    onTransition(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export function getTransformerOverdrawForState(state, elements = []) {
  if (state === SM.EDITING) return false;
  if (elements.length === 1) {
    const type = elements[0]?.type;
    if (type && isStructureType(type)) return false;
  }
  return true;
}

export function getInteractionRuleForState(state, elementType) {
  if (state === SM.EDITING) return "edit";
  if (!elementType) return "default";
  if (state === SM.IDLE || state === SM.DRAGGING) {
    if (elementType === "text" || elementType === "sticky") {
      return "click-to-edit-ctrl-drag-to-move";
    }
    if (isStructureType(elementType)) {
      return "click-to-select-node-shift-drag-to-move";
    }
    return "click-to-select-drag-to-move";
  }
  return "default";
}

function isStructureType(type) {
  return type && (
    type === "array-structure" ||
    type === "matrix-structure" ||
    type === "stack-structure" ||
    type === "queue-structure" ||
    type === "deque-structure" ||
    type === "graph-structure" ||
    type === "tree-structure"
  );
}
