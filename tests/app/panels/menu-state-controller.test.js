import { describe, expect, it } from "vitest";
import { createMenuStateController } from "../../../src/app/panels/menu-state-controller.js";

describe("menu-state-controller", () => {
  it("tracks main menu open state", () => {
    const controller = createMenuStateController();

    expect(controller.isMainMenuOpen()).toBe(false);
    expect(controller.toggleMainMenu()).toBe(true);
    expect(controller.setMainMenuOpen(false)).toBe(false);
  });

  it("tracks zoom menu open state independently", () => {
    const controller = createMenuStateController();

    expect(controller.isZoomMenuOpen()).toBe(false);
    expect(controller.toggleZoomMenu()).toBe(true);
    expect(controller.isMainMenuOpen()).toBe(false);
    expect(controller.setZoomMenuOpen(false)).toBe(false);
  });
});
