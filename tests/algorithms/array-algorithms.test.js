import { describe, expect, it } from "vitest";
import {
  ALGORITHM_STEP_TYPES,
  createBubbleSortSteps,
  createInsertionSortSteps,
  createSelectionSortSteps,
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

  it("creates selection sort scan and swap steps", () => {
    const result = createSelectionSortSteps(["3", "1", "2"]);

    expect(result.ok).toBe(true);
    expect(result.steps.map((step) => step.type)).toContain(ALGORITHM_STEP_TYPES.SELECT_MIN);
    expect(result.steps.map((step) => step.type)).toContain(ALGORITHM_STEP_TYPES.SWAP);
    expect(result.steps.find((step) => step.type === ALGORITHM_STEP_TYPES.SELECT_MIN && step.minIndex === 1)).toMatchObject({
      values: ["3", "1", "2"],
      activeIndices: [0, 1],
      sortedIndices: [],
      minIndex: 1,
      markers: {
        focusIndices: [0],
        scanIndices: [1],
        minIndex: 1,
      },
      message: "扫描 1，更新最小值",
    });
    expect(result.steps.find((step) => step.type === ALGORITHM_STEP_TYPES.SWAP)).toMatchObject({
      values: ["1", "3", "2"],
      activeIndices: [0, 1],
      sortedIndices: [0],
      swapIndices: [0, 1],
      animation: { type: "swap", moves: [{ from: 0, to: 1 }, { from: 1, to: 0 }] },
      message: "将最小值 1 放到位置 1",
    });
    expect(result.steps.at(-1)).toMatchObject({
      type: ALGORITHM_STEP_TYPES.COMPLETE,
      values: ["1", "2", "3"],
      sortedIndices: [0, 1, 2],
      message: "选择排序完成",
    });
  });

  it("records selection sort sorted prefix even when the current item is already minimum", () => {
    const result = createSelectionSortSteps(["1", "2", "3"]);

    expect(result.ok).toBe(true);
    expect(result.steps.some((step) => (
      step.type === ALGORITHM_STEP_TYPES.SELECT_MIN
        && step.values.join(",") === "1,2,3"
        && step.sortedIndices.includes(0)
    ))).toBe(true);
  });

  it("creates insertion sort key, compare, shift, and insert steps", () => {
    const result = createInsertionSortSteps(["3", "1", "2"]);

    expect(result.ok).toBe(true);
    expect(result.steps.map((step) => step.type)).toContain(ALGORITHM_STEP_TYPES.PICK_KEY);
    expect(result.steps.map((step) => step.type)).toContain(ALGORITHM_STEP_TYPES.COMPARE);
    expect(result.steps.map((step) => step.type)).toContain(ALGORITHM_STEP_TYPES.SHIFT);
    expect(result.steps.map((step) => step.type)).toContain(ALGORITHM_STEP_TYPES.INSERT);
    expect(result.steps.find((step) => step.type === ALGORITHM_STEP_TYPES.PICK_KEY)).toMatchObject({
      values: ["3", "1", "2"],
      activeIndices: [1],
      sortedIndices: [0],
      keyIndex: 1,
      keyValue: "1",
      markers: {
        keyIndex: 1,
        emptyIndex: 1,
        floatingKey: { sourceIndex: 1, currentIndex: 1, value: "1" },
      },
      message: "取出 1，准备插入已排序区间",
    });
    expect(result.steps.find((step) => step.type === ALGORITHM_STEP_TYPES.SHIFT)).toMatchObject({
      values: ["3", "3", "2"],
      activeIndices: [0, 1],
      sortedIndices: [],
      shift: { from: 0, to: 1 },
      animation: { type: "shift", moves: [{ from: 0, to: 1 }] },
      keyIndex: 1,
      keyValue: "1",
      markers: {
        keyIndex: 1,
        emptyIndex: 0,
        floatingKey: { sourceIndex: 1, currentIndex: 1, value: "1" },
      },
      message: "3 右移一格",
    });
    expect(result.steps.find((step) => step.type === ALGORITHM_STEP_TYPES.INSERT)).toMatchObject({
      values: ["1", "3", "2"],
      activeIndices: [0],
      sortedIndices: [0, 1],
      insert: { from: 1, to: 0 },
      animation: { type: "insert", moves: [{ from: 1, to: 0 }] },
      keyValue: "1",
      markers: {
        activeIndices: [0],
        sortedIndices: [0, 1],
      },
      message: "将 1 插入位置 1",
    });
    expect(result.steps.at(-1)).toMatchObject({
      type: ALGORITHM_STEP_TYPES.COMPLETE,
      values: ["1", "2", "3"],
      sortedIndices: [0, 1, 2],
      message: "插入排序完成",
    });
  });

  it("does not create no-op insertion animations when the key is already in place", () => {
    const result = createInsertionSortSteps(["1", "2", "3"]);

    expect(result.ok).toBe(true);
    const insertSteps = result.steps.filter((step) => step.type === ALGORITHM_STEP_TYPES.INSERT);
    expect(insertSteps).toHaveLength(2);
    expect(insertSteps.map((step) => step.animation)).toEqual([
      { type: "insert", moves: [{ from: 1, to: 1 }] },
      { type: "insert", moves: [{ from: 2, to: 2 }] },
    ]);
    expect(insertSteps.map((step) => step.message)).toEqual([
      "2 已在位置 2",
      "3 已在位置 3",
    ]);
    expect(result.steps.at(-1)).toMatchObject({
      type: ALGORITHM_STEP_TYPES.COMPLETE,
      values: ["1", "2", "3"],
      sortedIndices: [0, 1, 2],
    });
  });

  it("keeps insertion sort floating key and empty slot markers through shifts", () => {
    const result = createInsertionSortSteps(["4", "3", "2"]);

    expect(result.ok).toBe(true);
    const keyTwoSteps = result.steps.filter((step) => step.keyValue === "2");
    expect(keyTwoSteps.find((step) => step.type === ALGORITHM_STEP_TYPES.PICK_KEY)).toMatchObject({
      markers: {
        emptyIndex: 2,
        floatingKey: { sourceIndex: 2, currentIndex: 2, value: "2" },
      },
    });
    expect(keyTwoSteps.filter((step) => step.type === ALGORITHM_STEP_TYPES.SHIFT).map((step) => step.markers)).toEqual([
      expect.objectContaining({
        emptyIndex: 1,
        floatingKey: { sourceIndex: 2, currentIndex: 2, value: "2" },
      }),
      expect.objectContaining({
        emptyIndex: 0,
        floatingKey: { sourceIndex: 2, currentIndex: 2, value: "2" },
      }),
    ]);
    expect(keyTwoSteps.find((step) => step.type === ALGORITHM_STEP_TYPES.INSERT).markers.floatingKey).toBeUndefined();
  });

  it("separates insertion completion from the next key pickup", () => {
    const result = createInsertionSortSteps(["2", "1", "3"]);

    expect(result.ok).toBe(true);
    const insertIndex = result.steps.findIndex((step) => (
      step.type === ALGORITHM_STEP_TYPES.INSERT && step.keyValue === "1"
    ));
    expect(insertIndex).toBeGreaterThan(0);
    expect(result.steps[insertIndex]).toMatchObject({
      values: ["1", "2", "3"],
      activeIndices: [0],
      sortedIndices: [0, 1],
      message: "将 1 插入位置 1",
    });
    expect(result.steps[insertIndex + 1]).toMatchObject({
      type: ALGORITHM_STEP_TYPES.PICK_KEY,
      keyValue: "3",
      markers: {
        floatingKey: { sourceIndex: 2, currentIndex: 2, value: "3" },
      },
    });
  });
});
