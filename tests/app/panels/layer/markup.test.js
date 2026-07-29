import { describe, expect, it } from "vitest";
import { getElementLabel, renderLayerItemsMarkup } from "../../../../src/app/panels/layer/markup.js";

describe("app panels layer markup", () => {
  it("builds readable labels for common element types", () => {
    expect(getElementLabel({ type: "stroke" })).toBe("笔触");
    expect(getElementLabel({ type: "text", text: "一段很长的文字内容" })).toBe("文字：一段很长的文字内容");
    expect(getElementLabel({ type: "array-structure", items: [{}, {}, {}] })).toBe("数组：3 项");
    expect(getElementLabel({ type: "matrix-structure", rows: 2, columns: 3 })).toBe("二维数组：2 x 3");
    expect(getElementLabel({ type: "graph-structure", nodes: [{}, {}], edges: [{}] })).toBe("图：2 点 1 边");
  });

  it("renders ordered layer items with escaped labels and level markers", () => {
    const markup = renderLayerItemsMarkup({
      elements: [
        { id: "text_1", type: "text", text: "<hello>", zIndex: 0 },
        { id: "rect_1", type: "rect", locked: true, groupId: "group_1", zIndex: 1 },
      ],
      selectedIds: ["text_1"],
    });

    expect(markup).toContain('data-layer-id="rect_1"');
    expect(markup).toContain('data-layer-level="1"');
    expect(markup).toContain("锁定 · 分组");
    expect(markup).toContain('class="layer-item active"');
    expect(markup).toContain("文字：&lt;hello&gt;");
    expect(markup.indexOf('data-layer-id="rect_1"')).toBeLessThan(markup.indexOf('data-layer-id="text_1"'));
  });
});
