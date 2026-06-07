import { describe, expect, it, vi } from "vitest";
import { createBoardSessionController } from "../../src/app/shell/board-session-controller.js";

function createTestBoard(overrides = {}) {
  return {
    version: 1,
    app: "lofiBoard",
    canvas: { backgroundMode: "plain" },
    viewport: { x: 0, y: 0, scale: 1 },
    elements: [],
    ...overrides,
  };
}

function createController(options = {}) {
  const board = options.board ?? createTestBoard();
  const history = options.history ?? {
    push: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
  };
  return createBoardSessionController({
    createInitialBoard: () => board,
    createHistory: () => history,
    normalizeBoard: (input) => ({ ...input, normalized: true }),
    serializeBoard: (nextBoard, viewport) => ({ ...nextBoard, viewport, serialized: true }),
    getViewport: () => ({ x: 12, y: 24, scale: 2 }),
    sanitizeElementsForPersistence: options.sanitizeElementsForPersistence ?? ((elements) => elements),
    saveLocalDraft: options.saveLocalDraft ?? (() => ({ ok: true })),
    loadLocalDraft: options.loadLocalDraft ?? (() => ({ ok: true, board: null })),
    clearLocalDraft: options.clearLocalDraft ?? (() => {}),
    supportsFileSystemAccess: options.supportsFileSystemAccess ?? (() => true),
    openWhiteboardFile: options.openWhiteboardFile ?? vi.fn(),
    chooseWhiteboardSaveFile: options.chooseWhiteboardSaveFile ?? vi.fn(),
    writeWhiteboardFile: options.writeWhiteboardFile ?? vi.fn(),
    localDraftFileName: "自动草稿",
    setTimeoutFn: options.setTimeoutFn ?? (() => 1),
    clearTimeoutFn: options.clearTimeoutFn ?? (() => {}),
    commitActiveEdit: options.commitActiveEdit,
    ...options.callbacks,
  });
}

