export function isImageFile(file) {
  return Boolean(file?.type?.startsWith("image/"));
}

export function getImageInsertPoint(lastPointerWorldPoint, stageSize, viewport) {
  if (lastPointerWorldPoint) return lastPointerWorldPoint;
  return {
    x: (stageSize.width / 2 - viewport.x) / viewport.scale,
    y: (stageSize.height / 2 - viewport.y) / viewport.scale,
  };
}

export function getImageFileFromPasteEvent(event) {
  const files = [...(event.clipboardData?.files ?? [])];
  const file = files.find(isImageFile);
  if (file) return file;

  const items = [...(event.clipboardData?.items ?? [])];
  return items.find((item) => item.kind === "file" && item.type?.startsWith("image/"))?.getAsFile() ?? null;
}

export function getImageFileFromDropEvent(event) {
  return [...(event.dataTransfer?.files ?? [])].find(isImageFile) ?? null;
}

export function shouldLetPasteEventHandleImages({ hasImageOnClipboard, hasInternalClipboard }) {
  return Boolean(hasImageOnClipboard || !hasInternalClipboard);
}

export async function hasClipboardImage(navigatorRef = navigator) {
  if (!navigatorRef?.clipboard?.read) return false;
  try {
    const items = await navigatorRef.clipboard.read();
    return items.some((item) => item.types?.some((type) => type.startsWith("image/")));
  } catch {
    return false;
  }
}

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error ?? new Error("无法读取图片文件"));
    reader.readAsDataURL(file);
  });
}

export function readImageSize(src) {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error("图片格式无法载入"));
    image.src = src;
  });
}
