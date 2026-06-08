import {
  createClipboardSnapshot,
  createPastedElements as buildPastedElements,
} from "../../services/clipboard.js";

export function createClipboardController({ initialSnapshot = [] } = {}) {
  let snapshot = createClipboardSnapshot(initialSnapshot, initialSnapshot.map((element) => element.id));

  function getSnapshot() {
    return createClipboardSnapshot(snapshot, snapshot.map((element) => element.id));
  }

  function hasSnapshot() {
    return snapshot.length > 0;
  }

  function copy(elements, selectedIds) {
    snapshot = createClipboardSnapshot(elements, selectedIds);
    return getSnapshot();
  }

  function createPastedElements(options) {
    if (!hasSnapshot()) return [];
    return buildPastedElements(snapshot, options);
  }

  function replaceWithElements(elements) {
    snapshot = createClipboardSnapshot(elements, elements.map((element) => element.id));
    return getSnapshot();
  }

  return {
    getSnapshot,
    hasSnapshot,
    copy,
    createPastedElements,
    replaceWithElements,
  };
}
