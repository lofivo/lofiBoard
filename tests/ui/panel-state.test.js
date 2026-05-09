import { describe, expect, it } from "vitest";
import { getNextPanelCollapsedState, getPanelStateForLayerContent } from "../../src/ui/panel-state.js";

describe("panel state", () => {
  it("toggles a named panel without affecting the other panel", () => {
    const state = { style: false, layers: true };

    expect(getNextPanelCollapsedState(state, "style")).toEqual({ style: true, layers: true });
    expect(getNextPanelCollapsedState(state, "layers")).toEqual({ style: false, layers: false });
  });

  it("collapses the layer panel when layer content becomes empty", () => {
    expect(getPanelStateForLayerContent({ style: false, layers: false }, false)).toEqual({
      style: false,
      layers: true,
    });
    expect(getPanelStateForLayerContent({ style: false, layers: false }, true)).toEqual({
      style: false,
      layers: false,
    });
    expect(getPanelStateForLayerContent({ style: true, layers: true }, false)).toEqual({
      style: true,
      layers: true,
    });
  });
});
