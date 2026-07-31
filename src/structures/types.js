export const STRUCTURE_TYPES = {
  ARRAY: "array",
  MATRIX: "matrix",
  STACK: "stack",
  QUEUE: "queue",
  DEQUE: "deque",
  GRAPH: "graph",
  TREE: "tree",
  BINARY_TREE: "binary-tree",
};

export const STRUCTURE_ELEMENT_TYPES = {
  ARRAY: "array-structure",
  MATRIX: "matrix-structure",
  STACK: "stack-structure",
  QUEUE: "queue-structure",
  DEQUE: "deque-structure",
  GRAPH: "graph-structure",
  TREE: "tree-structure",
};

export const LINEAR_STRUCTURE_TYPES = [
  STRUCTURE_ELEMENT_TYPES.ARRAY,
  STRUCTURE_ELEMENT_TYPES.STACK,
  STRUCTURE_ELEMENT_TYPES.QUEUE,
  STRUCTURE_ELEMENT_TYPES.DEQUE,
];

export const STRUCTURE_ITEMS = [
  {
    id: STRUCTURE_TYPES.ARRAY,
    label: "数组",
    defaultInput: "1,2,3,4,5",
    placeholder: "1,2,3,4,5",
  },
  {
    id: STRUCTURE_TYPES.MATRIX,
    label: "二维数组",
    defaultInput: "1,2,3\n4,5,6\n7,8,9",
    placeholder: "1,2,3\n4,5,6\n7,8,9",
  },
  {
    id: STRUCTURE_TYPES.STACK,
    label: "栈",
    defaultInput: "1,2,3",
    placeholder: "1,2,3",
  },
  {
    id: STRUCTURE_TYPES.QUEUE,
    label: "队列",
    defaultInput: "1,2,3",
    placeholder: "1,2,3",
  },
  {
    id: STRUCTURE_TYPES.DEQUE,
    label: "双端队列",
    defaultInput: "1,2,3",
    placeholder: "1,2,3",
  },
  {
    id: STRUCTURE_TYPES.GRAPH,
    label: "图",
    defaultInput: "A->B, A->C, B->D, C->D",
    placeholder: "A->B, A-C, B->D",
  },
  {
    id: STRUCTURE_TYPES.TREE,
    label: "树",
    defaultInput: "1->2, 1->3, 2->4, 2->5",
    placeholder: "1->2, 1->3, 2->4",
  },
  {
    id: STRUCTURE_TYPES.BINARY_TREE,
    label: "二叉树",
    defaultInput: "1->2, 1->3, 2->4, 2->5, 3->6, 3->7",
    placeholder: "1->2, 1->3, 2->4",
  },
];

export function getStructureItem(type) {
  return STRUCTURE_ITEMS.find((item) => item.id === type) ?? STRUCTURE_ITEMS[0];
}

export function getStructureInspectorPresetInput(type) {
  const input = getStructureItem(type).defaultInput;
  if (![STRUCTURE_TYPES.GRAPH, STRUCTURE_TYPES.TREE, STRUCTURE_TYPES.BINARY_TREE].includes(type)) {
    return input;
  }
  return input.split(',').map((value) => value.trim()).filter(Boolean).join('\n');
}

export function normalizeStructureInput(type, input) {
  const value = String(input ?? "").trim();
  return value || getStructureItem(type).defaultInput;
}
