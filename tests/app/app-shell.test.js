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

    expect(markup).toContain('data-linear-field="current-index"');
    expect(markup).toContain('data-linear-field="current-value"');
    expect(markup).toContain('data-linear-field="insert-value"');
    expect(markup).toContain('data-linear-field="insert-index"');
    expect(markup).toContain('data-linear-field="swap-index"');
    expect(markup).toContain('data-linear-field="move-index"');
    expect(markup).toContain('data-linear-field="highlight-start"');
    expect(markup).toContain('data-linear-field="highlight-end"');
    expect(markup).toContain('data-linear-field="highlight-pointer"');
    expect(markup).toContain('data-action="array-insert-start"');
    expect(markup).toContain('data-action="array-insert-end"');
    expect(markup).toContain('data-action="array-insert-at"');
    expect(markup).toContain('data-action="array-delete-at"');
    expect(markup).toContain('data-action="array-set-value"');
    expect(markup).toContain('data-action="array-swap"');
    expect(markup).toContain('data-action="array-move"');
    expect(markup).toContain('data-action="array-highlight"');
    expect(markup).toContain('data-action="array-clear-highlight"');
    expect(markup).toContain('data-action="linear-index-zero"');
    expect(markup).toContain('data-action="linear-index-one"');
    expect(markup).toContain('data-action="linear-index-show"');
    expect(markup).toContain('data-action="linear-index-hide"');
    expect(markup).toContain('data-action="array-delete-end"');
    expect(markup).toContain('data-action="array-reload"');
    expect(markup).toContain('data-action="stack-push"');
    expect(markup).toContain('data-action="stack-pop"');
    expect(markup).toContain('data-action="queue-enqueue"');
    expect(markup).toContain('data-action="queue-dequeue"');
    expect(markup).toContain('data-action="deque-push-left"');
    expect(markup).toContain('data-action="deque-pop-right"');
    expect(markup).toContain('data-action="graph-add-node"');
    expect(markup).toContain('data-action="graph-add-edge"');
    expect(markup).toContain('data-action="graph-connect-mode"');
    expect(markup).toContain('data-action="graph-add-edge-input"');
    expect(markup).toContain('data-action="graph-delete-node"');
    expect(markup).toContain('data-action="graph-delete-edge"');
    expect(markup).toContain('data-action="graph-edit-edge"');
    expect(markup).toContain('data-action="graph-directed-on"');
    expect(markup).toContain('data-action="graph-directed-off"');
    expect(markup).toContain('data-action="graph-highlight"');
    expect(markup).toContain('data-action="graph-clear-highlight"');
    expect(markup).toContain('data-action="graph-layout-circle"');
    expect(markup).toContain('data-action="graph-layout-grid"');
    expect(markup).toContain('data-action="graph-layout-layered"');
    expect(markup).toContain('data-action="graph-layout-force"');
    expect(markup).toContain('data-action="graph-export-edge-list"');
    expect(markup).toContain('data-action="graph-export-adjacency-list"');
    expect(markup).toContain('data-action="graph-export-adjacency-matrix"');
    expect(markup).toContain('data-action="graph-import-adjacency-list"');
    expect(markup).toContain('data-action="graph-import-adjacency-matrix"');
    expect(markup).toContain('data-action="graph-reload"');
    expect(markup).toContain('data-action="tree-add-node"');
    expect(markup).toContain('data-action="tree-add-left"');
    expect(markup).toContain('data-action="tree-add-right"');
    expect(markup).toContain('data-action="tree-set-value"');
    expect(markup).toContain('data-action="tree-delete-subtree"');
    expect(markup).toContain('data-action="tree-highlight-level"');
    expect(markup).toContain('data-action="tree-highlight-preorder"');
    expect(markup).toContain('data-action="tree-highlight-inorder"');
    expect(markup).toContain('data-action="tree-highlight-postorder"');
    expect(markup).toContain('data-action="tree-step-next"');
    expect(markup).toContain('data-action="tree-step-prev"');
    expect(markup).toContain('data-action="tree-clear-highlight"');
    expect(markup).toContain('data-action="tree-collapse-subtree"');
    expect(markup).toContain('data-action="tree-expand-subtree"');
    expect(markup).toContain('data-action="tree-copy-subtree"');
    expect(markup).toContain('data-action="tree-move-subtree"');
    expect(markup).toContain('data-action="tree-delete-node"');
    expect(markup).toContain('data-action="tree-reload"');
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
