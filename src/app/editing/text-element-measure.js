import {
  getMinimumTextBoxWidth,
  getNormalizedTextBox,
  getPreferredTextBoxWidth,
} from "../../tools/interaction-rules.js";
import { hasFontStyle } from "../inspector/text-style-tokens.js";

export function applyMeasuredTextHeights(elements = [], measurements = []) {
  const heightById = new Map(measurements
    .filter(({ id, height }) => id && Number.isFinite(height) && height > 0)
    .map(({ id, height }) => [id, height]));
  let changed = false;
  const nextElements = elements.map((element) => {
    const nextHeight = heightById.get(element.id);
    if (element.type !== "text" || !nextHeight) return element;
    if (Math.abs((Number(element.height) || 0) - nextHeight) < 0.01) return element;
    changed = true;
    return { ...element, height: nextHeight };
  });
  return {
    elements: changed ? nextElements : elements,
    changed,
  };
}

export function createTextElementMeasurer({
  createCanvas = () => document.createElement("canvas"),
} = {}) {
  let canvas = null;

  function getTextMeasureContext() {
    canvas ??= createCanvas();
    return canvas.getContext("2d");
  }

  function getTextMeasureContextForElement(element, fontSize = element.fontSize) {
    const context = getTextMeasureContext();
    const fontWeight = hasFontStyle(element.fontStyle, "bold") ? "700" : "400";
    const fontStyle = hasFontStyle(element.fontStyle, "italic") ? "italic" : "normal";
    context.font = `${fontStyle} ${fontWeight} ${fontSize}px ${element.fontFamily}`;
    return context;
  }

  function measureTextElementValue(element, value, fontSize = element.fontSize) {
    return getTextMeasureContextForElement(element, fontSize).measureText(value || " ").width;
  }

  function getTextElementWrappedHeight(element, width) {
    return getNormalizedTextElementBox(element, width).height;
  }

  function getMinimumTextElementWidth(element, fontSize = element.fontSize) {
    const padding = Number(element.padding ?? 0);
    return getMinimumTextBoxWidth({
      text: element.text,
      fontSize,
      padding,
      measureText: (value) => measureTextElementValue(element, value, fontSize),
    });
  }

  function getPreferredTextElementWidth(element, baseWidth = element.width) {
    const padding = Number(element.padding ?? 0);
    return getPreferredTextBoxWidth({
      text: element.text,
      baseWidth,
      contentWidth: measureTextElementValue(element, element.text),
      padding,
    });
  }

  function getNormalizedTextElementBox(element, width = element.width) {
    const padding = Number(element.padding ?? 0);
    return getNormalizedTextBox({
      text: element.text,
      width,
      fontSize: element.fontSize,
      padding,
      lineHeight: 1.25,
      verticalGap: 2,
      measureText: (value) => measureTextElementValue(element, value),
    });
  }

  function normalizeTextElementBox(element, { preserveHeight = false } = {}) {
    if (element.type !== "text") return element;
    const box = getNormalizedTextElementBox(element);
    return {
      ...element,
      width: box.width,
      height: preserveHeight && Number.isFinite(element.height) ? element.height : box.height,
      scaleX: 1,
      scaleY: 1,
    };
  }

  return {
    getTextMeasureContext,
    getTextMeasureContextForElement,
    measureTextElementValue,
    getTextElementWrappedHeight,
    getMinimumTextElementWidth,
    getPreferredTextElementWidth,
    getNormalizedTextElementBox,
    normalizeTextElementBox,
  };
}
