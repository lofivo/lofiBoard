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
    Input: ({ onChange, value }) => h(
      "input",
      { value, onInput: (event) => onChange?.(event.currentTarget.value) },
    ),
    TextArea: ({ onChange, value, ...props }) => h(
      "textarea",
      { value, onInput: (event) => onChange?.(event.currentTarget.value), ...props },
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

function setupLegacyStructurePanel({ initMode = "manual", randomCount = "5" } = {}) {
  document.body.innerHTML = `
    <div data-legacy-root>
      <div id="stage-container"></div>
      <button type="button" data-structure-type="array" class="active">数组</button>
      <button type="button" data-array-init-mode="manual" class="${initMode === "manual" ? "active" : ""}">手填结构</button>
      <button type="button" data-array-init-mode="random" class="${initMode === "random" ? "active" : ""}">随机生成</button>
      <textarea data-structure-input>1,2,3,4,5</textarea>
      <input data-array-random-count value="${randomCount}" />
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

  return { host, root };
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
});
