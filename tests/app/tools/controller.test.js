import { describe, expect, it } from "vitest";
import { createToolController, getToolStatus } from "../../../src/app/tools/controller.js";
import { DEFAULT_SHAPE_TOOL, TOOLS } from "../../../src/ui/config.js";

describe("app tools controller", () => {
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

  it("toggles whether placement keeps the current tool active", () => {
    const controller = createToolController({
      initialTool: TOOLS.SHAPE,
      initialShapeTool: DEFAULT_SHAPE_TOOL,
    });

    expect(controller.keepToolActive).toBe(false);
    expect(controller.toggleKeepToolActive()).toBe(true);
    expect(controller.keepToolActive).toBe(true);
    expect(controller.toggleKeepToolActive()).toBe(false);
  });

  it("returns user-facing status text for each tool", () => {
    expect(getToolStatus(TOOLS.SELECT)).toBe("选择：单击单选，Shift 范围多选，Ctrl 切换多选");
    expect(getToolStatus(TOOLS.PEN)).toBe("画笔：拖动画出可编辑笔触");
    expect(getToolStatus(TOOLS.SHAPE)).toBe("图形：拖动创建所选图形");
    expect(getToolStatus(TOOLS.ARROW)).toBe("箭头：拖动创建");
  });
});
