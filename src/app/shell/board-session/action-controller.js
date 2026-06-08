export function createBoardSessionActionController({
  boardSession,
  getBoard,
  cancelArrayAlgorithmPlayback,
  cancelArrayAlgorithmSwapAnimation,
  clearArrayAlgorithmSessions,
  setInitialStatusMessage,
}) {
  function cancelVolatileBoardState() {
    cancelArrayAlgorithmPlayback();
    cancelArrayAlgorithmSwapAnimation({ commitStableState: false });
    clearArrayAlgorithmSessions();
  }

  function hydrateLocalDraft() {
    const result = boardSession.hydrateLocalDraft();
    if (result.message) setInitialStatusMessage(result.message);
    return result;
  }

  function newBoard() {
    cancelVolatileBoardState();
    boardSession.newBoard();
  }

  function undoHistory() {
    restoreFromHistory(boardSession.getHistory().undo(), "已撤销");
  }

  function redoHistory() {
    restoreFromHistory(boardSession.getHistory().redo(), "已重做");
  }

  function restoreFromHistory(nextBoard, message) {
    if (!nextBoard) return;
    cancelVolatileBoardState();
    boardSession.restoreFromHistory(nextBoard, message);
  }

  async function openBoardFile() {
    return boardSession.openBoardFile();
  }

  async function saveBoardFile() {
    return boardSession.saveBoardFile();
  }

  async function saveBoardFileAs() {
    return boardSession.saveBoardFileAs();
  }

  async function writeToHandle(handle) {
    return boardSession.writeToHandle(handle);
  }

  function serializeCurrentBoard() {
    boardSession.setBoard(getBoard());
    return boardSession.serializeCurrentBoard();
  }

  function snapshotBoard() {
    return serializeCurrentBoard();
  }

  function pushHistory(message) {
    boardSession.setBoard(getBoard());
    boardSession.pushHistory(message);
  }

  function persistCurrentDraft() {
    boardSession.setBoard(getBoard());
    return boardSession.persistCurrentDraft();
  }

  function schedulePersistCurrentDraft() {
    boardSession.setBoard(getBoard());
    boardSession.schedulePersistCurrentDraft();
  }

  return {
    hydrateLocalDraft,
    newBoard,
    openBoardFile,
    persistCurrentDraft,
    pushHistory,
    redoHistory,
    restoreFromHistory,
    saveBoardFile,
    saveBoardFileAs,
    schedulePersistCurrentDraft,
    serializeCurrentBoard,
    snapshotBoard,
    undoHistory,
    writeToHandle,
  };
}
