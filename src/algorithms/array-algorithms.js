export const ARRAY_ALGORITHMS = Object.freeze({
  BUBBLE_SORT: "bubble-sort",
});

export const ALGORITHM_STEP_TYPES = Object.freeze({
  START: "start",
  COMPARE: "compare",
  SWAP: "swap",
  COMPLETE: "complete",
});

export function getNumericArrayValidation(values) {
  const sourceValues = Array.isArray(values) ? values : [];
  const numbers = [];
  for (let index = 0; index < sourceValues.length; index += 1) {
    const rawValue = String(sourceValues[index] ?? "").trim();
    const numberValue = Number(rawValue);
    if (rawValue === "" || !Number.isFinite(numberValue)) {
      return {
        ok: false,
        invalidIndex: index,
        invalidValue: String(sourceValues[index] ?? ""),
        message: `冒泡排序仅支持数字数组，请先修改第 ${index + 1} 项`,
      };
    }
    numbers.push(numberValue);
  }
  return {
    ok: true,
    numbers,
  };
}

export function createBubbleSortSteps(values) {
  const sourceValues = (Array.isArray(values) ? values : []).map((value) => String(value ?? ""));
  const validation = getNumericArrayValidation(sourceValues);
  if (!validation.ok) return validation;

  const numbers = [...validation.numbers];
  const displayValues = [...sourceValues];
  const steps = [
    createStep({
      type: ALGORITHM_STEP_TYPES.START,
      values: displayValues,
      message: "开始冒泡排序",
    }),
  ];

  for (let pass = 0; pass < numbers.length - 1; pass += 1) {
    const sortedIndices = getSortedSuffixIndices(numbers.length, pass);
    for (let index = 0; index < numbers.length - 1 - pass; index += 1) {
      const shouldSwap = numbers[index] > numbers[index + 1];
      steps.push(createStep({
        type: ALGORITHM_STEP_TYPES.COMPARE,
        values: displayValues,
        activeIndices: [index, index + 1],
        sortedIndices,
        swapIndices: shouldSwap ? [index, index + 1] : [],
        message: shouldSwap
          ? `比较 ${displayValues[index]} 和 ${displayValues[index + 1]}，需要交换`
          : `比较 ${displayValues[index]} 和 ${displayValues[index + 1]}，不需要交换`,
      }));

      if (!shouldSwap) continue;
      const firstValue = displayValues[index];
      const secondValue = displayValues[index + 1];
      [numbers[index], numbers[index + 1]] = [numbers[index + 1], numbers[index]];
      [displayValues[index], displayValues[index + 1]] = [displayValues[index + 1], displayValues[index]];
      steps.push(createStep({
        type: ALGORITHM_STEP_TYPES.SWAP,
        values: displayValues,
        activeIndices: [index, index + 1],
        sortedIndices,
        swapIndices: [index, index + 1],
        message: `交换 ${firstValue} 和 ${secondValue}`,
      }));
    }
  }

  steps.push(createStep({
    type: ALGORITHM_STEP_TYPES.COMPLETE,
    values: displayValues,
    sortedIndices: displayValues.map((_, index) => index),
    message: "冒泡排序完成",
  }));

  return {
    ok: true,
    algorithm: ARRAY_ALGORITHMS.BUBBLE_SORT,
    initialValues: sourceValues,
    steps,
  };
}

function createStep({
  type,
  values,
  activeIndices = [],
  sortedIndices = [],
  swapIndices = [],
  message,
}) {
  return {
    type,
    values: [...values],
    activeIndices: [...activeIndices],
    sortedIndices: [...sortedIndices],
    swapIndices: [...swapIndices],
    message,
  };
}

function getSortedSuffixIndices(length, pass) {
  const sortedStart = Math.max(0, length - pass);
  return Array.from({ length: Math.max(0, length - sortedStart) }, (_, offset) => sortedStart + offset);
}
