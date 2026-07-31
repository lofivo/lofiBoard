import { all, create } from "mathjs";

const math = create(all);
const parseExpression = math.parse;
const MAX_EXPRESSION_LENGTH = 240;
const SAFE_SYMBOLS = new Set([
  "x", "pi", "e", "tau", "phi",
  "sin", "cos", "tan", "asin", "acos", "atan", "atan2",
  "sinh", "cosh", "tanh", "sqrt", "cbrt", "abs", "sign",
  "log", "ln", "log10", "exp", "pow", "floor", "ceil", "round",
  "min", "max", "mod",
]);

// 用户输入只用于浏览器内绘图。关闭会改变解析器或执行任意表达式的入口，
// 并拒绝赋值/访问器等非函数表达式，避免把数学输入当成脚本执行。
math.import({
  import: () => { throw new Error("import is disabled"); },
  createUnit: () => { throw new Error("createUnit is disabled"); },
  reviver: () => { throw new Error("reviver is disabled"); },
  evaluate: () => { throw new Error("evaluate is disabled"); },
  parse: () => { throw new Error("parse is disabled"); },
  simplify: () => { throw new Error("simplify is disabled"); },
  derivative: () => { throw new Error("derivative is disabled"); },
  resolve: () => { throw new Error("resolve is disabled"); },
}, { override: true, silent: true });

function stripFunctionPrefix(expression) {
  return expression
    .replace(/^\s*(?:y|f\s*\(\s*x\s*\))\s*=\s*/i, "")
    .trim();
}

function validateExpressionTree(node) {
  let valid = true;
  node.traverse((child) => {
    if (!valid) return;
    if (["AssignmentNode", "FunctionAssignmentNode", "AccessorNode", "RangeNode", "ObjectNode", "ArrayNode"].includes(child.type)) {
      valid = false;
      return;
    }
    if (child.type === "SymbolNode" && !SAFE_SYMBOLS.has(child.name)) {
      valid = false;
    }
  });
  return valid;
}

export function normalizeCoordinateFunctions(value) {
  const source = Array.isArray(value) ? value : String(value ?? "").split(/[\n;]/);
  return source
    .map((item) => stripFunctionPrefix(String(item ?? "")))
    .filter(Boolean)
    .map((item) => item.slice(0, MAX_EXPRESSION_LENGTH))
    .slice(0, 8);
}

export function compileCoordinateFunction(expression) {
  const normalized = stripFunctionPrefix(String(expression ?? ""));
  if (!normalized || normalized.length > MAX_EXPRESSION_LENGTH) return null;
  try {
    const node = parseExpression(normalized);
    if (!validateExpressionTree(node)) return null;
    const code = node.compile();
    return (x) => {
      try {
        const result = code.evaluate({ x });
        const value = typeof result === "number" ? result : Number(result);
        return Number.isFinite(value) ? value : null;
      } catch {
        return null;
      }
    };
  } catch {
    return null;
  }
}

export function sampleCoordinateFunction(expression, {
  width,
  height,
  unitSize,
  origin,
  step = 2,
} = {}) {
  const evaluate = compileCoordinateFunction(expression);
  const canvasWidth = Math.max(1, Number(width) || 1);
  const canvasHeight = Math.max(1, Number(height) || 1);
  const spacing = Math.max(8, Number(unitSize) || 40);
  const originX = Number.isFinite(origin?.x) ? origin.x : canvasWidth / 2;
  const originY = Number.isFinite(origin?.y) ? origin.y : canvasHeight / 2;
  if (!evaluate) return [];

  const segments = [];
  let points = [];
  let previous = null;
  const flush = () => {
    if (points.length >= 4) segments.push(points);
    points = [];
  };

  for (let pixelX = 0; pixelX <= canvasWidth; pixelX += Math.max(1, Number(step) || 2)) {
    const logicalX = (pixelX - originX) / spacing;
    const logicalY = evaluate(logicalX);
    const pixelY = logicalY === null ? null : originY - logicalY * spacing;
    const current = Number.isFinite(pixelY) ? { x: pixelX, y: pixelY } : null;
    if (!current) {
      flush();
      previous = null;
      continue;
    }

    if (previous && Math.abs(current.y - previous.y) <= canvasHeight * 1.5) {
      const clipped = clipSegmentToRect(previous, current, canvasWidth, canvasHeight);
      if (clipped) {
        const [start, end] = clipped;
        const lastX = points.at(-2);
        const lastY = points.at(-1);
        if (lastX !== start.x || lastY !== start.y) {
          if (points.length > 0) flush();
          points.push(start.x, start.y);
        }
        points.push(end.x, end.y);
      } else {
        flush();
      }
    } else if (previous) {
      flush();
    }
    previous = current;
  }
  flush();
  return segments;
}

function clipSegmentToRect(start, end, width, height) {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  let enter = 0;
  let exit = 1;
  const boundaries = [
    [-deltaX, start.x],
    [deltaX, width - start.x],
    [-deltaY, start.y],
    [deltaY, height - start.y],
  ];

  for (const [coefficient, constant] of boundaries) {
    if (coefficient === 0) {
      if (constant < 0) return null;
      continue;
    }
    const ratio = constant / coefficient;
    if (coefficient < 0) {
      enter = Math.max(enter, ratio);
    } else {
      exit = Math.min(exit, ratio);
    }
    if (enter > exit) return null;
  }

  return [
    { x: start.x + enter * deltaX, y: start.y + enter * deltaY },
    { x: start.x + exit * deltaX, y: start.y + exit * deltaY },
  ];
}
