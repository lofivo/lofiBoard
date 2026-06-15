import { createId } from "../board/ids.js";
import {
  LINEAR_STRUCTURE_TYPES,
  STRUCTURE_ELEMENT_TYPES,
  STRUCTURE_TYPES,
  normalizeStructureInput,
} from "./types.js";
import {
  clampNumber,
  splitCommaValues,
} from "./shared.js";

export const ARRAY_STRUCTURE_STYLE = Object.freeze({
  cellWidth: 72,
  cellHeight: 44,
  indexFill: "#eef2ff",
  valueFill: "#ffffff",
  highlightFill: "#fef3c7",
  algorithmActiveFill: "#dbeafe",
  algorithmSortedFill: "#dcfce7",
  algorithmEmptyFill: "#f8fafc",
  algorithmMinStroke: "#7c3aed",
  algorithmKeyStroke: "#f59e0b",
  pointerFill: "#2563eb",
  stroke: "#111827",
  textFill: "#111827",
  indexTextFill: "#475569",
});

export const ARRAY_RANDOM_INIT_LIMITS = Object.freeze({
  defaultCount: 5,
  minCount: 1,
  maxCount: 64,
  minValue: 0,
  maxValue: 99,
});

export function parseArrayInput(input) {
  const trimmedInput = String(input ?? "").trim();
  if (trimmedInput.length >= 2 && trimmedInput.startsWith('"') && trimmedInput.endsWith('"')) {
    return Array.from(trimmedInput.slice(1, -1)).map((value) => value || " ");
  }
  return splitCommaValues(input).map((value) => value || " ");
}

export function normalizeRandomArrayCount(count) {
  const numericCount = Number.parseInt(String(count ?? ""), 10);
  const countOrDefault = Number.isFinite(numericCount) ? numericCount : ARRAY_RANDOM_INIT_LIMITS.defaultCount;
  return clampNumber(countOrDefault, ARRAY_RANDOM_INIT_LIMITS.minCount, ARRAY_RANDOM_INIT_LIMITS.maxCount);
}

export function createRandomArrayValues(count, {
  random = Math.random,
  minValue = ARRAY_RANDOM_INIT_LIMITS.minValue,
  maxValue = ARRAY_RANDOM_INIT_LIMITS.maxValue,
} = {}) {
  const safeCount = normalizeRandomArrayCount(count);
  const min = Math.ceil(Number(minValue));
  const max = Math.floor(Number(maxValue));
  const low = Math.min(min, max);
  const high = Math.max(min, max);
  const span = high - low + 1;
  return Array.from({ length: safeCount }, () => {
    const ratio = clampNumber(Number(random()), 0, 0.999999999999);
    return String(low + Math.floor(ratio * span));
  });
}

export function isLinearStructureElement(elementOrType) {
  const type = typeof elementOrType === "string" ? elementOrType : elementOrType?.type;
  return LINEAR_STRUCTURE_TYPES.includes(type);
}

export function isLinearStructureType(type) {
  return LINEAR_STRUCTURE_TYPES.includes(getLinearElementType(type));
}

export function insertArrayItem(element, index = element?.items?.length ?? 0, value = "") {
  if (!isLinearStructureElement(element)) return element;
  const items = [...(element.items ?? [])];
  const safeIndex = Math.min(items.length, Math.max(0, Number(index) || 0));
  items.splice(safeIndex, 0, {
    id: createId("item"),
    index: safeIndex,
    value: String(value),
  });
  return normalizeArrayStructureItems({
    ...element,
    items,
  });
}

export function deleteArrayItem(element, index = (element?.items?.length ?? 1) - 1) {
  if (!isLinearStructureElement(element)) return element;
  const items = [...(element.items ?? [])];
  if (items.length === 0) return element;
  const safeIndex = Math.min(items.length - 1, Math.max(0, Number(index) || 0));
  items.splice(safeIndex, 1);
  return normalizeArrayStructureItems({
    ...element,
    items,
  });
}

