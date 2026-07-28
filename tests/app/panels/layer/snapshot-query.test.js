import { describe, expect, it, vi } from "vitest";
import { createLayerSnapshotQuery } from "../../../../src/app/panels/layer/snapshot-query.js";

describe("layer snapshot query", () => {
  it("reuses the snapshot until the elements array changes", () => {
    const reorderElements = vi.fn((elements) => [...elements].sort((a, b) => a.zIndex - b.zIndex));
    const getElementLabel = vi.fn((element) => element.name);
    const query = createLayerSnapshotQuery({ reorderElements, getElementLabel });
    const elements = [
      { id: "top", type: "rect", name: "Top", zIndex: 1 },
      { id: "bottom", type: "text", name: "Bottom", zIndex: 0 },
    ];

    const first = query.getSnapshot(elements);
    const second = query.getSnapshot(elements);

    expect(second).toBe(first);
    expect(reorderElements).toHaveBeenCalledTimes(1);
    expect(getElementLabel).toHaveBeenCalledTimes(2);
  });

  it("rebuilds the snapshot when the elements array is replaced", () => {
    const reorderElements = vi.fn((elements) => elements);
    const query = createLayerSnapshotQuery({ reorderElements, getElementLabel: (element) => element.id });
    const elements = [{ id: "a", type: "rect", zIndex: 0 }];

    const first = query.getSnapshot(elements);
    const second = query.getSnapshot([...elements, { id: "b", type: "text", zIndex: 1 }]);

    expect(second).not.toBe(first);
    expect(second.map(({ id }) => id)).toEqual(["b", "a"]);
    expect(reorderElements).toHaveBeenCalledTimes(2);
  });
});
