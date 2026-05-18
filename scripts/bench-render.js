import { performance } from "node:perf_hooks";

const ordinaryCount = Number.parseInt(process.argv[2] ?? "1000", 10);
const strokePointCount = Number.parseInt(process.argv[3] ?? "50000", 10);
const linearItemCount = Number.parseInt(process.argv[4] ?? "1000", 10);

function createRects(count) {
  return Array.from({ length: count }, (_, index) => ({
    id: `rect_${index}`,
    type: "rect",
    x: (index % 50) * 18,
    y: Math.floor(index / 50) * 18,
    width: 14,
    height: 14,
    stroke: "#111827",
    strokeWidth: 2,
    fill: "#ffffff",
    zIndex: index,
  }));
}

function createStroke(pointCount) {
  return {
    id: "stroke_bench",
    type: "stroke",
    x: 0,
    y: 0,
    points: Array.from({ length: pointCount }, (_, index) => ({
      x: index % 1000,
      y: Math.sin(index / 10) * 20 + Math.floor(index / 1000) * 10,
      pressure: 0.5,
    })),
    stroke: "#111827",
    strokeWidth: 4,
    opacity: 1,
    lineCap: "round",
    brushStyle: "solid",
    smoothing: 0.45,
    zIndex: ordinaryCount,
  };
}

function createLinearItems(count) {
  return Array.from({ length: count }, (_, index) => ({
    id: `item_${index}`,
    value: String(index),
    index,
    highlighted: index % 11 === 0,
  }));
}

function measure(label, fn, iterations = 30) {
  const samples = [];
  for (let index = 0; index < iterations; index += 1) {
    const start = performance.now();
    fn();
    samples.push(performance.now() - start);
  }
  samples.sort((a, b) => a - b);
  const average = samples.reduce((sum, value) => sum + value, 0) / samples.length;
  const p95 = samples[Math.min(samples.length - 1, Math.floor(samples.length * 0.95))];
  console.log(`${label}: avg=${average.toFixed(2)}ms p95=${p95.toFixed(2)}ms n=${iterations}`);
}

const rects = createRects(ordinaryCount);
const stroke = createStroke(strokePointCount);
const linearItems = createLinearItems(linearItemCount);
const renderSnapshots = new Map();
const objectSnapshots = new WeakMap();

function createSnapshot(element) {
  const cached = objectSnapshots.get(element);
  if (cached) return cached;
  const snapshot = JSON.stringify(element);
  objectSnapshots.set(element, snapshot);
  return snapshot;
}

function simulateFullNodeSync(elements) {
  let synced = 0;
  for (const element of elements) {
    JSON.stringify(element);
    synced += 1;
  }
  return synced;
}

function simulateSnapshotNodeSync(elements) {
  let skipped = 0;
  let synced = 0;
  for (const element of elements) {
    const snapshot = createSnapshot(element);
    if (renderSnapshots.get(element.id) === snapshot) {
      skipped += 1;
      continue;
    }
    renderSnapshots.set(element.id, snapshot);
    synced += 1;
  }
  return { skipped, synced };
}

function simulateLinearFullRebuild(items) {
  return items.map((item, index) => ({
    key: index,
    rect: { stroke: item.highlighted ? "#2563eb" : "#111827" },
    text: String(item.value),
  }));
}

function simulateLinearItemReuse(previousItems, nextItems) {
  const registry = new Map(previousItems.map((item, index) => [index, item]));
  let reused = 0;
  let created = 0;
  for (const item of nextItems) {
    if (registry.has(item.index)) {
      registry.set(item.index, {
        ...registry.get(item.index),
        rect: { stroke: item.highlighted ? "#2563eb" : "#111827" },
        text: String(item.value),
      });
      reused += 1;
    } else {
      registry.set(item.index, item);
      created += 1;
    }
  }
  return { reused, created };
}

console.log(`render benchmark data: ordinary=${ordinaryCount} strokePoints=${strokePointCount} linearItems=${linearItemCount}`);
measure("create ordinary element data", () => createRects(ordinaryCount));
measure("copy single element update", () => {
  const next = [...rects];
  next[500] = { ...next[500], fill: "#dbeafe" };
  return next;
});
measure("copy stroke points", () => ({ ...stroke, points: [...stroke.points] }), 10);
measure("simulate full node sync", () => simulateFullNodeSync(rects));
simulateSnapshotNodeSync(rects);
measure("simulate unchanged snapshot skip", () => simulateSnapshotNodeSync(rects));
measure("simulate one changed snapshot sync", () => {
  const next = [...rects];
  next[Math.min(500, next.length - 1)] = { ...next[Math.min(500, next.length - 1)], fill: "#dbeafe" };
  return simulateSnapshotNodeSync(next);
});
const rebuiltLinearItems = simulateLinearFullRebuild(linearItems);
const nextLinearItems = linearItems.map((item, index) => (
  index === Math.min(500, linearItems.length - 1) ? { ...item, value: "changed" } : item
));
measure("simulate linear full rebuild", () => simulateLinearFullRebuild(nextLinearItems));
measure("simulate linear item reuse", () => simulateLinearItemReuse(rebuiltLinearItems, nextLinearItems));
