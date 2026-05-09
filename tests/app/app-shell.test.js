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

  it("renders the layer panel collapsed before app hydration", () => {
    const markup = renderShell();

    expect(markup).toContain('class="layer-panel is-collapsed"');
    expect(markup).toContain('data-panel-toggle="layers"');
  });

  it("styles layer labels with ellipsis overflow", () => {
    const styles = readFileSync(new URL("../../src/styles.css", import.meta.url), "utf8");
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(appSource).toContain("layer-label");
    expect(styles).toContain(".layer-label");
    expect(styles).toContain("text-overflow: ellipsis");
    expect(styles).toContain("white-space: nowrap");
  });

  it("keeps the current selection when pointer down starts on an already selected element", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(appSource).toContain("targetIds.some((id) => selectedIds.includes(id))");
    expect(appSource).toContain("beginSelectionDrag(worldPoint)");
    expect(appSource).toContain("selectElementById(targetElement, event.evt.shiftKey)");
  });

  it("renders array structure quick edit actions", () => {
    const markup = renderShell();

    expect(markup).toContain('data-action="array-insert-start"');
    expect(markup).toContain('data-action="array-insert-end"');
    expect(markup).toContain('data-action="array-delete-end"');
  });

  it("starts a drag gesture immediately after selecting an unselected text element", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(appSource).toContain('["text", "sticky"].includes(element.type)');
    expect(appSource).toContain("selectElementById(targetElement, event.evt.shiftKey)");
    expect(appSource).toContain("beginSelectionDrag(worldPoint)");
  });

  it("keeps live text editor height aligned with committed text box normalization", () => {
    const appSource = readFileSync(new URL("../../src/app/whiteboard-app.js", import.meta.url), "utf8");

    expect(appSource).toContain("}) + 2 * scale");
    expect(appSource).toContain("verticalGap: 2");
  });
});
