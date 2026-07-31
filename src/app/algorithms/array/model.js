import {
  ARRAY_ALGORITHMS,
  createBubbleSortSteps,
  createInsertionSortSteps,
  createSelectionSortSteps,
} from "../../../algorithms/array.js";
import {
  clearArrayAlgorithmMarkers,
  isLinearStructureElement,
} from "../../../structures/linear-structure.js";
import { createAlgorithmTrace } from "../../../algorithms/player.js";

export const DEFAULT_ARRAY_ALGORITHM_PANEL_STATE = Object.freeze({
  algorithm: ARRAY_ALGORITHMS.BUBBLE_SORT,
  speed: 1,
});

export function createArrayAlgorithmSteps(algorithm, values) {
  const result = algorithm === ARRAY_ALGORITHMS.SELECTION_SORT
    ? createSelectionSortSteps(values)
    : algorithm === ARRAY_ALGORITHMS.INSERTION_SORT
      ? createInsertionSortSteps(values)
      : createBubbleSortSteps(values);

  if (!result.ok) return result;
  return createAlgorithmTrace({
    algorithm: result.algorithm,
    label: getArrayAlgorithmLabel(result.algorithm),
    initialState: { values: result.initialValues },
    initialValues: result.initialValues,
    steps: result.steps,
    metadata: {
      domain: "array",
      stateKey: "values",
    },
  });
}

export function getArrayAlgorithmLabel(algorithm) {
  return {
    [ARRAY_ALGORITHMS.BUBBLE_SORT]: "冒泡排序",
    [ARRAY_ALGORITHMS.SELECTION_SORT]: "选择排序",
    [ARRAY_ALGORITHMS.INSERTION_SORT]: "插入排序",
  }[algorithm] ?? "排序";
}

export function applyArrayAlgorithmValues(element, values) {
  if (!isLinearStructureElement(element)) return element;
  return {
    ...element,
    items: (element.items ?? []).map((item, index) => ({
      ...item,
      value: String(values[index] ?? item.value ?? ""),
    })),
  };
}

export function clearArrayAlgorithmRuntimeMarkers(element) {
  const cleared = clearArrayAlgorithmMarkers(element);
  return {
    ...cleared,
    markers: {
      ...(cleared.markers ?? {}),
      pointer: null,
    },
  };
}
