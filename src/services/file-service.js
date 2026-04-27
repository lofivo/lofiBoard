export const FILE_TYPES = [
  {
    description: "lofiBoard 白板文件",
    accept: { "application/json": [".lofibrd", ".json"] },
  },
];

export function supportsFileSystemAccess() {
  return "showOpenFilePicker" in window && "showSaveFilePicker" in window;
}

export async function openWhiteboardFile() {
  const [handle] = await window.showOpenFilePicker({
    types: FILE_TYPES,
    excludeAcceptAllOption: false,
  });
  const file = await handle.getFile();
  const text = await file.text();

  return {
    handle,
    name: file.name,
    contents: JSON.parse(text),
  };
}

export async function chooseWhiteboardSaveFile(activeFileName) {
  return window.showSaveFilePicker({
    suggestedName: `${activeFileName.replace(/\.lofibrd$/i, "") || "untitled"}.lofibrd`,
    types: FILE_TYPES,
  });
}

export async function writeWhiteboardFile(handle, board) {
  const writable = await handle.createWritable();
  await writable.write(JSON.stringify(board, null, 2));
  await writable.close();
}

export function downloadDataUrl({ dataUrl, fileName }) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = fileName;
  link.click();
  link.remove();
}
