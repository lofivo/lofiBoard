import { describe, expect, it, vi } from "vitest";
import { createBoardSessionActionController } from "../../../../src/app/shell/board-session/action-controller.js";

function createController({
  history = {
    undo: vi.fn(() => ({ id: "undo-board" })),
    redo: vi.fn(() => ({ id: "redo-board" })),
  },
  hydrateResult = {},
} = {}) {
  const board = { id: "current-board" };
  const boardSession = {
    getHistory: vi.fn(() => history),
    hydrateLocalDraft: vi.fn(() => hydrateResult),
    newBoard: vi.fn(),
    openBoardFile: vi.fn(() => Promise.resolve("opened")),
    persistCurrentDraft: vi.fn(() => true),
    pushHistory: vi.fn(),
    restoreFromHistory: vi.fn(),
    saveBoardFile: vi.fn(() => Promise.resolve("saved")),
    saveBoardFileAs: vi.fn(() => Promise.resolve("saved-as")),
    schedulePersistCurrentDraft: vi.fn(),
    serializeCurrentBoard: vi.fn(() => ({ id: "serialized" })),
    setBoard: vi.fn(),
    writeToHandle: vi.fn(() => Promise.resolve("written")),
  };
  const callbacks = {
    cancelArrayAlgorithmPlayback: vi.fn(),
    cancelArrayAlgorithmSwapAnimation: vi.fn(),
    clearArrayAlgorithmSessions: vi.fn(),
    setInitialStatusMessage: vi.fn(),
  };
  const controller = createBoardSessionActionController({
    boardSession,
    getBoard: () => board,
    ...callbacks,
  });
  return {
    board,
    boardSession,
    callbacks,
    controller,
    history,
  };
}

describe("app shell board-session action-controller", () => {
  it("syncs the current board before serializing, persisting, or pushing history", () => {
    const { board, boardSession, controller } = createController();

    expect(controller.serializeCurrentBoard()).toEqual({ id: "serialized" });
    expect(controller.snapshotBoard()).toEqual({ id: "serialized" });
    controller.pushHistory("已更新");
    controller.persistCurrentDraft();
    controller.schedulePersistCurrentDraft();

    expect(boardSession.setBoard).toHaveBeenCalledWith(board);
    expect(boardSession.pushHistory).toHaveBeenCalledWith("已更新");
    expect(boardSession.persistCurrentDraft).toHaveBeenCalled();
    expect(boardSession.schedulePersistCurrentDraft).toHaveBeenCalled();
  });

  it("clears volatile algorithm state before replacing the board session", () => {
    const { boardSession, callbacks, controller, history } = createController();

    controller.undoHistory();
    controller.redoHistory();
    controller.newBoard();

    expect(history.undo).toHaveBeenCalled();
    expect(history.redo).toHaveBeenCalled();
    expect(boardSession.restoreFromHistory).toHaveBeenCalledWith({ id: "undo-board" }, "已撤销");
    expect(boardSession.restoreFromHistory).toHaveBeenCalledWith({ id: "redo-board" }, "已重做");
    expect(boardSession.newBoard).toHaveBeenCalled();
    expect(callbacks.cancelArrayAlgorithmPlayback).toHaveBeenCalledTimes(3);
    expect(callbacks.cancelArrayAlgorithmSwapAnimation).toHaveBeenCalledWith({ commitStableState: false });
    expect(callbacks.clearArrayAlgorithmSessions).toHaveBeenCalledTimes(3);
  });

  it("does not clear volatile state when there is no history snapshot to restore", () => {
    const { boardSession, callbacks, controller } = createController({
      history: { undo: vi.fn(() => null), redo: vi.fn() },
    });

    controller.undoHistory();

    expect(boardSession.restoreFromHistory).not.toHaveBeenCalled();
    expect(callbacks.cancelArrayAlgorithmPlayback).not.toHaveBeenCalled();
  });

  it("captures the local draft recovery status message", () => {
    const { callbacks, controller } = createController({
      hydrateResult: { restored: true, message: "已恢复自动草稿" },
    });

    expect(controller.hydrateLocalDraft()).toEqual({ restored: true, message: "已恢复自动草稿" });
    expect(callbacks.setInitialStatusMessage).toHaveBeenCalledWith("已恢复自动草稿");
  });

  it("delegates async file actions to the board session", async () => {
    const { boardSession, controller } = createController();
    const handle = { name: "demo.lofibrd" };

    await expect(controller.openBoardFile()).resolves.toBe("opened");
    await expect(controller.saveBoardFile()).resolves.toBe("saved");
    await expect(controller.saveBoardFileAs()).resolves.toBe("saved-as");
    await expect(controller.writeToHandle(handle)).resolves.toBe("written");

    expect(boardSession.openBoardFile).toHaveBeenCalled();
    expect(boardSession.saveBoardFile).toHaveBeenCalled();
    expect(boardSession.saveBoardFileAs).toHaveBeenCalled();
    expect(boardSession.writeToHandle).toHaveBeenCalledWith(handle);
  });
});