export function updateArrayItemValue(element, index = 0, value = "") {
  if (!isLinearStructureElement(element)) return element;
  const items = [...(element.items ?? [])];
  if (items.length === 0) return element;
  const safeIndex = clampIndex(index, items.length - 1);
  items[safeIndex] = {
    ...items[safeIndex],
    value: String(value ?? ""),
  };
  return normalizeArrayStructureItems({
    ...element,
    items,
  });
}

export function swapArrayItems(element, firstIndex = 0, secondIndex = 1) {
  if (!isLinearStructureElement(element)) return element;
  const items = [...(element.items ?? [])];
  if (items.length < 2) return element;
  const first = clampIndex(firstIndex, items.length - 1);
  const second = clampIndex(secondIndex, items.length - 1);
  if (first === second) return element;
  [items[first], items[second]] = [items[second], items[first]];
  return normalizeArrayStructureItems({
    ...element,
    items,
  });
}

export function moveArrayItem(element, fromIndex = 0, toIndex = 0) {
  if (!isLinearStructureElement(element)) return element;
  const items = [...(element.items ?? [])];
  if (items.length < 2) return element;
  const from = clampIndex(fromIndex, items.length - 1);
  const to = clampIndex(toIndex, items.length - 1);
  if (from === to) return element;
  const [item] = items.splice(from, 1);
  items.splice(to, 0, item);
  return normalizeArrayStructureItems({
    ...element,
    items,
  });
}

export function updateArrayValues(element, input) {
  if (!isLinearStructureElement(element)) return element;
  const values = parseArrayInput(normalizeStructureInput(STRUCTURE_TYPES.ARRAY, input));
  return normalizeArrayStructureItems({
    ...element,
    items: values.map((value, index) => ({
      id: element.items?.[index]?.id ?? createId("item"),
      index,
      value,
    })),
  });
}

export function setArrayHighlight(element, { start = 0, end = start, pointer = start, showPointer = element?.markers?.showPointer ?? true } = {}) {
  if (!isLinearStructureElement(element)) return element;
  const length = element.items?.length ?? 0;
  if (length === 0) {
    return {
      ...element,
      markers: { highlight: [], pointer: null, showPointer: Boolean(showPointer) },
    };
  }
  const safeStart = clampIndex(start, length - 1);
  const safeEnd = clampIndex(end, length - 1);
  const min = Math.min(safeStart, safeEnd);
  const max = Math.max(safeStart, safeEnd);
  return {
    ...element,
    markers: {
      ...(element.markers ?? {}),
      highlight: Array.from({ length: max - min + 1 }, (_, offset) => min + offset),
      pointer: pointer === null || pointer === undefined ? null : clampIndex(pointer, length - 1),
      showPointer: Boolean(showPointer),
    },
  };
}

export function setArrayPointer(element, pointer = 0) {
  if (!isLinearStructureElement(element)) return element;
  const length = element.items?.length ?? 0;
  if (length === 0) {
    return {
      ...element,
      markers: { ...(element.markers ?? {}), pointer: null },
    };
  }
  return {
    ...element,
    markers: {
      ...(element.markers ?? {}),
      pointer: pointer === null || pointer === undefined ? null : clampIndex(pointer, length - 1),
    },
  };
}

export function setArrayPointerVisibility(element, showPointer = true) {
  if (!isLinearStructureElement(element)) return element;
  const length = element.items?.length ?? 0;
  const currentPointer = Number.isInteger(element.markers?.pointer)
    ? clampIndex(element.markers.pointer, Math.max(0, length - 1))
    : 0;
  return {
    ...element,
    markers: {
      ...(element.markers ?? {}),
      pointer: length > 0 ? currentPointer : null,
      showPointer: Boolean(showPointer),
    },
  };
}

export function clearArrayHighlight(element) {
  if (!isLinearStructureElement(element)) return element;
  return {
    ...element,
    markers: { highlight: [], pointer: null },
  };
}

