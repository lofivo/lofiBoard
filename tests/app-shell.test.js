import { describe, expect, it } from "vitest";
import { renderShell } from "../src/app-shell.js";

describe("app shell", () => {
  it("renders edge expand buttons for collapsed side panels", () => {
    const markup = renderShell();

    expect(markup).toContain('data-panel-edge="style"');
    expect(markup).toContain('data-panel-edge="layers"');
    expect(markup).toContain("展开属性");
    expect(markup).toContain("展开图层");
  });
});
