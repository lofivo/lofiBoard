import { describe, expect, it } from "vitest";
import {
  SM,
  createInteractionStateMachine,
  getTransformerOverdrawForState,
  getInteractionRuleForState,
} from "../../src/tools/interaction-state-machine.js";

describe("interaction-state-machine", () => {
  it("starts in idle state", () => {
    const sm = createInteractionStateMachine();
    expect(sm.state).toBe(SM.IDLE);
    expect(sm.is(SM.IDLE)).toBe(true);
    expect(sm.is([SM.IDLE, SM.PANNING])).toBe(true);
    expect(sm.is(SM.DRAGGING)).toBe(false);
  });

  it("transitions between states", () => {
    const sm = createInteractionStateMachine();

    sm.enter(SM.DRAWING);
    expect(sm.state).toBe(SM.DRAWING);
    expect(sm.is(SM.IDLE)).toBe(false);

    sm.enter(SM.IDLE);
    expect(sm.state).toBe(SM.IDLE);
  });

  it("stores context with state", () => {
    const sm = createInteractionStateMachine();

    sm.enter(SM.EDITING, { elementId: "text_1" });
    expect(sm.state).toBe(SM.EDITING);
    expect(sm.context).toEqual({ elementId: "text_1" });
  });

  it("exitToIdle returns to idle", () => {
    const sm = createInteractionStateMachine();

    sm.enter(SM.DRAGGING);
    sm.exitToIdle();
    expect(sm.state).toBe(SM.IDLE);
    expect(sm.context).toBeNull();
  });

  it("notifies listeners on transitions", () => {
    const sm = createInteractionStateMachine();
    const transitions = [];

    sm.onTransition((event) => {
      transitions.push(event);
    });

    sm.enter(SM.DRAWING);
    sm.enter(SM.IDLE);

    expect(transitions).toHaveLength(2);
    expect(transitions[0]).toEqual({
      previousState: SM.IDLE,
      state: SM.DRAWING,
      context: null,
    });
    expect(transitions[1]).toEqual({
      previousState: SM.DRAWING,
      state: SM.IDLE,
      context: null,
    });
  });

  it("unsubscribes listener correctly", () => {
    const sm = createInteractionStateMachine();
    const calls = [];

    const unsubscribe = sm.onTransition((event) => {
      calls.push(event.state);
    });

    sm.enter(SM.DRAWING);
    unsubscribe();
    sm.enter(SM.IDLE);

    expect(calls).toEqual([SM.DRAWING]);
  });

  it("is accepts array of states", () => {
    const sm = createInteractionStateMachine();

    sm.enter(SM.PANNING);
    expect(sm.is([SM.PANNING, SM.DRAGGING])).toBe(true);
    expect(sm.is([SM.EDITING, SM.DRAGGING])).toBe(false);
  });

  it("guardEnter transitions only when condition is true", () => {
    const sm = createInteractionStateMachine();

    const result = sm.guardEnter(SM.DRAGGING, false);
    expect(result).toBe(false);
    expect(sm.state).toBe(SM.IDLE);

    const result2 = sm.guardEnter(SM.DRAGGING, true);
    expect(result2).toBe(true);
    expect(sm.state).toBe(SM.DRAGGING);
  });

  it("guardEnter with function condition", () => {
    const sm = createInteractionStateMachine();

    const result = sm.guardEnter(SM.SELECTING, () => false);
    expect(result).toBe(false);

    const result2 = sm.guardEnter(SM.SELECTING, (tool) => tool === "select", "select");
    expect(result2).toBe(true);
    expect(sm.state).toBe(SM.SELECTING);
  });
});

describe("transformer overdraw", () => {
  it("returns false during editing", () => {
    expect(getTransformerOverdrawForState(SM.EDITING, [{ type: "text" }])).toBe(false);
    expect(getTransformerOverdrawForState(SM.EDITING, [{ type: "sticky" }])).toBe(false);
  });

  it("returns false for structure elements", () => {
    expect(getTransformerOverdrawForState(SM.IDLE, [{ type: "array-structure" }])).toBe(false);
    expect(getTransformerOverdrawForState(SM.IDLE, [{ type: "graph-structure" }])).toBe(false);
    expect(getTransformerOverdrawForState(SM.IDLE, [{ type: "tree-structure" }])).toBe(false);
    expect(getTransformerOverdrawForState(SM.IDLE, [{ type: "queue-structure" }])).toBe(false);
  });

  it("returns true for non-structure single elements", () => {
    expect(getTransformerOverdrawForState(SM.IDLE, [{ type: "text" }])).toBe(true);
    expect(getTransformerOverdrawForState(SM.IDLE, [{ type: "rect" }])).toBe(true);
    expect(getTransformerOverdrawForState(SM.IDLE, [{ type: "ellipse" }])).toBe(true);
  });

  it("returns true for multiple elements regardless of type", () => {
    expect(getTransformerOverdrawForState(SM.IDLE, [
      { type: "text" },
      { type: "array-structure" },
    ])).toBe(true);
  });
});

describe("interaction rules", () => {
  it("returns edit rule for editing state with text", () => {
    expect(getInteractionRuleForState(SM.EDITING, "text")).toBe("edit");
  });

  it("returns click-to-edit for text in idle state", () => {
    expect(getInteractionRuleForState(SM.IDLE, "text")).toBe("click-to-edit-ctrl-drag-to-move");
    expect(getInteractionRuleForState(SM.IDLE, "sticky")).toBe("click-to-edit-ctrl-drag-to-move");
  });

  it("returns structure rule for structures in idle state", () => {
    expect(getInteractionRuleForState(SM.IDLE, "array-structure")).toBe("click-to-select-node-shift-drag-to-move");
    expect(getInteractionRuleForState(SM.IDLE, "graph-structure")).toBe("click-to-select-node-shift-drag-to-move");
    expect(getInteractionRuleForState(SM.IDLE, "tree-structure")).toBe("click-to-select-node-shift-drag-to-move");
  });

  it("returns default rule for shapes in idle state", () => {
    expect(getInteractionRuleForState(SM.IDLE, "rect")).toBe("click-to-select-drag-to-move");
    expect(getInteractionRuleForState(SM.IDLE, "ellipse")).toBe("click-to-select-drag-to-move");
    expect(getInteractionRuleForState(SM.IDLE, "image")).toBe("click-to-select-drag-to-move");
  });

  it("returns default for unknown type", () => {
    expect(getInteractionRuleForState(SM.IDLE, null)).toBe("default");
    expect(getInteractionRuleForState(SM.IDLE, undefined)).toBe("default");
  });
});
