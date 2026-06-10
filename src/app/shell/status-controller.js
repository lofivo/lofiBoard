export function createStatusController({
  status,
  timeoutMs = 3000,
  setTimeoutFn = (callback, delay) => globalThis.setTimeout(callback, delay),
  clearTimeoutFn = (timer) => globalThis.clearTimeout(timer),
}) {
  let statusTimer = null;

  function setStatus(message) {
    clearTimeoutFn(statusTimer);
    status.textContent = message;
    status.classList.add("is-visible");
    statusTimer = setTimeoutFn(() => {
      status.textContent = "就绪";
      status.classList.remove("is-visible");
    }, timeoutMs);
  }

  return { setStatus };
}
