export function normalizeWebpageUrl(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(candidate);
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) return "";
    return url.toString();
  } catch {
    return "";
  }
}

export function getWebpageTitle(value) {
  try {
    return new URL(normalizeWebpageUrl(value)).hostname;
  } catch {
    return "网页";
  }
}
