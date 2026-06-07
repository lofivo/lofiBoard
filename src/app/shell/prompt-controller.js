export function createPromptController({
  prompt = (label, fallback) => window.prompt(label, fallback),
} = {}) {
  function promptIndex(label, fallback = 0) {
    const input = prompt(label, String(Math.max(0, Number(fallback) || 0)));
    if (input === null) return fallback;
    const parsed = Number.parseInt(input, 10);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : fallback;
  }

  function promptValue(label, fallback = "") {
    const input = prompt(label, String(fallback ?? ""));
    return input === null ? fallback : input;
  }

  function promptMultiline(label, fallback = "") {
    return promptValue(label, fallback);
  }

  function promptBoolean(label, fallback = false) {
    const input = prompt(label, fallback ? "y" : "n");
    if (input === null) return fallback;
    return /^(y|yes|true|1|是|有向)$/i.test(input.trim());
  }

  return {
    promptBoolean,
    promptIndex,
    promptMultiline,
    promptValue,
  };
}
