import { describe, expect, it, vi } from "vitest";
import {
  LINEAR_STRUCTURE_EVENT_TYPES,
  createLinearStructureEventAdapter,
} from "../../src/structures/event-adapter.js";

describe("structure event adapter", () => {
  it("maps linear structure Konva payloads to structure events", () => {
    const dispatch = vi.fn();
    const adapter = createLinearStructureEventAdapter(dispatch);

    adapter.onArrayItemSelect({ elementId: "array_1", index: 2, value: "C" });
    adapter.onArrayItemPress({ elementId: "array_1", index: 1, value: "B" });
    adapter.onArrayItemRelease({ elementId: "array_1", index: 1 });

    expect(dispatch).toHaveBeenNthCalledWith(1, {
      type: LINEAR_STRUCTURE_EVENT_TYPES.ITEM_SELECT,
      elementId: "array_1",
      index: 2,
      value: "C",
    });
    expect(dispatch).toHaveBeenNthCalledWith(2, {
      type: LINEAR_STRUCTURE_EVENT_TYPES.ITEM_PRESS,
      elementId: "array_1",
      index: 1,
      value: "B",
    });
    expect(dispatch).toHaveBeenNthCalledWith(3, {
      type: LINEAR_STRUCTURE_EVENT_TYPES.ITEM_RELEASE,
      elementId: "array_1",
      index: 1,
    });
  });
});
