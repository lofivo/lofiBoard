import { describe, expect, it } from "vitest";
import { createStructureInspectorController } from "../../../src/app/structures/inspector-controller.js";

describe("inspector-controller", () => {
  it("tracks linear inspector fields", () => {
    const controller = createStructureInspectorController();

    expect(controller.getLinearPanelState()).toEqual({
      highlightStart: "0",
      highlightEnd: "0",
      highlightPointer: "0",
    });

    controller.setLinearPanelField("highlightPointer", "3");
    expect(controller.getLinearPanelState().highlightPointer).toBe("3");
  });

  it("updates linear panel state as an immutable snapshot", () => {
    const controller = createStructureInspectorController();
    const nextState = controller.setLinearPanelState({ highlightStart: "2" });

    nextState.highlightStart = "9";

    expect(controller.getLinearPanelState().highlightStart).toBe("2");
  });

  it("tracks linear values and graph structure drafts independently", () => {
    const controller = createStructureInspectorController();

    controller.setLinearValuesDraft("1,2,3");
    controller.setGraphStructureDraft("A->B");

    expect(controller.getLinearValuesDraft()).toBe("1,2,3");
    expect(controller.getGraphStructureDraft()).toBe("A->B");
  });
});
