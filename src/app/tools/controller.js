export function createToolController({
  initialTool,
  initialShapeTool,
  initialKeepToolActive = false,
}) {
  let currentTool = initialTool;
  let activeShapeTool = initialShapeTool;
  let keepToolActive = initialKeepToolActive;

  function setTool(tool) {
    const previousTool = currentTool;
    const toolChanged = currentTool !== tool;
    currentTool = tool;
    return {
      previousTool,
      tool,
      toolChanged,
    };
  }

  function setActiveShapeTool(shapeTool) {
    activeShapeTool = shapeTool;
    return activeShapeTool;
  }

  function toggleKeepToolActive() {
    keepToolActive = !keepToolActive;
    return keepToolActive;
  }

  return {
    get currentTool() { return currentTool; },
    get activeShapeTool() { return activeShapeTool; },
    get keepToolActive() { return keepToolActive; },
    setTool,
    setActiveShapeTool,
    toggleKeepToolActive,
  };
}

export function getToolStatus(tool) {
  return {
    select: "选择：单击单选，Shift 范围多选，Ctrl 切换多选",
    pan: "平移：拖动画布",
    pen: "画笔：拖动画出可编辑笔触",
    "eraser-stroke": "片段橡皮：擦除笔触的一部分",
    "eraser-object": "对象橡皮：碰到对象即删除",
    text: "文字：点击画布添加文字",
    sticky: "便签：点击画布添加便签",
    structure: "结构：选择数组、图或树并填写初始内容",
    shape: "图形：拖动创建所选图形",
    rect: "矩形：拖动创建",
    ellipse: "椭圆：拖动创建",
    line: "直线：拖动创建",
    arrow: "箭头：拖动创建",
  }[tool];
}
