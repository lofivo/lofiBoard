import { describe, expect, it } from "vitest";
import {
  createSelectionController,
  expandGroupedIds,
} from "../../src/app/selection-controller.js";

describe("selection-controller", () => {
  it("deduplicates selected ids while preserving first-seen order", () => {
    const controller = createSelectionController();

    expect(controller.setSelectedIds(["a", "b", "a", "c", "b"])).toEqual(["a", "b", "c"]);
    expect(controller.getSelectedIds()).toEqual(["a", "b", "c"]);
  });

  it("selects a single element and expands its group membership", () => {
    const controller = createSelectionController({ initialSelectedIds: ["old"] });
    const elements = [
      { id: "a", groupId: "g1" },
      { id: "b", groupId: "g1" },
      { id: "c" },
    ];

    expect(controller.selectElementById("a", { elements })).toEqual(["a", "b"]);
  });

  it("toggles grouped selection when additive selection is enabled", () => {
    const elements = [
      { id: "a", groupId: "g1" },
      { id: "b", groupId: "g1" },
      { id: "c" },
    ];
    const controller = createSelectionController({ initialSelectedIds: ["c"] });

    expect(controller.selectElementById("a", { additive: true, elements })).toEqual(["c", "a", "b"]);
    expect(controller.selectElementById("b", { additive: true, elements })).toEqual(["c"]);
  });

  it("toggles a single id without needing board elements", () => {
    const controller = createSelectionController({ initialSelectedIds: ["a"] });

    expect(controller.toggleSelection("a")).toEqual([]);
    expect(controller.toggleSelection("b")).toEqual(["b"]);
  });

  it("expands requested ids to include every element in the same group", () => {
    const elements = [
      { id: "a", groupId: "g1" },
      { id: "b", groupId: "g1" },
      { id: "c", groupId: "g2" },
      { id: "d" },
    ];

    expect(expandGroupedIds(["b"], elements)).toEqual(["a", "b"]);
    expect(expandGroupedIds(["d"], elements)).toEqual(["d"]);
  });
});
