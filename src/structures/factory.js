import { STRUCTURE_TYPES, normalizeStructureInput } from "./types.js";
import {
  createLinearStructureElement,
  createRandomArrayValues,
  isLinearStructureType,
  parseArrayInput,
} from "./linear-structure.js";
import {
  createGraphStructureElement,
  parseGraphInput,
} from "./graph-structure.js";
import {
  createCompleteTreeInput,
  createTreeStructureElement,
  parseTreeInput,
} from "./tree-structure.js";
import {
  createMatrixStructureElement,
  parseMatrixInput,
} from "./matrix-structure.js";

export function createStructureElements({ type, input, point, zIndexStart = 0, initMode = "manual", randomCount, random } = {}) {
  const normalizedInput = normalizeStructureInput(type, input);
  const linearValues = isLinearStructureType(type) && initMode === "random"
    ? createRandomArrayValues(randomCount, { random })
    : parseArrayInput(normalizedInput);
  const element = type === STRUCTURE_TYPES.GRAPH
    ? createGraphStructureElement(parseGraphInput(normalizedInput), point, zIndexStart)
    : type === STRUCTURE_TYPES.TREE
      ? createTreeStructureElement(
        parseTreeInput(initMode === "random" ? createCompleteTreeInput(randomCount) : normalizedInput),
        point,
        zIndexStart,
        { treeKind: "general" },
      )
      : type === STRUCTURE_TYPES.BINARY_TREE
        ? createTreeStructureElement(
          parseTreeInput(initMode === "random" ? createCompleteTreeInput(randomCount) : normalizedInput),
          point,
          zIndexStart,
          { treeKind: "binary" },
        )
      : type === STRUCTURE_TYPES.MATRIX
        ? createMatrixStructureElement(parseMatrixInput(normalizedInput), point, zIndexStart)
        : createLinearStructureElement(type, linearValues, point, zIndexStart);
  return [element];
}
