export const ARRAY_ALGORITHMS = Object.freeze({
  BUBBLE_SORT: "bubble-sort",
  SELECTION_SORT: "selection-sort",
  INSERTION_SORT: "insertion-sort",
});

export const ALGORITHM_STEP_TYPES = Object.freeze({
  START: "start",
  COMPARE: "compare",
  SELECT_MIN: "select-min",
  SWAP: "swap",
  PICK_KEY: "pick-key",
  SHIFT: "shift",
  INSERT: "insert",
  COMPLETE: "complete",
});

const ALGORITHM_LABELS = Object.freeze({
  [ARRAY_ALGORITHMS.BUBBLE_SORT]: "冒泡排序",
  [ARRAY_ALGORITHMS.SELECTION_SORT]: "选择排序",
  [ARRAY_ALGORITHMS.INSERTION_SORT]: "插入排序",
});

export function getNumericArrayValidation(values, algorithm = ARRAY_ALGORITHMS.BUBBLE_SORT) {
  const sourceValues = Array.isArray(values) ? values : [];
  const numbers = [];
  const label = ALGORITHM_LABELS[algorithm] ?? "排序";
  for (let index = 0; index < sourceValues.length; index += 1) {
    const rawValue = String(sourceValues[index] ?? "").trim();
    const numberValue = Number(rawValue);
    if (rawValue === "" || !Number.isFinite(numberValue)) {
      return {
        ok: false,
        invalidIndex: index,
        invalidValue: String(sourceValues[index] ?? ""),
        message: `${label}仅支持数字数组，请先修改第 ${index + 1} 项`,
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
  const validation = getNumericArrayValidation(sourceValues, ARRAY_ALGORITHMS.BUBBLE_SORT);
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
        markers: {
          scanIndices: [index, index + 1],
        },
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
        animation: createMoveAnimation("swap", [
          { from: index, to: index + 1 },
          { from: index + 1, to: index },
        ]),
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

export function createSelectionSortSteps(values) {
  const sourceValues = (Array.isArray(values) ? values : []).map((value) => String(value ?? ""));
  const validation = getNumericArrayValidation(sourceValues, ARRAY_ALGORITHMS.SELECTION_SORT);
  if (!validation.ok) return validation;

  const numbers = [...validation.numbers];
  const displayValues = [...sourceValues];
  const steps = [
    createStep({
      type: ALGORITHM_STEP_TYPES.START,
      values: displayValues,
      message: "开始选择排序",
    }),
  ];

  for (let index = 0; index < numbers.length - 1; index += 1) {
    let minIndex = index;
    steps.push(createStep({
      type: ALGORITHM_STEP_TYPES.SELECT_MIN,
      values: displayValues,
      activeIndices: [index],
      sortedIndices: getSortedPrefixIndices(index),
      minIndex,
      markers: {
        focusIndices: [index],
        minIndex,
      },
      message: `从位置 ${index + 1} 开始寻找最小值`,
    }));
    for (let scanIndex = index + 1; scanIndex < numbers.length; scanIndex += 1) {
      const isNewMin = numbers[scanIndex] < numbers[minIndex];
      if (isNewMin) minIndex = scanIndex;
      steps.push(createStep({
        type: ALGORITHM_STEP_TYPES.SELECT_MIN,
        values: displayValues,
        activeIndices: [...new Set([index, minIndex, scanIndex])],
        sortedIndices: getSortedPrefixIndices(index),
        minIndex,
        markers: {
          focusIndices: [index],
          scanIndices: [scanIndex],
          minIndex,
        },
        message: isNewMin
          ? `扫描 ${displayValues[scanIndex]}，更新最小值`
          : `扫描 ${displayValues[scanIndex]}，最小值仍是 ${displayValues[minIndex]}`,
      }));
    }
    if (minIndex === index) continue;
    const minValue = displayValues[minIndex];
    [numbers[index], numbers[minIndex]] = [numbers[minIndex], numbers[index]];
    [displayValues[index], displayValues[minIndex]] = [displayValues[minIndex], displayValues[index]];
    steps.push(createStep({
      type: ALGORITHM_STEP_TYPES.SWAP,
      values: displayValues,
      activeIndices: [index, minIndex],
      sortedIndices: getSortedPrefixIndices(index + 1),
      swapIndices: [index, minIndex],
      markers: {
        focusIndices: [index],
        minIndex,
      },
      animation: createMoveAnimation("swap", [
        { from: index, to: minIndex },
        { from: minIndex, to: index },
      ]),
      message: `将最小值 ${minValue} 放到位置 ${index + 1}`,
    }));
  }

  steps.push(createStep({
    type: ALGORITHM_STEP_TYPES.COMPLETE,
    values: displayValues,
    sortedIndices: displayValues.map((_, index) => index),
    message: "选择排序完成",
  }));

  return {
    ok: true,
    algorithm: ARRAY_ALGORITHMS.SELECTION_SORT,
    initialValues: sourceValues,
    steps,
  };
}

export function createInsertionSortSteps(values) {
  const sourceValues = (Array.isArray(values) ? values : []).map((value) => String(value ?? ""));
  const validation = getNumericArrayValidation(sourceValues, ARRAY_ALGORITHMS.INSERTION_SORT);
  if (!validation.ok) return validation;

  const numbers = [...validation.numbers];
  const displayValues = [...sourceValues];
  const steps = [
    createStep({
      type: ALGORITHM_STEP_TYPES.START,
      values: displayValues,
      sortedIndices: numbers.length > 0 ? [0] : [],
      message: "开始插入排序",
    }),
  ];

  for (let index = 1; index < numbers.length; index += 1) {
    const keyNumber = numbers[index];
    const keyValue = displayValues[index];
    let compareIndex = index - 1;
    steps.push(createStep({
      type: ALGORITHM_STEP_TYPES.PICK_KEY,
      values: displayValues,
      activeIndices: [index],
      sortedIndices: getSortedPrefixIndices(index),
      keyIndex: index,
      keyValue,
      markers: {
        keyIndex: index,
      },
      message: `取出 ${keyValue}，准备插入已排序区间`,
    }));
    while (compareIndex >= 0) {
      steps.push(createStep({
        type: ALGORITHM_STEP_TYPES.COMPARE,
        values: displayValues,
        activeIndices: [compareIndex, index],
        sortedIndices: getSortedPrefixIndices(compareIndex),
        keyIndex: index,
        keyValue,
        markers: {
          scanIndices: [compareIndex],
          keyIndex: index,
        },
        message: numbers[compareIndex] > keyNumber
          ? `比较 ${displayValues[compareIndex]} 和 ${keyValue}，需要右移`
          : `比较 ${displayValues[compareIndex]} 和 ${keyValue}，找到插入位置`,
      }));
      if (numbers[compareIndex] <= keyNumber) break;
      numbers[compareIndex + 1] = numbers[compareIndex];
      displayValues[compareIndex + 1] = displayValues[compareIndex];
      steps.push(createStep({
        type: ALGORITHM_STEP_TYPES.SHIFT,
        values: displayValues,
        activeIndices: [compareIndex, compareIndex + 1],
        sortedIndices: getSortedPrefixIndices(compareIndex),
        shift: { from: compareIndex, to: compareIndex + 1 },
        keyIndex: index,
        keyValue,
        markers: {
          keyIndex: index,
          emptyIndex: compareIndex,
        },
        animation: createMoveAnimation("shift", [{ from: compareIndex, to: compareIndex + 1 }]),
        message: `${displayValues[compareIndex]} 右移一格`,
      }));
      compareIndex -= 1;
    }
    const insertIndex = compareIndex + 1;
    numbers[insertIndex] = keyNumber;
    displayValues[insertIndex] = keyValue;
    steps.push(createStep({
      type: ALGORITHM_STEP_TYPES.INSERT,
      values: displayValues,
      activeIndices: [insertIndex],
      sortedIndices: getSortedPrefixIndices(index + 1),
      insert: { from: index, to: insertIndex },
      keyValue,
      markers: {
        keyIndex: index,
        emptyIndex: insertIndex,
      },
      animation: createMoveAnimation("insert", [{ from: index, to: insertIndex }]),
      message: `将 ${keyValue} 插入位置 ${insertIndex + 1}`,
    }));
  }

  steps.push(createStep({
    type: ALGORITHM_STEP_TYPES.COMPLETE,
    values: displayValues,
    sortedIndices: displayValues.map((_, index) => index),
    message: "插入排序完成",
  }));

  return {
    ok: true,
    algorithm: ARRAY_ALGORITHMS.INSERTION_SORT,
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
  minIndex = null,
  keyIndex = null,
  keyValue = null,
  shift = null,
  insert = null,
  markers = {},
  animation = null,
  message,
}) {
  return {
    type,
    values: [...values],
    activeIndices: [...activeIndices],
    sortedIndices: [...sortedIndices],
    swapIndices: [...swapIndices],
    minIndex,
    keyIndex,
    keyValue,
    shift,
    insert,
    markers: {
      activeIndices: [...activeIndices],
      sortedIndices: [...sortedIndices],
      ...markers,
    },
    animation,
    message,
  };
}

function createMoveAnimation(type, moves) {
  return {
    type,
    moves: moves.map((move) => ({ from: move.from, to: move.to })),
  };
}

function getSortedSuffixIndices(length, pass) {
  const sortedStart = Math.max(0, length - pass);
  return Array.from({ length: Math.max(0, length - sortedStart) }, (_, offset) => sortedStart + offset);
}

function getSortedPrefixIndices(length) {
  return Array.from({ length: Math.max(0, length) }, (_, index) => index);
}
