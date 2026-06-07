import { describe, expect, it, vi } from "vitest";
import { createSelectionStyleController } from "../../src/app/inspector/selection-style-controller.js";

function createHarness(overrides = {}) {
  const state = {
    elements: overrides.elements ?? [],
    selectedIds: overrides.selectedIds ?? [],
  };
  const callbacks = {
    normalizeTextElementBox: vi.fn((element) => ({ ...element, normalized: true })),
    ...overrides.callbacks,
  };
  const controller = createSelectionStyleController({
    getElements: () => state.elements,
    setElements: (elements) => { state.elements = elements; },
    getSelectedIds: () => state.selectedIds,
    normalizeTextElementBox: callbacks.normalizeTextElementBox,
  });
  return { callbacks, controller, state };
}

describe("selection-style-controller", () => {
  it("applies type-aware style updates and keeps coordinate or structure elements unchanged", () => {
    const { callbacks, controller, state } = createHarness({
      selectedIds: [
        "text_1",
        "sticky_1",
        "arrow_1",
        "stroke_1",
        "line_1",
        "rect_1",
        "plane_1",
        "array_1",
        "locked_1",
      ],
      elements: [
        { id: "text_1", type: "text", fill: "#000000", fontSize: 16, fontFamily: "Arial" },
        { id: "sticky_1", type: "sticky", textFill: "#000000", fill: "#ffffff", fontSize: 18, fontFamily: "Arial" },
        { id: "arrow_1", type: "arrow", stroke: "#000000", strokeWidth: 1, fill: "#000000" },
        { id: "stroke_1", type: "stroke", stroke: "#000000", strokeWidth: 1, opacity: 1 },
        { id: "line_1", type: "line", stroke: "#000000", strokeWidth: 1, opacity: 1 },
        { id: "rect_1", type: "rectangle", stroke: "#000000", fill: "#ffffff", strokeWidth: 1 },
        { id: "plane_1", type: "coordinate-plane", stroke: "#000000" },
        { id: "array_1", type: "array-structure", stroke: "#000000" },
        { id: "locked_1", type: "rectangle", locked: true, stroke: "#000000" },
      ],
    });

    const didApply = controller.applyStyleToSelection({
      color: "#ef4444",
      fillColor: "#fef08a",
      fillTransparent: true,
      fontFamily: "Inter",
      fontSize: 24,
      strokeStyle: {
        stroke: "#ef4444",
        strokeWidth: 6,
        opacity: 0.5,
        lineCap: "round",
      },
      width: 6,
      arrowDoubleEnded: true,
    });

    expect(didApply).toBe(true);
    expect(callbacks.normalizeTextElementBox).toHaveBeenCalledWith(expect.objectContaining({
      id: "text_1",
      fill: "#ef4444",
      fontSize: 24,
      fontFamily: "Inter",
    }));
    expect(state.elements).toEqual([
      expect.objectContaining({ id: "text_1", fill: "#ef4444", fontSize: 24, fontFamily: "Inter", normalized: true }),
      expect.objectContaining({ id: "sticky_1", textFill: "#ef4444", fill: "#fef08a", fontSize: 24, fontFamily: "Inter" }),
      expect.objectContaining({ id: "arrow_1", stroke: "#ef4444", strokeWidth: 6, opacity: 0.5, fill: "#ef4444", pointerAtBeginning: true, pointerAtEnding: true }),
      expect.objectContaining({ id: "stroke_1", stroke: "#ef4444", strokeWidth: 6, opacity: 1 }),
      expect.objectContaining({ id: "line_1", stroke: "#ef4444", strokeWidth: 6, opacity: 0.5, lineCap: "round" }),
      expect.objectContaining({ id: "rect_1", stroke: "#ef4444", fill: "transparent", strokeWidth: 6 }),
      { id: "plane_1", type: "coordinate-plane", stroke: "#000000" },
      { id: "array_1", type: "array-structure", stroke: "#000000" },
      { id: "locked_1", type: "rectangle", locked: true, stroke: "#000000" },
    ]);
  });

  it("applies full stroke style when every selected element is a freehand stroke", () => {
    const { controller, state } = createHarness({
      selectedIds: ["stroke_1"],
      elements: [
        { id: "stroke_1", type: "stroke", stroke: "#000000", strokeWidth: 1, opacity: 1 },
      ],
    });

    controller.applyStyleToSelection({
      color: "#2563eb",
      strokeStyle: {
        stroke: "#2563eb",
        strokeWidth: 4,
        opacity: 0.25,
        lineCap: "round",
      },
      width: 4,
    });

    expect(state.elements[0]).toMatchObject({
      stroke: "#2563eb",
      strokeWidth: 4,
      opacity: 0.25,
      lineCap: "round",
    });
  });

  it("applies coordinate-plane controls only to unlocked selected coordinate planes", () => {
    const { controller, state } = createHarness({
      selectedIds: ["plane_1", "plane_2", "rect_1"],
      elements: [
        {
          id: "plane_1",
          type: "coordinate-plane",
          unitSize: 40,
          settings: { showGrid: true, keep: true },
          style: { gridStroke: "#e5e7eb", keep: "#111111" },
        },
        { id: "plane_2", type: "coordinate-plane", locked: true, unitSize: 40 },
        { id: "rect_1", type: "rectangle", stroke: "#000000" },
      ],
    });

    const didApply = controller.applyCoordinateStyleToSelection({
      unitSize: 3,
      showGrid: false,
      showTicks: true,
      showLabels: false,
      gridStroke: "#94a3b8",
      axisStroke: "#0f172a",
      labelFill: "#475569",
    });

    expect(didApply).toBe(true);
    expect(state.elements[0]).toMatchObject({
      unitSize: 8,
      settings: { showGrid: false, showTicks: true, showLabels: false, keep: true },
      style: { gridStroke: "#94a3b8", axisStroke: "#0f172a", labelFill: "#475569", keep: "#111111" },
    });
    expect(state.elements[1]).toEqual({ id: "plane_2", type: "coordinate-plane", locked: true, unitSize: 40 });
    expect(state.elements[2]).toEqual({ id: "rect_1", type: "rectangle", stroke: "#000000" });
  });

  it("toggles text styles on text-like selected elements", () => {
    const { callbacks, controller, state } = createHarness({
      selectedIds: ["text_1", "sticky_1", "rect_1"],
      elements: [
        { id: "text_1", type: "text", fontStyle: "normal" },
        { id: "sticky_1", type: "sticky", fontStyle: "bold" },
        { id: "rect_1", type: "rectangle" },
      ],
    });

    const didToggle = controller.toggleTextStyle("bold");

    expect(didToggle).toBe(true);
    expect(callbacks.normalizeTextElementBox).toHaveBeenCalledTimes(2);
    expect(state.elements).toEqual([
      expect.objectContaining({ id: "text_1", fontStyle: "bold", normalized: true }),
      expect.objectContaining({ id: "sticky_1", fontStyle: "normal", normalized: true }),
      { id: "rect_1", type: "rectangle" },
    ]);
  });

  it("ignores unsupported text style commands", () => {
    const { controller, state } = createHarness({
      selectedIds: ["text_1"],
      elements: [
        { id: "text_1", type: "text", fontStyle: "normal" },
      ],
    });

    const didToggle = controller.toggleTextStyle("shadow");

    expect(didToggle).toBe(false);
    expect(state.elements[0]).toEqual({ id: "text_1", type: "text", fontStyle: "normal" });
  });
});
