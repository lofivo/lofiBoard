// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@douyinfe/semi-ui", async () => {
  const ReactModule = await import("react");
  const h = ReactModule.createElement;
  const passthrough = ({ children }) => h("span", null, children);

  return {
    Button: ({ "aria-label": ariaLabel, icon, children, onClick, style }) => h(
      "button",
      { "aria-label": ariaLabel, onClick, style },
      icon,
      children,
    ),
    Card: ({ children }) => h("section", null, children),
    Tooltip: passthrough,
    Dropdown: Object.assign(({ children }) => h("span", null, children), {
      Menu: passthrough,
      Item: passthrough,
      Divider: () => h("hr"),
    }),
  };
});

vi.mock("@douyinfe/semi-icons", () => {
  const h = React.createElement;
  return {
    IconChevronDown: () => h("i"),
    IconGridStroked: () => h("i"),
    IconMinus: () => h("i"),
    IconPlus: () => h("i"),
  };
});

import Topbar from "../../../src/app/components/Topbar.jsx";
import ToolDock from "../../../src/app/components/ToolDock.jsx";
import StatusBar from "../../../src/app/components/StatusBar.jsx";
import LayerPanel, { LayerPanelToggle } from "../../../src/app/components/LayerPanel.jsx";
import { WhiteboardContext } from "../../../src/app/WhiteboardContext.jsx";
import { GLASS, GLASS_EDGE, RADIUS } from "../../../src/ui/tokens.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mountedRoots = [];

function render(node, context = {}) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  mountedRoots.push(root);
  act(() => {
    root.render(
      <WhiteboardContext.Provider value={{ layers: [], selectedLayerIds: [], ...context }}>
        {node}
      </WhiteboardContext.Provider>,
    );
  });
  return host;
}

afterEach(() => {
  for (const root of mountedRoots.splice(0)) act(() => root.unmount());
  document.body.innerHTML = "";
});

// jsdom 的 cssstyle 在同时写 border 简写和 borderRight/borderLeft 时会把简写整个丢掉
// （真实浏览器不会），所以贴边面板的边框只能单独断言，这里只比对能可靠读出的三项。
function glassSignature(element) {
  return {
    background: element.style.background || element.style.backgroundColor,
    boxShadow: element.style.boxShadow,
    backdropFilter: element.style.backdropFilter || element.style.webkitBackdropFilter,
  };
}

const EXPECTED_GLASS = {
  background: GLASS.background,
  boxShadow: GLASS.boxShadow,
  backdropFilter: GLASS.backdropFilter,
};

describe("浮层 chrome 设计令牌", () => {
  it("顶栏触发器、工具栏、图层面板共用同一套毛玻璃令牌", () => {
    const topbar = render(<Topbar />).querySelector("button");
    const dock = render(<ToolDock />, { currentTool: "select" })
      .querySelector('[role="toolbar"]');
    const layerPanel = render(<LayerPanel />, { layerPanelCollapsed: false })
      .querySelector("aside");

    for (const element of [topbar, dock, layerPanel]) {
      expect({ tag: element.tagName, ...glassSignature(element) })
        .toEqual({ tag: element.tagName, ...EXPECTED_GLASS });
    }
    // 没有单边覆盖的浮层可以直接校验边框令牌
    expect(topbar.style.border).toBe(GLASS.border);
    expect(dock.style.border).toBe(GLASS.border);
    expect(GLASS.border).toContain("var(--board-stroke)");
  });

  it("贴边拉手用较轻的 raised 阴影，其余令牌与主浮层一致", () => {
    const toggle = render(<LayerPanelToggle collapsed onClick={vi.fn()} />).querySelector("button");

    expect(toggle.style.boxShadow).toBe(GLASS_EDGE.boxShadow);
    expect(toggle.style.boxShadow).not.toBe(GLASS.boxShadow);
    expect(toggle.style.background).toBe(GLASS.background);
  });

  it("chrome 圆角只取令牌里的四档，不出现临时值", () => {
    const allowed = new Set(Object.values(RADIUS).map((value) => `${value}px`));
    const hosts = [
      render(<Topbar />),
      render(<ToolDock />, { currentTool: "select" }),
      render(<StatusBar />, { statusMessage: "就绪", zoomPercent: 100 }),
      render(<LayerPanel />, { layerPanelCollapsed: false }),
      render(<LayerPanelToggle collapsed onClick={vi.fn()} />),
    ];

    const radii = hosts.flatMap((host) => [...host.querySelectorAll("*")]
      .flatMap((element) => (element.style.borderRadius || "")
        .split(/\s+/)
        .filter((part) => part && part !== "0" && part !== "0px" && part !== "50%")));

    expect(radii.length).toBeGreaterThan(0);
    expect([...new Set(radii)].filter((value) => !allowed.has(value))).toEqual([]);
  });

  it("图层选中态使用主色，不引入第二个强调色", () => {
    const host = render(<LayerPanel />, {
      layerPanelCollapsed: false,
      layers: [{ id: "a", name: "笔迹", type: "stroke", level: 1 }],
      selectedLayerIds: ["a"],
    });
    const item = host.querySelector('[data-layer-id="a"]');

    expect(item.style.color).toBe("var(--semi-color-primary)");
    expect(item.style.background).toBe("var(--semi-color-primary-light-default)");
  });
});
