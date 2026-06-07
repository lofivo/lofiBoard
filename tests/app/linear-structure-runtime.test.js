import { describe, expect, it } from "vitest";
import {
  LINEAR_POINTER_BASE_Y,
  LINEAR_POINTER_DRAG_Y,
  clampLinearGap,
  getLinearDragInsertIndex,
  getLinearItemDragStartState,
  getLinearItemDragThresholdY,
  getLinearItemDragUpdate,
  getLinearPointerIndexFromWorldPoint,
  getLinearPreviewGap,
  getLinearPreviewXForGap,
  getLinearStructureGeometry,
} from "../../src/app/structures/linear-structure-runtime.js";

function linearElement(overrides = {}) {
  return {
    id: "array_1",
    type: "array-structure",
    x: 10,
    y: 20,
    items: [
      { value: "A", index: 0 },
      { value: "B", index: 1 },
      { value: "C", index: 2 },
    ],
    settings: { showIndexes: true },
    ...overrides,
  };
}

describe("linear-structure-runtime", () => {
  it("describes linear structure geometry from element style and settings", () => {
    expect(getLinearStructureGeometry(linearElement())).toMatchObject({
      showIndexes: true,
      cellWidth: 72,
      cellHeight: 44,
      totalHeight: 88,
    });

    expect(getLinearStructureGeometry(linearElement({
      type: "stack-structure",
      settings: { showIndexes: false },
      style: { cellWidth: 80, cellHeight: 30 },
    }))).toMatchObject({
      showIndexes: false,
      cellWidth: 80,
      cellHeight: 30,
      totalHeight: 30,
    });
  });

  it("keeps pointer animation coordinates behind the runtime module", () => {
    expect(LINEAR_POINTER_BASE_Y).toBe(-30);
    expect(LINEAR_POINTER_DRAG_Y).toBe(-40);
  });

  it("computes reorder gaps and preview positions", () => {
    const element = linearElement();

    expect(getLinearItemDragThresholdY(element)).toBe(105.6);
    expect(clampLinearGap(-1, 3)).toBe(0);
    expect(clampLinearGap(9, 3)).toBe(3);
    expect(getLinearPreviewGap(element, 110)).toBe(1);
    expect(getLinearDragInsertIndex(1, 3, 3)).toBe(2);

    expect(getLinearPreviewXForGap(0, 2, 0, 144, 72)).toBe(72);
    expect(getLinearPreviewXForGap(1, 2, 0, 144, 72)).toBe(144);
    expect(getLinearPreviewXForGap(2, 2, 0, 144, 72)).toBe(144);
    expect(getLinearPreviewXForGap(2, null, 0, 144, 72)).toBe(144);
  });

  it("maps pointer world coordinates to a clamped linear item index", () => {
    const element = linearElement();

    expect(getLinearPointerIndexFromWorldPoint(element, { x: 10, y: 20 })).toBe(0);
    expect(getLinearPointerIndexFromWorldPoint(element, { x: 120, y: 20 })).toBe(1);
    expect(getLinearPointerIndexFromWorldPoint(element, { x: 999, y: 20 })).toBe(2);
    expect(getLinearPointerIndexFromWorldPoint({ ...element, items: [] }, { x: 10, y: 20 })).toBeNull();
  });

  it("computes drag start and update patches from world coordinates", () => {
    const element = linearElement();
    const start = getLinearItemDragStartState({
      element,
      index: 1,
      worldPoint: { x: 100, y: 30 },
    });

    expect(start).toEqual({
      pointerOffsetX: 18,
      pointerOffsetY: 10,
      dragX: 72,
      dragY: 0,
      previewGap: 1,
    });

    const moved = getLinearItemDragUpdate({
      element,
      dragState: { ...start, previewGap: 1, cancelled: false },
      worldPoint: { x: 155, y: 30 },
    });

    expect(moved).toMatchObject({
      dragX: 127,
      dragY: -12,
      previewGap: 2,
      cancelled: false,
      dragYRaw: 0,
      gapChanged: true,
      cancelChanged: false,
    });

    const cancelled = getLinearItemDragUpdate({
      element,
      dragState: { ...start, previewGap: 1, cancelled: false },
      worldPoint: { x: 100, y: 200 },
    });

    expect(cancelled).toMatchObject({
      dragY: 0,
      cancelled: true,
      cancelChanged: true,
    });
  });
});
