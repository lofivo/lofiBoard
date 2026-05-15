import { afterEach, describe, expect, it, vi } from "vitest";

const html2canvasMock = vi.hoisted(() => vi.fn(async () => ({
  toDataURL: () => "data:image/png;base64,AAAA",
})));

vi.mock("html2canvas", () => ({
  default: html2canvasMock,
}));

import {
  isLatexText,
  parseLatexText,
  renderLatexToImageSource,
  renderLatexToHtml,
} from "../../src/services/latex-service.js";

describe("latex service", () => {
  afterEach(() => {
    html2canvasMock.mockClear();
    html2canvasMock.mockResolvedValue({
      toDataURL: () => "data:image/png;base64,AAAA",
    });
  });

  it("detects inline and block latex delimiters", () => {
    expect(parseLatexText("$$x^2 + y^2 = z^2$$")).toEqual({
      ok: true,
      expression: "x^2 + y^2 = z^2",
      displayMode: true,
    });
    expect(parseLatexText("\\(E = mc^2\\)")).toEqual({
      ok: true,
      expression: "E = mc^2",
      displayMode: false,
    });
    expect(parseLatexText("$\\alpha + \\beta$")).toEqual({
      ok: true,
      expression: "\\alpha + \\beta",
      displayMode: false,
    });
    expect(parseLatexText("\\frac{a}{b}")).toEqual({
      ok: true,
      expression: "\\frac{a}{b}",
      displayMode: false,
    });
    expect(isLatexText("plain text")).toBe(false);
  });

  it("renders latex through katex without throwing on invalid expressions", async () => {
    await expect(renderLatexToHtml("$$\\frac{a}{b}$$")).resolves.toContain("katex");
    await expect(renderLatexToHtml("$$\\notACommand$$")).resolves.toContain("\\notACommand");
    await expect(renderLatexToHtml("plain text")).resolves.toBeNull();
  });

  it("renders latex to a visible temporary html2canvas host and cleans it up", async () => {
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
    expect(host.style.zIndex).toBe("2147483647");
    expect(host.style.pointerEvents).toBe("none");
    expect(html2canvasMock).toHaveBeenCalledWith(host, expect.objectContaining({
      backgroundColor: null,
      width: 91,
      height: 31,
    }));
    expect(host.remove).toHaveBeenCalledTimes(1);
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
