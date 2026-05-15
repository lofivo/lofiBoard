import katexCss from "katex/dist/katex.min.css?raw";

const DEFAULT_PADDING = 8;

export function parseLatexText(value) {
  const text = String(value ?? "").trim();
  const blockMatch = /^\$\$([\s\S]+)\$\$$/.exec(text);
  if (blockMatch) {
    return { ok: true, expression: blockMatch[1].trim(), displayMode: true };
  }

  const inlineParenMatch = /^\\\(([\s\S]+)\\\)$/.exec(text);
  if (inlineParenMatch) {
    return { ok: true, expression: inlineParenMatch[1].trim(), displayMode: false };
  }

  const inlineDollarMatch = /^\$([^\$][\s\S]*?)\$$/.exec(text);
  if (inlineDollarMatch) {
    return { ok: true, expression: inlineDollarMatch[1].trim(), displayMode: false };
  }

  if (/\\[a-zA-Z]+|[_^{}]/.test(text)) {
    return { ok: true, expression: text, displayMode: false };
  }

  return { ok: false, expression: "", displayMode: false };
}

export function isLatexText(value) {
  return parseLatexText(value).ok;
}

export async function renderLatexToHtml(value, options = {}) {
  const parsed = parseLatexText(value);
  if (!parsed.ok || !parsed.expression) return null;
  const { default: katex } = await import("katex");

  return katex.renderToString(parsed.expression, {
    displayMode: parsed.displayMode,
    throwOnError: false,
    output: "html",
    ...options,
  });
}

export async function renderLatexToImageSource(value, {
  fill = "#111827",
  fontSize = 28,
  maxWidth = 640,
  padding = DEFAULT_PADDING,
  documentRef = globalThis.document,
} = {}) {
  if (!documentRef?.createElement || !documentRef.body) {
    return null;
  }

  const html = await renderLatexToHtml(value);
  if (!html) return null;

  const host = documentRef.createElement("div");
  host.className = "latex-render-measure";
  host.style.position = "fixed";
  host.style.left = "0";
  host.style.top = "0";
  host.style.zIndex = "2147483647";
  host.style.display = "inline-block";
  host.style.maxWidth = `${Math.max(80, Number(maxWidth) || 640)}px`;
  host.style.padding = `${padding}px`;
  host.style.color = fill;
  host.style.fontSize = `${Math.max(8, Number(fontSize) || 28)}px`;
  host.style.lineHeight = "1.25";
  host.style.background = "transparent";
  host.style.pointerEvents = "none";
  host.innerHTML = `<style>${katexCss}</style>${html}`;
  documentRef.body.appendChild(host);

  const rect = host.getBoundingClientRect();
  const width = Math.max(1, Math.ceil(rect.width));
  const height = Math.max(1, Math.ceil(rect.height));
  try {
    const { default: html2canvas } = await import("html2canvas");
    const canvas = await html2canvas(host, {
      backgroundColor: null,
      logging: false,
      scale: Math.max(1, Math.min(3, globalThis.devicePixelRatio || 2)),
      width,
      height,
    });
    const src = canvas.toDataURL("image/png");
    return {
      src,
      width,
      height,
      html,
    };
  } finally {
    host.remove();
  }
}
