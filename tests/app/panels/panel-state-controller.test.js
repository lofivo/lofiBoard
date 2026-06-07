import { describe, expect, it } from "vitest";
import { createPanelStateController } from "../../../src/app/panels/panel-state-controller.js";

describe("panel-state-controller", () => {
  it("toggles side panel collapse state", () => {
    const controller = createPanelStateController();

    expect(controller.getPanelCollapsedState()).toEqual({ style: false, layers: true });
    expect(controller.togglePanel("style")).toEqual({ style: true, layers: true });
  });

  it("collapses the layer panel when layer content disappears without forcing it open when content exists", () => {
    const controller = createPanelStateController();

    controller.togglePanel("layers");
    expect(controller.setPanelCollapsedStateForLayerContent(false)).toEqual({ style: false, layers: true });
    controller.setPanelCollapsedStateForLayerContent(true);

    expect(controller.getPanelCollapsedState()).toEqual({ style: false, layers: true });
  });

  it("resets inspector sections when context changes or force reset is requested", () => {
    const controller = createPanelStateController();

    expect(controller.syncInspectorContext("linear")).toEqual({
      context: "linear",
      sections: { appearance: false, linear: true, graph: false, tree: false },
      shouldResetScroll: true,
    });
    expect(controller.syncInspectorContext("linear")).toMatchObject({ shouldResetScroll: false });
    expect(controller.syncInspectorContext("linear", { forceReset: true })).toMatchObject({ shouldResetScroll: true });
  });

  it("toggles inspector sections inside the current context", () => {
    const controller = createPanelStateController();

    expect(controller.toggleInspectorSection("appearance")).toEqual({
      appearance: false,
      linear: false,
      graph: false,
      tree: false,
    });
  });
});
