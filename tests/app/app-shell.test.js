import { describe, expect, it } from "vitest";
import { renderShell } from "../../src/app/app-shell.js";
import { readFileSync } from "node:fs";

describe("app shell", () => {
  it("renders edge expand buttons for collapsed side panels", () => {
    const markup = renderShell();

    expect(markup).toContain('data-panel-edge="style"');
    expect(markup).toContain('data-panel-edge="layers"');
    expect(markup).toContain("展开属性");
    expect(markup).toContain("展开图层");
  });

  it("styles layer labels with ellipsis overflow", () => {
    const styles = readFileSync(new URL("../../src/styles.css", import.meta.url), "utf8");
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(appSource).toContain("layer-label");
    expect(styles).toContain(".layer-label");
    expect(styles).toContain("text-overflow: ellipsis");
    expect(styles).toContain("white-space: nowrap");
  });
});
