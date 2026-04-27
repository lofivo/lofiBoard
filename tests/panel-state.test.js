import { describe, expect, it } from "vitest";
import { getNextPanelCollapsedState } from "../src/panel-state.js";

describe("panel state", () => {
  it("toggles a named panel without affecting the other panel", () => {
    const state = { style: false, layers: true };

    expect(getNextPanelCollapsedState(state, "style")).toEqual({ style: true, layers: true });
    expect(getNextPanelCollapsedState(state, "layers")).toEqual({ style: false, layers: false });
  });
});
