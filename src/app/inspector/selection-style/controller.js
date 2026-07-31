import {
  toggleFontStyleToken,
  toggleTextDecorationToken,
} from "../text-style-tokens.js";
import { getFillValue } from "../../../tools/behavior.js";

const TEXT_STYLE_COMMANDS = ["bold", "italic", "underline", "strike"];

export function createSelectionStyleController({
  getElements = () => [],
  getSelectedIds = () => [],
  normalizeTextElementBox = (element) => element,
  setElements = () => {},
} = {}) {
  function applyStyleToSelection({
    arrowDoubleEnded = false,
    color = "#111827",
    fillColor = "#ffffff",
    fillTransparent = false,
    fontFamily = "",
    fontSize = 16,
    strokeStyle = {},
    width = 1,
  } = {}) {
    const selectedIds = getSelectedIds();
    if (selectedIds.length === 0) return false;

    const selectedIdSet = new Set(selectedIds);
    const selectedElements = getElements().filter((element) => selectedIdSet.has(element.id));
    const isStrokeOnlySelection = selectedElements.every((element) => element.type === "stroke");
    const nextFontSize = Number(fontSize);
    const strokeWidth = Number(width);
    setElements(getElements().map((element) => {
      if (!selectedIdSet.has(element.id)) return element;
      if (element.locked) return element;
      if (element.type === "text") {
        return normalizeTextElementBox({
          ...element,
          fill: color,
          fontSize: nextFontSize,
          fontFamily,
        });
      }
      if (element.type === "sticky") {
        return {
          ...element,
          textFill: color,
          fill: getFillValue({ transparent: false, color: fillColor }),
          fontSize: nextFontSize,
          fontFamily,
        };
      }
      if (element.type === "arrow") {
        return {
          ...element,
          ...strokeStyle,
          fill: color,
          pointerAtBeginning: arrowDoubleEnded,
          pointerAtEnding: true,
        };
      }
      if (element.type === "stroke") {
        return isStrokeOnlySelection
          ? { ...element, ...strokeStyle }
          : { ...element, stroke: color, strokeWidth };
      }
      if (element.type === "line") {
        return { ...element, ...strokeStyle };
      }
      if (element.type === "coordinate-plane" || element.type.endsWith?.("-structure")) return element;
      return {
        ...element,
        stroke: color,
        fill: getFillValue({ transparent: fillTransparent, color: fillColor }),
        strokeWidth,
      };
    }));
    return true;
  }

  function applyCoordinateStyleToSelection({
    axisStroke,
    gridStroke,
    labelFill,
    showGrid,
    showLabels,
    showTicks,
    unitSize,
    functions,
  } = {}) {
    const selectedIds = getSelectedIds();
    const elements = getElements();
    const selectedCoordinateIds = selectedIds.filter((id) => {
      const element = elements.find((item) => item.id === id);
      return element?.type === "coordinate-plane" && !element.locked;
    });
    if (selectedCoordinateIds.length === 0) return false;

    const selectedCoordinateIdSet = new Set(selectedCoordinateIds);
    const nextUnitSize = Math.max(8, Number(unitSize) || 40);
    setElements(elements.map((element) => {
      if (!selectedCoordinateIdSet.has(element.id)) return element;
      return {
        ...element,
        unitSize: nextUnitSize,
        settings: {
          ...(element.settings ?? {}),
          showGrid,
          showTicks,
          showLabels,
        },
        style: {
          ...(element.style ?? {}),
          gridStroke,
          axisStroke,
          labelFill,
        },
        functions: Array.isArray(functions)
          ? functions
          : String(functions ?? "").split(/[\n;]/).map((item) => item.trim()).filter(Boolean).slice(0, 8),
      };
    }));
    return true;
  }

  function toggleTextStyle(style) {
    if (!TEXT_STYLE_COMMANDS.includes(style)) return false;
    const selectedIds = getSelectedIds();
    if (selectedIds.length === 0) return false;

    const selectedIdSet = new Set(selectedIds);
    setElements(getElements().map((element) => {
      if (!selectedIdSet.has(element.id) || element.locked || !["text", "sticky"].includes(element.type)) {
        return element;
      }

      if (style === "bold" || style === "italic") {
        return normalizeTextElementBox({
          ...element,
          fontStyle: toggleFontStyleToken(element.fontStyle, style),
        });
      }

      const decoration = style === "underline" ? "underline" : "line-through";
      return normalizeTextElementBox({
        ...element,
        textDecoration: toggleTextDecorationToken(element.textDecoration, decoration),
      });
    }));
    return true;
  }

  return {
    applyCoordinateStyleToSelection,
    applyStyleToSelection,
    toggleTextStyle,
  };
}
