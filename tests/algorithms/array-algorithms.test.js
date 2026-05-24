import { describe, expect, it } from "vitest";
import {
  ALGORITHM_STEP_TYPES,
  createBubbleSortSteps,
  getNumericArrayValidation,
} from "../../src/algorithms/array-algorithms.js";

describe("array algorithms", () => {
  it("validates numeric array values before sorting", () => {
    expect(getNumericArrayValidation(["3", " -1 ", "2.5"])).toMatchObject({
      ok: true,
      numbers: [3, -1, 2.5],
    });

    expect(getNumericArrayValidation(["3", "A", "1"])).toMatchObject({
      ok: false,
      invalidIndex: 1,
      invalidValue: "A",
      message: "冒泡排序仅支持数字数组，请先修改第 2 项",
    });
  });

  it("creates separate compare and swap steps for bubble sort", () => {
    const result = createBubbleSortSteps(["3", "1", "2"]);

    expect(result.ok).toBe(true);
    expect(result.initialValues).toEqual(["3", "1", "2"]);
    expect(result.steps.map((step) => step.type)).toEqual([
      ALGORITHM_STEP_TYPES.START,
      ALGORITHM_STEP_TYPES.COMPARE,
      ALGORITHM_STEP_TYPES.SWAP,
      ALGORITHM_STEP_TYPES.COMPARE,
      ALGORITHM_STEP_TYPES.SWAP,
      ALGORITHM_STEP_TYPES.COMPARE,
      ALGORITHM_STEP_TYPES.COMPLETE,
    ]);
    expect(result.steps[1]).toMatchObject({
      type: ALGORITHM_STEP_TYPES.COMPARE,
      values: ["3", "1", "2"],
      activeIndices: [0, 1],
      sortedIndices: [],
      swapIndices: [0, 1],
      message: "比较 3 和 1，需要交换",
    });
    expect(result.steps[2]).toMatchObject({
      type: ALGORITHM_STEP_TYPES.SWAP,
      values: ["1", "3", "2"],
      activeIndices: [0, 1],
      sortedIndices: [],
      swapIndices: [0, 1],
      message: "交换 3 和 1",
    });
  });

  it("marks the sorted suffix and final completed array", () => {
    const result = createBubbleSortSteps(["2", "1", "3"]);

    expect(result.ok).toBe(true);
    const secondPassCompare = result.steps.find((step) => (
      step.type === ALGORITHM_STEP_TYPES.COMPARE && step.sortedIndices.includes(2)
    ));
    expect(secondPassCompare).toMatchObject({
      values: ["1", "2", "3"],
      activeIndices: [0, 1],
      sortedIndices: [2],
    });

    expect(result.steps.at(-1)).toMatchObject({
      type: ALGORITHM_STEP_TYPES.COMPLETE,
      values: ["1", "2", "3"],
      activeIndices: [],
      sortedIndices: [0, 1, 2],
      message: "冒泡排序完成",
    });
  });
});
