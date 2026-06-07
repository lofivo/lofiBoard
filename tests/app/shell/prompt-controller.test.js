import { describe, expect, it, vi } from "vitest";
import { createPromptController } from "../../../src/app/shell/prompt-controller.js";

describe("prompt-controller", () => {
  it("reads string prompts and keeps the fallback when cancelled", () => {
    const prompt = vi.fn()
      .mockReturnValueOnce("next")
      .mockReturnValueOnce(null)
      .mockReturnValueOnce(null);
    const controller = createPromptController({ prompt });

    expect(controller.promptValue("名称", "old")).toBe("next");
    expect(controller.promptValue("名称", "old")).toBe("old");
    expect(controller.promptMultiline("多行", "fallback")).toBe("fallback");
  });

  it("normalizes index prompts to non-negative integers", () => {
    const prompt = vi.fn()
      .mockReturnValueOnce("3")
      .mockReturnValueOnce("-2")
      .mockReturnValueOnce("bad");
    const controller = createPromptController({ prompt });

    expect(controller.promptIndex("索引", 1)).toBe(3);
    expect(controller.promptIndex("索引", 1)).toBe(0);
    expect(controller.promptIndex("索引", 4)).toBe(4);
  });

  it("parses affirmative boolean prompts", () => {
    const prompt = vi.fn()
      .mockReturnValueOnce("是")
      .mockReturnValueOnce("n")
      .mockReturnValueOnce(null);
    const controller = createPromptController({ prompt });

    expect(controller.promptBoolean("是否", false)).toBe(true);
    expect(controller.promptBoolean("是否", true)).toBe(false);
    expect(controller.promptBoolean("是否", true)).toBe(true);
  });
});
