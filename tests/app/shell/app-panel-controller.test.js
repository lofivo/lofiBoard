import { describe, expect, it, vi } from "vitest";
import { createAppPanelController } from "../../../src/app/shell/app-panel-controller.js";
import { createMenuStateController } from "../../../src/app/panels/menu-state-controller.js";
import { createStructurePanelController } from "../../../src/app/structures/structure-panel-controller.js";

function createClassList() {
  return { toggle: vi.fn() };
}

function createButton(dataset) {
  return {
    dataset,
    classList: createClassList(),
  };
}

function createController() {
  const structureTypeButtons = [
    createButton({ structureType: "array" }),
    createButton({ structureType: "tree" }),
  ];
  const arrayInitModeButtons = [
    createButton({ arrayInitMode: "manual" }),
    createButton({ arrayInitMode: "random" }),
  ];
  const root = {
    querySelectorAll: vi.fn((selector) => {
      if (selector === "[data-structure-type]") return structureTypeButtons;
      if (selector === "[data-array-init-mode]") return arrayInitModeButtons;
      return [];
    }),
  };
  const mainMenu = { hidden: true };
  const menuButton = {
    setAttribute: vi.fn(),
    classList: createClassList(),
  };
  const shapePopover = { hidden: true };
  const structurePanel = { hidden: true };
  const structureInput = {
    focus: vi.fn(),
    placeholder: "",
    value: "",
  };
  const linearInitPanel = { hidden: true };
  const structureInputLabel = { hidden: true };
  const arrayRandomFields = { hidden: true };
  const zoomMenu = { hidden: true };
  const zoomButton = {
    setAttribute: vi.fn(),
    classList: createClassList(),
  };
  const controller = createAppPanelController({
    root,
    refs: {
      mainMenu,
      menuButton,
      shapePopover,
      structurePanel,
      structureInput,
      linearInitPanel,
      structureInputLabel,
      arrayRandomFields,
      zoomMenu,
      zoomButton,
    },
    menuStateController: createMenuStateController(),
    structurePanelController: createStructurePanelController(),
    requestAnimationFrame: (callback) => callback(),
  });
  return {
    arrayInitModeButtons,
    controller,
    mainMenu,
    menuButton,
    shapePopover,
    structureInput,
    structurePanel,
    structureTypeButtons,
    zoomButton,
    zoomMenu,
  };
}

describe("app-panel-controller", () => {
  it("toggles the main and zoom menus", () => {
    const { controller, mainMenu, menuButton, zoomButton, zoomMenu } = createController();

    controller.toggleMainMenu();
    expect(mainMenu.hidden).toBe(false);
    expect(menuButton.setAttribute).toHaveBeenCalledWith("aria-expanded", "true");
    expect(menuButton.classList.toggle).toHaveBeenCalledWith("active", true);

    controller.closeMainMenu();
    expect(mainMenu.hidden).toBe(true);

    controller.toggleZoomMenu();
    expect(zoomMenu.hidden).toBe(false);
    expect(zoomButton.setAttribute).toHaveBeenCalledWith("aria-expanded", "true");
    expect(zoomButton.classList.toggle).toHaveBeenCalledWith("active", true);
  });

  it("hydrates the structure panel and focuses the input when opened", () => {
    const {
      arrayInitModeButtons,
      controller,
      structureInput,
      structurePanel,
      structureTypeButtons,
    } = createController();

    controller.setStructurePanelOpen(true);

    expect(structurePanel.hidden).toBe(false);
    expect(structureInput.placeholder).toBe("1,2,3,4,5");
    expect(structureInput.value).toBe("1,2,3,4,5");
    expect(structureInput.focus).toHaveBeenCalled();
    expect(structureTypeButtons[0].classList.toggle).toHaveBeenCalledWith("active", true);
    expect(arrayInitModeButtons[0].classList.toggle).toHaveBeenCalledWith("active", true);
  });

  it("sets active structure type and updates shape popover visibility", () => {
    const { controller, shapePopover, structureInput, structureTypeButtons } = createController();

    controller.setActiveStructureType("tree");
    expect(structureInput.focus).toHaveBeenCalled();
    expect(structureTypeButtons[1].classList.toggle).toHaveBeenCalledWith("active", true);

    controller.setShapePopoverOpen(true);
    expect(shapePopover.hidden).toBe(false);
    controller.setShapePopoverOpen(false);
    expect(shapePopover.hidden).toBe(true);
  });
});
