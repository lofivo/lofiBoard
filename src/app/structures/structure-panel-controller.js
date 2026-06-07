import {
  STRUCTURE_TYPES,
  getStructureItem,
} from "../../structures/structure-templates.js";

const RANDOM_INIT_STRUCTURE_TYPES = new Set([
  STRUCTURE_TYPES.ARRAY,
  STRUCTURE_TYPES.STACK,
  STRUCTURE_TYPES.QUEUE,
  STRUCTURE_TYPES.DEQUE,
  STRUCTURE_TYPES.TREE,
  STRUCTURE_TYPES.BINARY_TREE,
]);

export function createStructurePanelController({
  initialStructureType = STRUCTURE_TYPES.ARRAY,
  initialArrayInitMode = "manual",
} = {}) {
  let activeStructureType = getStructureItem(initialStructureType).id;
  let activeArrayInitMode = initialArrayInitMode;

  function getActiveStructureType() {
    return activeStructureType;
  }

  function getActiveStructureItem() {
    return getStructureItem(activeStructureType);
  }

  function setActiveStructureType(type) {
    activeStructureType = getStructureItem(type).id;
    return activeStructureType;
  }

  function getActiveArrayInitMode() {
    return activeArrayInitMode;
  }

  function setActiveArrayInitMode(mode) {
    activeArrayInitMode = mode === "random" ? "random" : "manual";
    return activeArrayInitMode;
  }

  function isRandomStructureInitSupported(type = activeStructureType) {
    return RANDOM_INIT_STRUCTURE_TYPES.has(type);
  }

  function getHydrateState() {
    const item = getActiveStructureItem();
    const activeTypeSupportsRandom = isRandomStructureInitSupported(activeStructureType);
    return {
      item,
      activeStructureType,
      activeArrayInitMode,
      activeTypeSupportsRandom,
      showLinearInitPanel: activeTypeSupportsRandom,
      showStructureInputLabel: !(activeTypeSupportsRandom && activeArrayInitMode === "random"),
      showArrayRandomFields: activeTypeSupportsRandom && activeArrayInitMode === "random",
    };
  }

  return {
    getActiveStructureType,
    getActiveStructureItem,
    setActiveStructureType,
    getActiveArrayInitMode,
    setActiveArrayInitMode,
    isRandomStructureInitSupported,
    getHydrateState,
  };
}
