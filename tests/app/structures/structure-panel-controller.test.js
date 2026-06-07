import { describe, expect, it } from "vitest";
import { createStructurePanelController } from "../../../src/app/structures/structure-panel-controller.js";
import { STRUCTURE_TYPES } from "../../../src/structures/structure-templates.js";

describe("structure-panel-controller", () => {
  it("tracks active structure type and exposes the selected item", () => {
    const controller = createStructurePanelController();

    expect(controller.getActiveStructureType()).toBe(STRUCTURE_TYPES.ARRAY);
    expect(controller.setActiveStructureType(STRUCTURE_TYPES.BINARY_TREE)).toBe(STRUCTURE_TYPES.BINARY_TREE);
    expect(controller.getActiveStructureItem().id).toBe(STRUCTURE_TYPES.BINARY_TREE);
  });

  it("supports random initialization for linear structures and tree structures", () => {
    const controller = createStructurePanelController();

    expect(controller.isRandomStructureInitSupported(STRUCTURE_TYPES.ARRAY)).toBe(true);
    expect(controller.isRandomStructureInitSupported(STRUCTURE_TYPES.TREE)).toBe(true);
    expect(controller.isRandomStructureInitSupported(STRUCTURE_TYPES.BINARY_TREE)).toBe(true);
    expect(controller.isRandomStructureInitSupported(STRUCTURE_TYPES.GRAPH)).toBe(false);
  });

  it("returns hydrate state for manual and random init modes", () => {
    const controller = createStructurePanelController();

    expect(controller.getHydrateState()).toMatchObject({
      activeTypeSupportsRandom: true,
      showStructureInputLabel: true,
      showArrayRandomFields: false,
    });

    controller.setActiveArrayInitMode("random");

    expect(controller.getHydrateState()).toMatchObject({
      activeTypeSupportsRandom: true,
      showStructureInputLabel: false,
      showArrayRandomFields: true,
    });
  });
});
