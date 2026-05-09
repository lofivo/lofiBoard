import { describe, expect, it } from "vitest";
import { isLayerPanelAvailable, shouldShowPanelEdgeToggle } from "../../src/ui/panel-state.js";

describe("panel visibility", () => {
  it("shows edge toggle only when the panel is collapsed and available", () => {
    expect(shouldShowPanelEdgeToggle({ collapsed: true, available: true })).toBe(true);
    expect(shouldShowPanelEdgeToggle({ collapsed: false, available: true })).toBe(false);
    expect(shouldShowPanelEdgeToggle({ collapsed: true, available: false })).toBe(false);
  });

  it("keeps the layer panel available across tools", () => {
    expect(isLayerPanelAvailable()).toBe(true);
  });
});
