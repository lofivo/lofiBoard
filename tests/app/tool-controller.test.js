import { describe, expect, it } from "vitest";
import { createToolController, getToolStatus } from "../../src/app/tool-controller.js";
import { DEFAULT_SHAPE_TOOL, TOOLS } from "../../src/ui/ui-config.js";

describe("tool-controller", () => {
  it("tracks current tool transitions with previous tool metadata", () => {
    const controller = createToolController({
      initialTool: TOOLS.PEN,
      initialShapeTool: DEFAULT_SHAPE_TOOL,
    });

    expect(controller.currentTool).toBe(TOOLS.PEN);

    expect(controller.setTool(TOOLS.SELECT)).toEqual({
      previousTool: TOOLS.PEN,
      tool: TOOLS.SELECT,
      toolChanged: true,
    });
    expect(controller.currentTool).toBe(TOOLS.SELECT);

    expect(controller.setTool(TOOLS.SELECT)).toEqual({
      previousTool: TOOLS.SELECT,
      tool: TOOLS.SELECT,
      toolChanged: false,
    });
  });

  it("tracks the active shape tool separately from the current toolbar tool", () => {
    const controller = createToolController({
      initialTool: TOOLS.SHAPE,
      initialShapeTool: DEFAULT_SHAPE_TOOL,
    });

    controller.setActiveShapeTool(TOOLS.ARROW);

    expect(controller.currentTool).toBe(TOOLS.SHAPE);
    expect(controller.activeShapeTool).toBe(TOOLS.ARROW);
  });

  it("returns user-facing status text for each tool", () => {
    expect(getToolStatus(TOOLS.SELECT)).toBe("选择：拖动框选，Shift 多选，Delete 删除");
    expect(getToolStatus(TOOLS.PEN)).toBe("画笔：拖动画出可编辑笔触");
    expect(getToolStatus(TOOLS.ARROW)).toBe("箭头：拖动创建");
  });
});
