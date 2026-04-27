import { describe, expect, it } from "vitest";
import { shouldShowPanelEdgeToggle } from "../src/panel-state.js";

describe("panel visibility", () => {
  it("shows edge toggle only when the panel is collapsed and available", () => {
    expect(shouldShowPanelEdgeToggle({ collapsed: true, available: true })).toBe(true);
    expect(shouldShowPanelEdgeToggle({ collapsed: false, available: true })).toBe(false);
    expect(shouldShowPanelEdgeToggle({ collapsed: true, available: false })).toBe(false);
  });
});
