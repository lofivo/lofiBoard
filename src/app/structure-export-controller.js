export function createStructureExportController({
  getElements,
  getSelectedIds,
  structureInput,
  setStatus,
  exportGraph,
  exportTree,
  getClipboard = () => navigator.clipboard,
}) {
  function getSelectedStructure(type) {
    const selectedIds = getSelectedIds();
    return getElements().find((item) => selectedIds.includes(item.id) && item.type === type);
  }

  function writeFallback(text, message = "已写入结构输入框") {
    structureInput.value = text;
    setStatus(message);
  }

  function copyText(text, successMessage) {
    const writeText = getClipboard()?.writeText;
    if (!writeText) {
      writeFallback(text);
      return;
    }
    writeText.call(getClipboard(), text).then(
      () => setStatus(successMessage),
      () => writeFallback(text, "无法访问剪贴板，已写入结构输入框"),
    );
  }

  function copySelectedGraphExport(format) {
    const element = getSelectedStructure("graph-structure");
    if (!element) return;
    copyText(exportGraph(element, format), "已复制图数据");
  }

  function copySelectedTreeSubtree() {
    const element = getSelectedStructure("tree-structure");
    if (!element) return;
    copyText(exportTree(element), "已复制树边列表");
  }

  return {
    copySelectedGraphExport,
    copySelectedTreeSubtree,
  };
}
