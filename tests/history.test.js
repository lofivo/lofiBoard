import { describe, expect, it } from "vitest";
import { createHistory } from "../src/history.js";

describe("history", () => {
  it("undoes and redoes immutable board snapshots", () => {
    const history = createHistory({ elements: [] });

    history.push({ elements: [{ id: "a" }] });
    history.push({ elements: [{ id: "a" }, { id: "b" }] });

    expect(history.undo()).toEqual({ elements: [{ id: "a" }] });
    expect(history.undo()).toEqual({ elements: [] });
    expect(history.redo()).toEqual({ elements: [{ id: "a" }] });
  });

  it("drops redo states when a new snapshot is pushed after undo", () => {
    const history = createHistory({ elements: [] });

    history.push({ elements: [{ id: "a" }] });
    history.push({ elements: [{ id: "b" }] });
    history.undo();
    history.push({ elements: [{ id: "c" }] });

    expect(history.redo()).toBeNull();
    expect(history.undo()).toEqual({ elements: [{ id: "a" }] });
  });

  it("tracks canvas background changes as undoable snapshots", () => {
    const history = createHistory({
      canvas: { backgroundMode: "dots" },
      elements: [],
    });

    history.push({
      canvas: { backgroundMode: "plain" },
      elements: [],
    });

    expect(history.undo()).toEqual({
      canvas: { backgroundMode: "dots" },
      elements: [],
    });
    expect(history.redo()).toEqual({
      canvas: { backgroundMode: "plain" },
      elements: [],
    });
  });
});
