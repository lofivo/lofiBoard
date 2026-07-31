// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@douyinfe/semi-ui", async () => {
  const ReactModule = await import("react");
  const h = ReactModule.createElement;

  return {
    Button: ({ children, onClick }) => h(
      "button",
      { type: "button", onClick },
      children,
    ),
    Card: ({ children, footer, title }) => h(
      "section",
      null,
      title,
      children,
      footer,
    ),
    Input: ({ onChange, value, "aria-label": ariaLabel }) => h(
      "input",
      { "aria-label": ariaLabel, value, onInput: (event) => onChange?.(event.currentTarget.value) },
    ),
    TextArea: ({ onChange, value, textareaStyle, resize, style: _style, ...props }) => h(
      "textarea",
      {
        value,
        onInput: (event) => onChange?.(event.currentTarget.value),
        style: { ...textareaStyle, resize },
        "data-resize": resize,
        ...props,
      },
    ),
    Typography: {
      Text: ({ children }) => h("span", null, children),
    },
  };
});

import StructurePanel from "../../../src/app/components/StructurePanel.jsx";
import { WhiteboardContext } from "../../../src/app/WhiteboardContext.jsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mountedRoots = [];

function setNativeInputValue(input, value) {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  descriptor.set.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function setupLegacyStructurePanel({
  initMode = "manual",
  randomCount = "5",
  matrixRows = "3",
  matrixColumns = "3",
} = {}) {
  document.body.innerHTML = `
    <div data-legacy-root>
      <div id="stage-container"></div>
      <button type="button" data-structure-type="array" class="active">数组</button>
      <button type="button" data-array-init-mode="manual" class="${initMode === "manual" ? "active" : ""}">手填结构</button>
      <button type="button" data-array-init-mode="random" class="${initMode === "random" ? "active" : ""}">随机生成</button>
      <textarea data-structure-input>1,2,3,4,5</textarea>
      <input data-array-random-count value="${randomCount}" />
      <input data-matrix-random-rows value="${matrixRows}" />
      <input data-matrix-random-columns value="${matrixColumns}" />
      <button type="button" data-structure-insert>插入</button>
      <button type="button" data-structure-cancel>取消</button>
    </div>
  `;
}

function renderPanel(options) {
  setupLegacyStructurePanel(options);
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  mountedRoots.push(root);
  const setStructurePanelVisible = vi.fn();

  act(() => {
    root.render(
      <WhiteboardContext.Provider value={{ structurePanelVisible: true, setStructurePanelVisible }}>
        <StructurePanel />
      </WhiteboardContext.Provider>,
    );
  });

  return { host, root, setStructurePanelVisible };
}

function findButton(host, label) {
  return [...host.querySelectorAll("button")].find((button) => button.textContent.trim() === label);
}

afterEach(() => {
  for (const root of mountedRoots.splice(0)) {
    act(() => {
      root.unmount();
    });
  }
  document.body.innerHTML = "";
});

describe("StructurePanel", () => {
  it("offers manual and random modes for the two-dimensional array template", () => {
    const { host } = renderPanel();
    const legacyTypeButton = document.createElement("button");
    legacyTypeButton.dataset.structureType = "matrix";
    document.querySelector("[data-legacy-root]").append(legacyTypeButton);
    const clickSpy = vi.fn();
    legacyTypeButton.addEventListener("click", clickSpy);

    act(() => {
      findButton(host, "二维数组").click();
    });

    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(host.querySelector("textarea").value).toBe("1,2,3\n4,5,6\n7,8,9");
    expect(host.querySelector("[data-preset-height-textarea]")).toBeTruthy();
    expect(host.querySelector("textarea").style.overflowY).toBe("auto");
    expect(host.querySelector("textarea").style.resize).toBe("vertical");
    expect(findButton(host, "随机生成")).toBeTruthy();

    act(() => {
      findButton(host, "随机生成").click();
    });

    expect(host.textContent).not.toContain("矩阵阶数");
    expect(host.textContent).toContain("行数");
    expect(host.textContent).toContain("列数");
    expect([...host.querySelectorAll("input")].map((input) => input.value)).toEqual(["3", "3"]);
  });

  it("syncs random matrix row and column counts to the legacy panel", () => {
    const { host } = renderPanel({ matrixRows: "2", matrixColumns: "4" });
    const legacyTypeButton = document.createElement("button");
    legacyTypeButton.dataset.structureType = "matrix";
    document.querySelector("[data-legacy-root]").append(legacyTypeButton);

    act(() => {
      findButton(host, "二维数组").click();
      findButton(host, "随机生成").click();
    });

    const rowsInput = host.querySelector('input[aria-label="行数"]');
    const columnsInput = host.querySelector('input[aria-label="列数"]');
    expect(rowsInput.value).toBe("2");
    expect(columnsInput.value).toBe("4");

    act(() => {
      setNativeInputValue(rowsInput, "5");
      setNativeInputValue(columnsInput, "7");
    });

    expect(document.querySelector("[data-matrix-random-rows]").value).toBe("5");
    expect(document.querySelector("[data-matrix-random-columns]").value).toBe("7");
  });

  it("offers random graph generation by node count", () => {
    const { host } = renderPanel();
    const legacyTypeButton = document.createElement("button");
    legacyTypeButton.dataset.structureType = "graph";
    document.querySelector("[data-legacy-root]").append(legacyTypeButton);

    act(() => {
      findButton(host, "图").click();
      findButton(host, "随机生成").click();
    });

    expect(host.textContent).toContain("节点数量");
    expect(host.querySelector("input")).toBeTruthy();
  });

  it("initializes the random element count from the legacy panel input", () => {
    const { host } = renderPanel({ initMode: "random", randomCount: "12" });

    expect(host.querySelector("input").value).toBe("12");
  });

  it("allows replacing the random element count with a value below five", () => {
    const { host } = renderPanel();

    act(() => {
      findButton(host, "随机生成").click();
    });
    const input = host.querySelector("input");
    const legacyInput = document.querySelector("[data-array-random-count]");

    act(() => {
      setNativeInputValue(input, "");
    });

    expect(input.value).toBe("");
    expect(legacyInput.value).toBe("");

    act(() => {
      setNativeInputValue(input, "3");
    });

    expect(input.value).toBe("3");
    expect(legacyInput.value).toBe("3");
  });

  it("treats clicking the backdrop as cancelling the structure tool", () => {
    const { host, setStructurePanelVisible } = renderPanel();
    const legacyCancel = document.querySelector("[data-structure-cancel]");
    const cancelSpy = vi.fn();
    legacyCancel.addEventListener("click", cancelSpy);

    act(() => {
      host.querySelector("[data-structure-panel-backdrop]").click();
    });

    expect(cancelSpy).toHaveBeenCalledTimes(1);
    expect(setStructurePanelVisible).toHaveBeenCalledWith(false);
  });
});
