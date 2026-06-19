import katexCss from "katex/dist/katex.min.css?raw";

const DEFAULT_PADDING = 8;
const latexImageSourceCache = new Map();
const LATEX_DELIMITERS = [
  { left: "$$", right: "$$", displayMode: true, multiline: true },
  { left: "\\[", right: "\\]", displayMode: true, multiline: true },
  { left: "\\(", right: "\\)", displayMode: false, multiline: false },
  { left: "$", right: "$", displayMode: false, multiline: false },
];

function getLatexImageSourceCacheKey(value, { fill, fontSize, maxWidth, padding }) {
  return JSON.stringify({
    value: String(value ?? "").trim(),
    fill,
    fontSize: Math.max(8, Number(fontSize) || 28),
    maxWidth: Math.max(80, Number(maxWidth) || 640),
    padding: Math.max(0, Number(padding) || 0),
    devicePixelRatio: Math.max(1, Math.min(3, globalThis.devicePixelRatio || 2)),
  });
}

export function clearLatexRenderCache() {
  latexImageSourceCache.clear();
}

export function parseLatexText(value) {
  const text = String(value ?? "").trim();
  if (/\\[$]/.test(text)) {
    return { ok: false, expression: "", displayMode: false };
  }

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

  const hasLatexCommand = /\\[a-zA-Z]+/.test(text);
  const hasStrongMathSyntax = /[_^{}=<>]/.test(text);
  const looksLikeNakedExpression = (
    /^\\[a-zA-Z]+/.test(text)
    || (
      /^[a-zA-Z0-9\s\\_^{}+\-*/=().,[\]|<>:]+$/.test(text)
      && (hasLatexCommand || hasStrongMathSyntax)
    )
  );
  if (looksLikeNakedExpression) {
    return { ok: true, expression: text, displayMode: false };
  }

  return { ok: false, expression: "", displayMode: false };
}

export function isLatexText(value) {
  return parseLatexText(value).ok;
}

export function getTextDisplayValue(value) {
  return String(value ?? "").replace(/\\\$/g, "$");
}

function isEscapedAt(text, index) {
  let slashCount = 0;
  for (let cursor = index - 1; cursor >= 0 && text[cursor] === "\\"; cursor -= 1) {
    slashCount += 1;
  }
  return slashCount % 2 === 1;
}

function findClosingDelimiter(text, startIndex, delimiter) {
  for (let cursor = startIndex; cursor < text.length; cursor += 1) {
    if (isEscapedAt(text, cursor)) continue;
    if (!delimiter.multiline && text[cursor] === "\n") return -1;
    if (text.startsWith(delimiter.right, cursor)) return cursor;
  }
  return -1;
}

function pushTextToken(tokens, value) {
  if (!value) return;
  const normalized = getTextDisplayValue(value);
  if (!normalized) return;
  const previous = tokens.at(-1);
  if (previous?.type === "text") {
    previous.value += normalized;
    return;
  }
  tokens.push({ type: "text", value: normalized });
}

export function tokenizeLatexText(value) {
  const text = String(value ?? "");
  const tokens = [];
  let cursor = 0;
  let plainStart = 0;

  while (cursor < text.length) {
    const delimiter = LATEX_DELIMITERS.find((item) => (
      text.startsWith(item.left, cursor) && !isEscapedAt(text, cursor)
    ));
    if (!delimiter) {
      cursor += 1;
      continue;
    }

    const expressionStart = cursor + delimiter.left.length;
    const expressionEnd = findClosingDelimiter(text, expressionStart, delimiter);
    if (expressionEnd === -1) {
      cursor += delimiter.left.length;
      continue;
    }

    const expression = text.slice(expressionStart, expressionEnd);
    if (!expression.trim()) {
      cursor = expressionEnd + delimiter.right.length;
      continue;
    }

    pushTextToken(tokens, text.slice(plainStart, cursor));
    tokens.push({
      type: "math",
      value: expression.trim(),
      displayMode: delimiter.displayMode,
      raw: text.slice(cursor, expressionEnd + delimiter.right.length),
    });
    cursor = expressionEnd + delimiter.right.length;
    plainStart = cursor;
  }

  pushTextToken(tokens, text.slice(plainStart));
  return tokens;
}

export function containsExplicitLatex(value) {
  return tokenizeLatexText(value).some((token) => token.type === "math");
}

export function containsRenderableLatex(value) {
  const text = String(value ?? "");
  return containsExplicitLatex(text) || isLatexText(text);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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

export async function renderLatexMixedToHtml(value, options = {}) {
  const text = String(value ?? "");
  const explicitTokens = tokenizeLatexText(text);
  const hasExplicitMath = explicitTokens.some((token) => token.type === "math");
  const wholeExpression = parseLatexText(text);
  if (!hasExplicitMath && !wholeExpression.ok) return null;

  const { default: katex } = await import("katex");
  const tokens = hasExplicitMath
    ? explicitTokens
    : [{ type: "math", value: wholeExpression.expression, displayMode: wholeExpression.displayMode, raw: text }];

  try {
    return tokens.map((token) => {
      if (token.type === "text") {
        return `<span class="latex-text-fragment">${escapeHtml(token.value)}</span>`;
      }
      return katex.renderToString(token.value, {
        displayMode: token.displayMode,
        throwOnError: true,
        output: "html",
        ...options,
      });
    }).join("");
  } catch {
    return null;
  }
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

  const cacheKey = getLatexImageSourceCacheKey(value, { fill, fontSize, maxWidth, padding });
  if (latexImageSourceCache.has(cacheKey)) {
    return latexImageSourceCache.get(cacheKey);
  }

  const html = await renderLatexToHtml(value);
  if (!html) return null;

  const host = documentRef.createElement("div");
  host.className = "latex-render-measure";
  host.style.position = "fixed";
  host.style.left = "-10000px";
  host.style.top = "-10000px";
  host.style.zIndex = "-1";
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
    const imageSource = {
      src,
      width,
      height,
      html,
    };
    latexImageSourceCache.set(cacheKey, imageSource);
    return imageSource;
  } finally {
    host.remove();
  }
}
