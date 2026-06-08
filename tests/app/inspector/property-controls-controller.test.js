import { describe, expect, it } from "vitest";
import {
  DEFAULT_PROPERTY_CONTROLS,
  createPropertyControlsController,
} from "../../../src/app/inspector/property-controls-controller.js";
import { TOOLS } from "../../../src/ui/config.js";

describe("property-controls-controller", () => {
  it("returns immutable default control snapshots", () => {
    const controller = createPropertyControlsController();
    const defaults = controller.getDefaultControls();

    defaults.width = "99";

    expect(controller.getDefaultControls().width).toBe(DEFAULT_PROPERTY_CONTROLS.width);
  });

  it("creates tool-specific default controls for sticky notes", () => {
    const controller = createPropertyControlsController();

    expect(controller.getDefaultControlsForTool(TOOLS.STICKY)).toMatchObject({
      fill: "#fef08a",
      fillTransparent: false,
    });
  });

  it("saves and restores independent snapshots per tool", () => {
    const controller = createPropertyControlsController();
    const snapshot = {
      ...controller.getDefaultControls(),
      color: "#ef4444",
      width: "12",
    };

    controller.saveToolControls(TOOLS.PEN, snapshot);
    snapshot.width = "20";

    expect(controller.getToolControls(TOOLS.PEN)).toMatchObject({
      color: "#ef4444",
      width: "12",
    });
    expect(controller.getToolControls(TOOLS.TEXT)).toBeNull();
  });
});
