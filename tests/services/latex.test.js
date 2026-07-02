import { afterEach, describe, expect, it, vi } from "vitest";

const html2canvasMock = vi.hoisted(() => vi.fn(async () => ({
  toDataURL: () => "data:image/png;base64,AAAA",
})));

vi.mock("html2canvas", () => ({
  default: html2canvasMock,
}));

import {
  canRenderLatexText,
  clearLatexRenderCache,
  containsRenderableLatex,
  getTextDisplayValue,
  isLatexText,
  parseLatexText,
  renderLatexMixedToHtml,
  renderLatexToImageSource,
  renderLatexToHtml,
  tokenizeLatexText,
} from "../../src/services/latex.js";

describe("latex service", () => {
  afterEach(() => {
    clearLatexRenderCache();
    html2canvasMock.mockClear();
    html2canvasMock.mockResolvedValue({
      toDataURL: () => "data:image/png;base64,AAAA",
    });
  });

  it("detects only dollar-delimited latex", () => {
    expect(parseLatexText("$$x^2 + y^2 = z^2$$")).toEqual({
      ok: true,
      expression: "x^2 + y^2 = z^2",
      displayMode: true,
    });
    expect(parseLatexText("$\\alpha + \\beta$")).toEqual({
      ok: true,
      expression: "\\alpha + \\beta",
      displayMode: false,
    });
    expect(parseLatexText("\\(E = mc^2\\)")).toEqual({
      ok: false,
      expression: "",
      displayMode: false,
    });
    expect(parseLatexText("\\[E = mc^2\\]")).toEqual({
      ok: false,
      expression: "",
      displayMode: false,
    });
    expect(parseLatexText("\\frac{a}{b}")).toEqual({
      ok: false,
      expression: "",
      displayMode: false,
    });
    expect(isLatexText("plain text")).toBe(false);
  });

  it("treats escaped dollar delimiters as literal text", () => {
    expect(parseLatexText("\\$x^2\\$")).toEqual({
      ok: false,
      expression: "",
      displayMode: false,
    });
    expect(isLatexText("\\$x^2\\$")).toBe(false);
    expect(getTextDisplayValue("\\$x^2\\$")).toBe("$x^2$");
  });

  it("tokenizes mixed text with dollar-delimited inline and block latex only", () => {
    expect(tokenizeLatexText("速度 $v=\\frac{s}{t}$\n$$x^2$$")).toEqual([
      { type: "text", value: "速度 " },
      { type: "math", value: "v=\\frac{s}{t}", displayMode: false, raw: "$v=\\frac{s}{t}$" },
      { type: "text", value: "\n" },
      { type: "math", value: "x^2", displayMode: true, raw: "$$x^2$$" },
    ]);
    expect(tokenizeLatexText("价格 \\$5，不是公式")).toEqual([
      { type: "text", value: "价格 $5，不是公式" },
    ]);
    expect(tokenizeLatexText("$a\nb$")).toEqual([
      { type: "text", value: "$a\nb$" },
    ]);
    expect(tokenizeLatexText("\\[a\nb\\]")).toEqual([
      { type: "text", value: "\\[a\nb\\]" },
    ]);
    expect(tokenizeLatexText("\\(a+b\\)")).toEqual([
      { type: "text", value: "\\(a+b\\)" },
    ]);
  });

  it("only treats dollar-delimited latex as renderable", () => {
    expect(containsRenderableLatex("速度 $v=\\frac{s}{t}$")).toBe(true);
    expect(containsRenderableLatex("速度 \\(v=\\frac{s}{t}\\)")).toBe(false);
    expect(containsRenderableLatex("速度 \\frac{s}{t}")).toBe(false);
    expect(containsRenderableLatex("\\frac{s}{t}")).toBe(false);
    expect(containsRenderableLatex("path/to/file")).toBe(false);
    expect(containsRenderableLatex("1/2")).toBe(false);
    expect(containsRenderableLatex("价格 \\$5")).toBe(false);
  });

  it("checks whether dollar-delimited latex can actually render", () => {
    expect(canRenderLatexText("速度 $v=\\frac{s}{t}$")).toBe(true);
    expect(canRenderLatexText("$$\n\\log n\n$$")).toBe(true);
    expect(canRenderLatexText("坏公式 $\\notACommand$")).toBe(false);
    expect(canRenderLatexText("plain text")).toBe(false);
  });

  it("renders mixed latex text to vector html and falls back to plain text on invalid math", async () => {
    const html = await renderLatexMixedToHtml("速度 $v=\\frac{s}{t}$");
    expect(html).toContain("速度 ");
    expect(html).toContain("katex");
    expect(html).toContain("latex-text-fragment");
    await expect(renderLatexMixedToHtml("坏公式 $\\notACommand$")).resolves.toBeNull();
  });

  it("renders latex through katex without throwing on invalid expressions", async () => {
    await expect(renderLatexToHtml("$$\\frac{a}{b}$$")).resolves.toContain("katex");
    await expect(renderLatexToHtml("$$\\notACommand$$")).resolves.toContain("\\notACommand");
    await expect(renderLatexToHtml("plain text")).resolves.toBeNull();
  });

  it("renders latex with a non-visible temporary html2canvas host and cleans it up", async () => {
    const host = {
      className: "",
      style: {},
      innerHTML: "",
      getBoundingClientRect: () => ({ width: 90.2, height: 30.1 }),
      remove: vi.fn(),
    };
    const documentRef = {
      body: { appendChild: vi.fn() },
      createElement: vi.fn(() => host),
    };

    await expect(renderLatexToImageSource("$$x^2$$", { documentRef })).resolves.toMatchObject({
      src: "data:image/png;base64,AAAA",
      width: 91,
      height: 31,
    });

    expect(documentRef.body.appendChild).toHaveBeenCalledWith(host);
    expect(host.style.left).toBe("-10000px");
    expect(host.style.top).toBe("-10000px");
    expect(host.style.zIndex).toBe("-1");
    expect(host.style.pointerEvents).toBe("none");
    expect(html2canvasMock).toHaveBeenCalledWith(host, expect.objectContaining({
      backgroundColor: null,
      width: 91,
      height: 31,
    }));
    expect(host.remove).toHaveBeenCalledTimes(1);
  });

  it("reuses cached latex image captures for matching render inputs", async () => {
    const hosts = [];
    const documentRef = {
      body: { appendChild: vi.fn() },
      createElement: vi.fn(() => {
        const host = {
          className: "",
          style: {},
          innerHTML: "",
          getBoundingClientRect: () => ({ width: 90, height: 30 }),
          remove: vi.fn(),
        };
        hosts.push(host);
        return host;
      }),
    };

    const first = await renderLatexToImageSource("$$x^2$$", {
      documentRef,
      fill: "#111827",
      fontSize: 28,
      maxWidth: 180,
      padding: 0,
    });
    const second = await renderLatexToImageSource("$$x^2$$", {
      documentRef,
      fill: "#111827",
      fontSize: 28,
      maxWidth: 180,
      padding: 0,
    });

    expect(second).toBe(first);
    expect(html2canvasMock).toHaveBeenCalledTimes(1);
    expect(documentRef.body.appendChild).toHaveBeenCalledTimes(1);
    expect(hosts).toHaveLength(1);
  });

  it("removes the temporary latex host when html2canvas fails", async () => {
    html2canvasMock.mockRejectedValueOnce(new Error("capture failed"));
    const host = {
      className: "",
      style: {},
      innerHTML: "",
      getBoundingClientRect: () => ({ width: 90, height: 30 }),
      remove: vi.fn(),
    };
    const documentRef = {
      body: { appendChild: vi.fn() },
      createElement: vi.fn(() => host),
    };

    await expect(renderLatexToImageSource("$$x^2$$", { documentRef })).rejects.toThrow("capture failed");
    expect(host.remove).toHaveBeenCalledTimes(1);
  });
});