export function setArrayAlgorithmMarkers(element, {
  activeIndices = [],
  sortedIndices = [],
  pendingSwapIndices = [],
  minIndex = null,
  keyIndex = null,
  emptyIndex = null,
  floatingKey = null,
  pointer = null,
  showPointer = true,
} = {}) {
  if (!isLinearStructureElement(element)) return element;
  const length = element.items?.length ?? 0;
  return {
    ...element,
    markers: {
      ...(element.markers ?? {}),
      algorithm: {
        activeIndices: normalizeIndexList(activeIndices, length),
        sortedIndices: normalizeIndexList(sortedIndices, length),
        pendingSwapIndices: normalizeIndexList(pendingSwapIndices, length),
        minIndex: normalizeOptionalIndex(minIndex, length),
        keyIndex: normalizeOptionalIndex(keyIndex, length),
        emptyIndex: normalizeOptionalIndex(emptyIndex, length),
        floatingKey: normalizeFloatingKey(floatingKey, length),
      },
      pointer: Number.isInteger(pointer) && length > 0 ? clampIndex(pointer, length - 1) : null,
      showPointer: Boolean(showPointer),
    },
  };
}

export function clearArrayAlgorithmMarkers(element) {
  if (!isLinearStructureElement(element)) return element;
  const { algorithm, ...markers } = element.markers ?? {};
  return {
    ...element,
    markers,
  };
}

export function setLinearIndexOptions(element, { indexBase = element?.settings?.indexBase ?? 0, showIndexes = element?.settings?.showIndexes ?? true } = {}) {
  if (!isLinearStructureElement(element)) return element;
  const style = { ...ARRAY_STRUCTURE_STYLE, ...(element.style ?? {}) };
  const nextShowIndexes = showIndexes !== undefined ? Boolean(showIndexes)
    : (element.settings?.showIndexes ?? element.type === STRUCTURE_ELEMENT_TYPES.ARRAY);
  return {
    ...element,
    height: style.cellHeight * (nextShowIndexes ? 2 : 1),
    settings: {
      ...(element.settings ?? {}),
      indexBase: Number(indexBase) === 1 ? 1 : 0,
      showIndexes: nextShowIndexes,
    },
  };
}

export function getLinearStructureLocalPoint(element, worldPoint, renderedNode = null) {
  const renderedX = Number(renderedNode?.x?.());
  const renderedY = Number(renderedNode?.y?.());
  const renderedScaleX = Number(renderedNode?.scaleX?.());
  const renderedScaleY = Number(renderedNode?.scaleY?.());
  const originX = Number.isFinite(renderedX) ? renderedX : Number(element?.x) || 0;
  const originY = Number.isFinite(renderedY) ? renderedY : Number(element?.y) || 0;
  const scaleX = getSafeLinearScale(Number.isFinite(renderedScaleX) ? renderedScaleX : element?.scaleX);
  const scaleY = getSafeLinearScale(Number.isFinite(renderedScaleY) ? renderedScaleY : element?.scaleY);
  return {
    x: (Number(worldPoint?.x) - originX) / scaleX,
    y: (Number(worldPoint?.y) - originY) / scaleY,
  };
}

function getSafeLinearScale(scale) {
  const value = Number(scale);
  return Number.isFinite(value) && value !== 0 ? value : 1;
}

export function clampLinearItemDropGap(gap, length) {
  return Math.min(Math.max(0, Number(length) || 0), Math.max(0, Number(gap) || 0));
}

export function getLinearItemPreviewGap({ localX = 0, length = 0, cellWidth = ARRAY_STRUCTURE_STYLE.cellWidth } = {}) {
  const safeCellWidth = Math.max(1, Number(cellWidth) || ARRAY_STRUCTURE_STYLE.cellWidth);
  const paddedX = Number(localX) + safeCellWidth * 0.35;
  return clampLinearItemDropGap(Math.floor(paddedX / safeCellWidth), length);
}

export function getLinearItemDropIndex(fromIndex, previewGap, length) {
  const safeFrom = clampIndex(fromIndex, Math.max(0, (Number(length) || 0) - 1));
  const safeGap = clampLinearItemDropGap(previewGap, length);
  return safeGap > safeFrom ? safeGap - 1 : safeGap;
}