describe("board-session-controller", () => {
  it("serializes the current board through the injected persistence sanitizer", () => {
    const transientElement = { id: "array-1", runtime: { activeIndex: 1 } };
    const persistedElement = { id: "array-1" };
    const sanitizeElementsForPersistence = vi.fn(() => [persistedElement]);
    const controller = createController({
      board: createTestBoard({ elements: [transientElement] }),
      sanitizeElementsForPersistence,
    });

    expect(controller.serializeCurrentBoard()).toEqual({
      version: 1,
      app: "lofiBoard",
      canvas: { backgroundMode: "plain" },
      viewport: { x: 12, y: 24, scale: 2 },
      elements: [persistedElement],
      serialized: true,
    });
    expect(sanitizeElementsForPersistence).toHaveBeenCalledWith([transientElement]);
  });

  it("pushes undo history, persists the draft, marks the session dirty, and reports status", () => {
    const saveLocalDraft = vi.fn(() => ({ ok: true }));
    const onStatus = vi.fn();
    const onSessionChanged = vi.fn();
    const controller = createController({
      board: createTestBoard({ elements: [{ id: "a" }] }),
      saveLocalDraft,
      callbacks: { onStatus, onSessionChanged },
    });

    controller.pushHistory("已更新画板");

    expect(controller.getHistory().push).toHaveBeenCalledWith({
      version: 1,
      app: "lofiBoard",
      canvas: { backgroundMode: "plain" },
      viewport: { x: 12, y: 24, scale: 2 },
      elements: [{ id: "a" }],
      serialized: true,
    });
    expect(saveLocalDraft).toHaveBeenCalledWith({
      version: 1,
      app: "lofiBoard",
      canvas: { backgroundMode: "plain" },
      viewport: { x: 12, y: 24, scale: 2 },
      elements: [{ id: "a" }],
      serialized: true,
    });
    expect(controller.isDirty()).toBe(true);
    expect(onSessionChanged).toHaveBeenCalledWith(expect.objectContaining({ dirty: true }));
    expect(onStatus).toHaveBeenCalledWith("已更新画板");
  });

  it("restores a history snapshot through normalization and refresh callbacks", () => {
    const saveLocalDraft = vi.fn(() => ({ ok: true }));
    const onBoardReplaced = vi.fn();
    const onSelectionCleared = vi.fn();
    const onStatus = vi.fn();
    const controller = createController({
      board: createTestBoard({ elements: [{ id: "before" }] }),
      saveLocalDraft,
      callbacks: { onBoardReplaced, onSelectionCleared, onStatus },
    });

    controller.restoreFromHistory(createTestBoard({
      viewport: { x: 5, y: 6, scale: 1.5 },
      elements: [{ id: "after" }],
    }), "已撤销");

    const restoredBoard = {
      version: 1,
      app: "lofiBoard",
      canvas: { backgroundMode: "plain" },
      viewport: { x: 5, y: 6, scale: 1.5 },
      elements: [{ id: "after" }],
      normalized: true,
    };
    expect(controller.getBoard()).toEqual(restoredBoard);
    expect(onSelectionCleared).toHaveBeenCalled();
    expect(onBoardReplaced).toHaveBeenCalledWith(restoredBoard);
    expect(controller.isDirty()).toBe(true);
    expect(saveLocalDraft).toHaveBeenCalledWith({
      ...restoredBoard,
      viewport: { x: 12, y: 24, scale: 2 },
      serialized: true,
    });
    expect(onStatus).toHaveBeenCalledWith("已撤销");
  });

  it("restores a local draft as the active dirty board session", () => {
    const draftBoard = createTestBoard({ elements: [{ id: "draft" }] });
    const onBoardReplaced = vi.fn();
    const onSelectionCleared = vi.fn();
    const controller = createController({
      loadLocalDraft: () => ({ ok: true, board: draftBoard }),
      callbacks: { onBoardReplaced, onSelectionCleared },
    });

    const result = controller.hydrateLocalDraft();

    expect(result).toEqual({ restored: true, message: "已恢复自动草稿" });
    expect(controller.getBoard()).toEqual(draftBoard);
    expect(controller.getActiveFileName()).toBe("自动草稿");
    expect(controller.isDirty()).toBe(true);
    expect(onSelectionCleared).toHaveBeenCalled();
    expect(onBoardReplaced).toHaveBeenCalledWith(draftBoard);
  });

  it("opens a board file and persists the opened board as the current draft", async () => {
    const openedBoard = createTestBoard({ elements: [{ id: "opened" }] });
    const handle = { name: "demo.lofibrd" };
    const saveLocalDraft = vi.fn(() => ({ ok: true }));
    const onBoardReplaced = vi.fn();
    const onStatus = vi.fn();
    const controller = createController({
      openWhiteboardFile: () => Promise.resolve({ handle, name: "demo.lofibrd", contents: openedBoard }),
      saveLocalDraft,
      callbacks: { onBoardReplaced, onStatus },
    });

    await controller.openBoardFile();

    expect(controller.getBoard()).toEqual({ ...openedBoard, normalized: true });
    expect(controller.getActiveFileName()).toBe("demo.lofibrd");
    expect(controller.isDirty()).toBe(false);
    expect(onBoardReplaced).toHaveBeenCalledWith({ ...openedBoard, normalized: true });
    expect(saveLocalDraft).toHaveBeenCalled();
    expect(onStatus).toHaveBeenCalledWith("已打开白板文件");
  });

  it("saves to the current file handle and clears dirty state", async () => {
    const handle = { name: "current.lofibrd" };
    const writeWhiteboardFile = vi.fn(() => Promise.resolve());
    const onStatus = vi.fn();
    const controller = createController({
      writeWhiteboardFile,
      callbacks: { onStatus },
    });
    controller.setFileHandle(handle);
    controller.pushHistory("已更新画板");

    await controller.saveBoardFile();

    expect(writeWhiteboardFile).toHaveBeenCalledWith(handle, controller.serializeCurrentBoard());
    expect(controller.isDirty()).toBe(false);
    expect(onStatus).toHaveBeenCalledWith("已保存到当前白板文件");
  });

  it("chooses a save target when saving without an active file handle", async () => {
    const handle = { name: "chosen.lofibrd" };
    const chooseWhiteboardSaveFile = vi.fn(() => Promise.resolve(handle));
    const writeWhiteboardFile = vi.fn(() => Promise.resolve());
    const controller = createController({ chooseWhiteboardSaveFile, writeWhiteboardFile });

    await controller.saveBoardFile();

    expect(chooseWhiteboardSaveFile).toHaveBeenCalledWith("未命名白板");
    expect(writeWhiteboardFile).toHaveBeenCalledWith(handle, controller.serializeCurrentBoard());
    expect(controller.getActiveFileName()).toBe("chosen.lofibrd");
    expect(controller.isDirty()).toBe(false);
  });

  it("creates a new clean board session and clears the local draft", () => {
    const clearLocalDraft = vi.fn();
    const onBoardReplaced = vi.fn();
    const onStatus = vi.fn();
    const controller = createController({
      clearLocalDraft,
      callbacks: { onBoardReplaced, onStatus },
    });
    controller.pushHistory("已更新画板");

    controller.newBoard();

    expect(controller.getBoard()).toEqual(createTestBoard());
    expect(controller.getActiveFileName()).toBe("未命名白板");
    expect(controller.isDirty()).toBe(false);
    expect(clearLocalDraft).toHaveBeenCalled();
    expect(onBoardReplaced).toHaveBeenCalledWith(createTestBoard());
    expect(onStatus).toHaveBeenCalledWith("已新建白板");
  });
});
