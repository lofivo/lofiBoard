import { createId } from "../board/ids.js";
import { STRUCTURE_ELEMENT_TYPES } from "./types.js";

export const MATRIX_STRUCTURE_STYLE = Object.freeze({
  cellWidth: 72,
  cellHeight: 44,
  indexFill: "#eef2ff",
  valueFill: "#ffffff",
  stroke: "#111827",
  textFill: "#111827",
  indexTextFill: "#475569",
});

export const MATRIX_DIMENSION_LIMITS = Object.freeze({ min: 1, max: 32 });
export const MATRIX_RANDOM_INIT_DEFAULT_DIMENSION = 3;

export function parseMatrixInput(input) {
  const normalizedInput = String(input ?? "").trim();
  if (!normalizedInput) return [[""]];
  const rows = normalizedInput
    .split(/\r?\n|;/)
    .map((line) => line.split(",").map((value) => value.trim()));
  const columns = Math.max(1, ...rows.map((row) => row.length));
  return rows.map((row) => Array.from({ length: columns }, (_, column) => row[column] ?? ""));
}

export function createRandomMatrixValues({ rows, columns } = {}, { random = Math.random } = {}) {
  const rowCount = normalizeMatrixDimension(rows, MATRIX_RANDOM_INIT_DEFAULT_DIMENSION);
  const columnCount = normalizeMatrixDimension(columns, MATRIX_RANDOM_INIT_DEFAULT_DIMENSION);
  const values = Array.from({ length: rowCount * columnCount }, () => {
    const ratio = Math.min(0.999999999999, Math.max(0, Number(random()) || 0));
    return String(Math.floor(ratio * 100));
  });
  return Array.from({ length: rowCount }, (_, row) => (
    values.slice(row * columnCount, (row + 1) * columnCount)
  ));
}

export function createMatrixStructureElement(values, point, zIndex) {
  const rows = Math.max(1, values.length);
  const columns = Math.max(1, ...values.map((row) => row.length));
  const settings = { indexBase: 0, showIndexes: true };
  const headerCount = settings.showIndexes ? 1 : 0;
  const width = (columns + headerCount) * MATRIX_STRUCTURE_STYLE.cellWidth;
  const height = (rows + headerCount) * MATRIX_STRUCTURE_STYLE.cellHeight;
  return {
    id: createId("matrix"),
    type: STRUCTURE_ELEMENT_TYPES.MATRIX,
    x: point.x - width / 2,
    y: point.y - height / 2,
    width,
    height,
    rows,
    columns,
    items: Array.from({ length: rows }, (_, row) => (
      Array.from({ length: columns }, (_, column) => ({
        id: createId("cell"),
        row,
        column,
        value: String(values[row]?.[column] ?? ""),
      }))
    )).flat(),
    settings,
    style: { ...MATRIX_STRUCTURE_STYLE },
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    zIndex,
  };
}

export function exportMatrix(element) {
  if (element?.type !== STRUCTURE_ELEMENT_TYPES.MATRIX) return "";
  const rows = Math.max(1, Number(element.rows) || 1);
  const columns = Math.max(1, Number(element.columns) || 1);
  const values = new Map((element.items ?? []).map((item) => [
    `${item.row}:${item.column}`,
    String(item.value ?? ""),
  ]));
  return Array.from({ length: rows }, (_, row) => (
    Array.from({ length: columns }, (_, column) => values.get(`${row}:${column}`) ?? "").join(",")
  )).join("\n");
}

export function updateMatrixFromInput(element, input) {
  if (element?.type !== STRUCTURE_ELEMENT_TYPES.MATRIX) return element;
  return normalizeMatrixValues(element, parseMatrixInput(input));
}

export function setMatrixIndexOptions(element, {
  indexBase = element?.settings?.indexBase ?? 0,
  showIndexes = element?.settings?.showIndexes ?? true,
} = {}) {
  if (element?.type !== STRUCTURE_ELEMENT_TYPES.MATRIX) return element;
  return resizeMatrixAroundCenter({
    ...element,
    settings: {
      ...(element.settings ?? {}),
      indexBase: Number(indexBase) === 1 ? 1 : 0,
      showIndexes: Boolean(showIndexes),
    },
  });
}

export function resizeMatrix(element, {
  rows = element?.rows,
  columns = element?.columns,
} = {}) {
  if (element?.type !== STRUCTURE_ELEMENT_TYPES.MATRIX) return element;
  const nextRows = normalizeMatrixDimension(rows, element.rows);
  const nextColumns = normalizeMatrixDimension(columns, element.columns);
  const items = new Map((element.items ?? []).map((item) => [
    `${item.row}:${item.column}`,
    item,
  ]));
  return resizeMatrixAroundCenter({
    ...element,
    rows: nextRows,
    columns: nextColumns,
    items: Array.from({ length: nextRows }, (_, row) => (
      Array.from({ length: nextColumns }, (_, column) => {
        const existing = items.get(`${row}:${column}`);
        return existing
          ? { ...existing, row, column }
          : { id: createId("cell"), row, column, value: "" };
      })
    )).flat(),
  });
}

export function updateMatrixItemValue(element, row, column, value) {
  if (element?.type !== STRUCTURE_ELEMENT_TYPES.MATRIX) return element;
  const targetRow = Number.parseInt(String(row), 10);
  const targetColumn = Number.parseInt(String(column), 10);
  if (!Number.isInteger(targetRow) || !Number.isInteger(targetColumn)) return element;
  return {
    ...element,
    items: (element.items ?? []).map((item) => (
      item.row === targetRow && item.column === targetColumn
        ? { ...item, value: String(value ?? "") }
        : item
    )),
  };
}

function normalizeMatrixValues(element, values) {
  const rows = Math.max(1, values.length);
  const columns = Math.max(1, ...values.map((row) => row.length));
  const ids = new Map((element.items ?? []).map((item) => [
    `${item.row}:${item.column}`,
    item.id,
  ]));
  return resizeMatrixAroundCenter({
    ...element,
    rows,
    columns,
    items: Array.from({ length: rows }, (_, row) => (
      Array.from({ length: columns }, (_, column) => ({
        id: ids.get(`${row}:${column}`) ?? createId("cell"),
        row,
        column,
        value: String(values[row]?.[column] ?? ""),
      }))
    )).flat(),
  });
}

function resizeMatrixAroundCenter(element) {
  const style = { ...MATRIX_STRUCTURE_STYLE, ...(element.style ?? {}) };
  const headerCount = (element.settings?.showIndexes ?? true) ? 1 : 0;
  const nextWidth = (Math.max(1, Number(element.columns) || 1) + headerCount) * style.cellWidth;
  const nextHeight = (Math.max(1, Number(element.rows) || 1) + headerCount) * style.cellHeight;
  const previousWidth = Number(element.width) || nextWidth;
  const previousHeight = Number(element.height) || nextHeight;
  return {
    ...element,
    x: (Number(element.x) || 0) - (nextWidth - previousWidth) / 2,
    y: (Number(element.y) || 0) - (nextHeight - previousHeight) / 2,
    width: nextWidth,
    height: nextHeight,
    style,
  };
}

function normalizeMatrixDimension(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  const fallbackValue = Number.parseInt(String(fallback ?? ""), 10);
  const dimension = Number.isInteger(parsed) ? parsed : (Number.isInteger(fallbackValue) ? fallbackValue : 1);
  return Math.min(MATRIX_DIMENSION_LIMITS.max, Math.max(MATRIX_DIMENSION_LIMITS.min, dimension));
}