export function createLinearStructureElement(type, values, point, zIndex) {
  const elementType = getLinearElementType(type);
  const cellWidth = ARRAY_STRUCTURE_STYLE.cellWidth;
  const cellHeight = ARRAY_STRUCTURE_STYLE.cellHeight;
  const settings = getLinearStructureSettings(elementType);
  const width = Math.max(cellWidth, values.length * cellWidth);
  const height = cellHeight * (settings.showIndexes ? 2 : 1);
  return {
    id: createId(getLinearIdPrefix(elementType)),
    type: elementType,
    x: point.x - width / 2,
    y: point.y - height / 2,
    width,
    height,
    items: values.map((value, index) => ({
      id: createId("item"),
      index,
      value: String(value),
    })),
    settings,
    style: { ...ARRAY_STRUCTURE_STYLE },
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    zIndex,
  };
}

function clampIndex(index, maxIndex) {
  return Math.min(maxIndex, Math.max(0, Number(index) || 0));
}

function normalizeIndexList(indices, length) {
  if (!Array.isArray(indices) || length <= 0) return [];
  return [...new Set(indices
    .map((index) => Number.parseInt(String(index), 10))
    .filter((index) => Number.isInteger(index) && index >= 0 && index < length))];
}

function normalizeOptionalIndex(index, length) {
  const numericIndex = Number.parseInt(String(index), 10);
  return Number.isInteger(numericIndex) && numericIndex >= 0 && numericIndex < length ? numericIndex : null;
}

function normalizeFloatingKey(floatingKey, length) {
  if (!floatingKey || length <= 0) return null;
  const sourceIndex = normalizeOptionalIndex(floatingKey.sourceIndex, length);
  const currentIndex = normalizeOptionalIndex(floatingKey.currentIndex, length);
  if (sourceIndex === null || currentIndex === null) return null;
  return {
    sourceIndex,
    currentIndex,
    value: String(floatingKey.value ?? ""),
  };
}

function normalizeArrayStructureItems(element) {
  const style = { ...ARRAY_STRUCTURE_STYLE, ...(element.style ?? {}) };
  const nextItems = (element.items ?? []).map((item, index) => ({
    ...item,
    id: item.id ?? createId("item"),
    index,
    value: String(item.value ?? ""),
  }));
  const previousWidth = Number(element.width) || style.cellWidth;
  const nextWidth = Math.max(style.cellWidth, nextItems.length * style.cellWidth);
  const showIndexes = element.settings?.showIndexes ?? element.type === STRUCTURE_ELEMENT_TYPES.ARRAY;
  return {
    ...element,
    x: (Number(element.x) || 0) - (nextWidth - previousWidth) / 2,
    width: nextWidth,
    height: style.cellHeight * (showIndexes ? 2 : 1),
    items: nextItems,
    settings: getLinearStructureSettings(element.type, element.settings),
    style,
  };
}

function getLinearElementType(type) {
  return {
    [STRUCTURE_TYPES.ARRAY]: STRUCTURE_ELEMENT_TYPES.ARRAY,
    [STRUCTURE_TYPES.STACK]: STRUCTURE_ELEMENT_TYPES.STACK,
    [STRUCTURE_TYPES.QUEUE]: STRUCTURE_ELEMENT_TYPES.QUEUE,
    [STRUCTURE_TYPES.DEQUE]: STRUCTURE_ELEMENT_TYPES.DEQUE,
  }[type] ?? STRUCTURE_ELEMENT_TYPES.ARRAY;
}

function getLinearIdPrefix(type) {
  return {
    [STRUCTURE_ELEMENT_TYPES.ARRAY]: "array",
    [STRUCTURE_ELEMENT_TYPES.STACK]: "stack",
    [STRUCTURE_ELEMENT_TYPES.QUEUE]: "queue",
    [STRUCTURE_ELEMENT_TYPES.DEQUE]: "deque",
  }[type] ?? "linear";
}

function getLinearStructureSettings(type, settings = {}) {
  const isArray = type === STRUCTURE_ELEMENT_TYPES.ARRAY;
  return {
    indexBase: Number(settings.indexBase) === 1 ? 1 : 0,
    showIndexes: settings.showIndexes ?? isArray,
  };
}
