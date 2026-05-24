function getTokenSet(value) {
  return new Set(String(value ?? "").split(/\s+/).filter((token) => token && token !== "normal" && token !== "none"));
}

function formatTokens(tokens, fallback = "") {
  return Array.from(tokens).join(" ") || fallback;
}

export function hasFontStyle(value, token) {
  return getTokenSet(value).has(token);
}

export function hasTextDecoration(value, token) {
  return getTokenSet(value).has(token);
}

export function toggleFontStyleToken(value, token) {
  const tokens = getTokenSet(value);
  if (tokens.has(token)) {
    tokens.delete(token);
  } else {
    tokens.add(token);
  }
  return formatTokens(tokens, "normal");
}

export function toggleTextDecorationToken(value, token) {
  const tokens = getTokenSet(value);
  if (tokens.has(token)) {
    tokens.delete(token);
  } else {
    tokens.add(token);
  }
  return formatTokens(tokens);
}
