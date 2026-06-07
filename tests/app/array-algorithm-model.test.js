import { describe, expect, it } from "vitest";
import {
  DEFAULT_ARRAY_ALGORITHM_PANEL_STATE,
  applyArrayAlgorithmValues,
  clearArrayAlgorithmRuntimeMarkers,
  createArrayAlgorithmSteps,
  getArrayAlgorithmLabel,
} from "../../src/app/algorithms/array-algorithm-model.js";
import { ARRAY_ALGORITHMS } from "../../src/algorithms/array-algorithms.js";

describe("array-algorithm-model", () => {
  it("provides a stable default panel state", () => {
    expect(DEFAULT_ARRAY_ALGORITHM_PANEL_STATE).toEqual({
      algorithm: ARRAY_ALGORITHMS.BUBBLE_SORT,
      speed: 1,
    });
    expect(Object.isFrozen(DEFAULT_ARRAY_ALGORITHM_PANEL_STATE)).toBe(true);
  });

  it("dispatches to the selected sorting algorithm", () => {
    const values = ["3", "1", "2"];

    expect(createArrayAlgorithmSteps(ARRAY_ALGORITHMS.BUBBLE_SORT, values).algorithm)
      .toBe(ARRAY_ALGORITHMS.BUBBLE_SORT);
    expect(createArrayAlgorithmSteps(ARRAY_ALGORITHMS.SELECTION_SORT, values).algorithm)
      .toBe(ARRAY_ALGORITHMS.SELECTION_SORT);
    expect(createArrayAlgorithmSteps(ARRAY_ALGORITHMS.INSERTION_SORT, values).algorithm)
      .toBe(ARRAY_ALGORITHMS.INSERTION_SORT);
    expect(createArrayAlgorithmSteps("unknown", values).algorithm)
      .toBe(ARRAY_ALGORITHMS.BUBBLE_SORT);
  });

  it("returns human-readable algorithm labels", () => {
    expect(getArrayAlgorithmLabel(ARRAY_ALGORITHMS.BUBBLE_SORT)).toBe("冒泡排序");
    expect(getArrayAlgorithmLabel(ARRAY_ALGORITHMS.SELECTION_SORT)).toBe("选择排序");
    expect(getArrayAlgorithmLabel(ARRAY_ALGORITHMS.INSERTION_SORT)).toBe("插入排序");
    expect(getArrayAlgorithmLabel("unknown")).toBe("排序");
  });

  it("applies step values to linear structure items without touching other elements", () => {
    const arrayElement = {
      type: "array-structure",
      items: [
        { id: "item_1", value: "3" },
        { id: "item_2", value: "1" },
        { id: "item_3", value: "2" },
      ],
    };

    expect(applyArrayAlgorithmValues(arrayElement, ["1", "2"])).toMatchObject({
      items: [
        { id: "item_1", value: "1" },
        { id: "item_2", value: "2" },
        { id: "item_3", value: "2" },
      ],
    });
    expect(applyArrayAlgorithmValues({ type: "rect", value: "x" }, ["1"]))
      .toEqual({ type: "rect", value: "x" });
  });

  it("clears algorithm markers and resets the runtime pointer", () => {
    const element = {
      type: "array-structure",
      markers: {
        algorithm: { activeIndices: [0] },
        highlight: [1],
        pointer: 2,
        showPointer: true,
      },
    };

    expect(clearArrayAlgorithmRuntimeMarkers(element)).toEqual({
      type: "array-structure",
      markers: {
        highlight: [1],
        pointer: null,
        showPointer: true,
      },
    });
  });
});
