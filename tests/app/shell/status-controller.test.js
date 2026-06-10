import { describe, expect, it, vi } from "vitest";
import { createStatusController } from "../../../src/app/shell/status-controller.js";

function createStatusNode() {
  const visibleClasses = new Set();
  return {
    classList: {
      add: vi.fn((className) => visibleClasses.add(className)),
      remove: vi.fn((className) => visibleClasses.delete(className)),
    },
    textContent: "",
    visibleClasses,
  };
}

describe("status-controller", () => {
  it("shows a status message and hides it after the timeout", () => {
    vi.useFakeTimers();
    const status = createStatusNode();
    const controller = createStatusController({ status });

    controller.setStatus("已保存");

    expect(status.textContent).toBe("已保存");
    expect(status.classList.add).toHaveBeenCalledWith("is-visible");
    expect(status.visibleClasses.has("is-visible")).toBe(true);

    vi.advanceTimersByTime(3000);

    expect(status.classList.remove).toHaveBeenCalledWith("is-visible");
    expect(status.visibleClasses.has("is-visible")).toBe(false);
    vi.useRealTimers();
  });

  it("resets textContent to 就绪 after the hide timeout", () => {
    vi.useFakeTimers();
    const status = createStatusNode();
    status.textContent = "就绪";
    const controller = createStatusController({ status });

    controller.setStatus("已保存");

    expect(status.textContent).toBe("已保存");

    vi.advanceTimersByTime(3000);

    expect(status.textContent).toBe("就绪");
    expect(status.classList.remove).toHaveBeenCalledWith("is-visible");
    vi.useRealTimers();
  });

  it("clears the previous hide timer before showing a new message", () => {
    vi.useFakeTimers();
    const clearTimeoutFn = vi.fn((timer) => clearTimeout(timer));
    const status = createStatusNode();
    const controller = createStatusController({
      status,
      clearTimeoutFn,
      setTimeoutFn: (callback, delay) => setTimeout(callback, delay),
    });

    controller.setStatus("第一条");
    controller.setStatus("第二条");
    vi.advanceTimersByTime(2999);

    expect(clearTimeoutFn).toHaveBeenCalledTimes(2);
    expect(status.textContent).toBe("第二条");
    expect(status.visibleClasses.has("is-visible")).toBe(true);

    vi.advanceTimersByTime(1);

    expect(status.visibleClasses.has("is-visible")).toBe(false);
    vi.useRealTimers();
  });
});
