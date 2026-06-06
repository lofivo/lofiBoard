export function createBoardSessionController({
  createInitialBoard,
  createHistory,
  normalizeBoard = (nextBoard) => nextBoard,
  serializeBoard,
  getViewport,
  sanitizeElementsForPersistence = (elements) => elements,
  saveLocalDraft = () => ({ ok: true }),
  loadLocalDraft = () => ({ ok: true, board: null }),
  clearLocalDraft = () => {},
  supportsFileSystemAccess = () => true,
  openWhiteboardFile = null,
  chooseWhiteboardSaveFile = null,
  writeWhiteboardFile = null,
  localDraftFileName = "自动草稿",
  defaultFileName = "未命名白板",
  setTimeoutFn = (callback, delay) => setTimeout(callback, delay),
  clearTimeoutFn = (timer) => clearTimeout(timer),
  commitActiveEdit = null,
  onSessionChanged = null,
  onBoardReplaced = null,
  onSelectionCleared = null,
  onStatus = null,
}) {
  let board = createInitialBoard();
  let history = createHistory(board);
  let fileHandle = null;
  let activeFileName = defaultFileName;
  let dirty = false;
  let draftSaveTimer = null;
  let suppressNextTextHistory = false;

  function serializeCurrentBoard() {
    const elements = sanitizeElementsForPersistence(board.elements);
    return serializeBoard({
      ...board,
      elements,
    }, getViewport());
  }

  function emitSessionChanged() {
    onSessionChanged?.({
      board,
      activeFileName,
      dirty,
      fileHandle,
    });
  }

  function persistCurrentDraft() {
    if (draftSaveTimer) {
      clearTimeoutFn(draftSaveTimer);
      draftSaveTimer = null;
    }
    if (commitActiveEdit && !suppressNextTextHistory) {
      suppressNextTextHistory = true;
      const didCommit = commitActiveEdit();
      if (!didCommit && suppressNextTextHistory) {
        suppressNextTextHistory = false;
      }
    }
    const result = saveLocalDraft(serializeCurrentBoard());
    if (!result.ok) {
      onStatus?.("自动草稿保存失败");
      return false;
    }
    return true;
  }

  function pushHistory(message) {
    const historySnapshot = serializeCurrentBoard();
    history.push(historySnapshot);
    dirty = true;
    const draftSaved = persistCurrentDraft();
    emitSessionChanged();
    if (suppressNextTextHistory) {
      suppressNextTextHistory = false;
      return;
    }
    if (draftSaved) onStatus?.(message);
  }

  function replaceBoard(nextBoard, { resetHistory = false, clearSelection = true } = {}) {
    board = nextBoard;
    if (resetHistory) history = createHistory(board);
    if (clearSelection) onSelectionCleared?.();
    onBoardReplaced?.(board);
    emitSessionChanged();
  }

  function restoreFromHistory(nextBoard, message) {
    if (!nextBoard) return;
    replaceBoard(normalizeBoard(nextBoard));
    dirty = true;
    const draftSaved = persistCurrentDraft();
    emitSessionChanged();
    if (draftSaved) onStatus?.(message);
  }

  function hydrateLocalDraft() {
    const result = loadLocalDraft();
    if (!result.ok) return { restored: false, message: "自动草稿恢复失败" };
    if (!result.board) return { restored: false };

    fileHandle = null;
    activeFileName = localDraftFileName;
    dirty = true;
    replaceBoard(result.board, { resetHistory: true });
    return { restored: true, message: "已恢复自动草稿" };
  }

  async function openBoardFileAction() {
    if (!supportsFileSystemAccess()) {
      onStatus?.("当前浏览器不支持原地打开保存，请使用 Chrome 或 Edge");
      return;
    }

    try {
      const { handle, name, contents } = await openWhiteboardFile();
      fileHandle = handle;
      activeFileName = name;
      dirty = false;
      replaceBoard(normalizeBoard(contents), { resetHistory: true });
      const draftSaved = persistCurrentDraft();
      emitSessionChanged();
      if (draftSaved) onStatus?.("已打开白板文件");
    } catch (error) {
      if (error?.name !== "AbortError") {
        onStatus?.(`打开失败：${error.message}`);
      }
    }
  }

  async function writeToHandle(handle) {
    await writeWhiteboardFile(handle, serializeCurrentBoard());
  }

  async function saveBoardFileAs() {
    if (!supportsFileSystemAccess()) {
      onStatus?.("当前浏览器不支持另存为，请使用 Chrome 或 Edge");
      return;
    }

    try {
      const handle = await chooseWhiteboardSaveFile(activeFileName);
      fileHandle = handle;
      activeFileName = handle.name;
      await writeToHandle(handle);
      dirty = false;
      emitSessionChanged();
      onStatus?.("已另存为白板文件");
    } catch (error) {
      if (error?.name !== "AbortError") {
        onStatus?.(`另存为失败：${error.message}`);
      }
    }
  }

  async function saveBoardFile() {
    if (!supportsFileSystemAccess()) {
      onStatus?.("当前浏览器不支持原地保存，请使用 Chrome 或 Edge");
      return;
    }

    if (!fileHandle) {
      await saveBoardFileAs();
      return;
    }

    try {
      await writeToHandle(fileHandle);
      dirty = false;
      emitSessionChanged();
      onStatus?.("已保存到当前白板文件");
    } catch (error) {
      onStatus?.(`保存失败：${error.message}`);
    }
  }

  function newBoard() {
    fileHandle = null;
    activeFileName = defaultFileName;
    dirty = false;
    replaceBoard(createInitialBoard(), { resetHistory: true });
    clearLocalDraft();
    onStatus?.("已新建白板");
  }

  function schedulePersistCurrentDraft() {
    if (draftSaveTimer) clearTimeoutFn(draftSaveTimer);
    draftSaveTimer = setTimeoutFn(() => {
      draftSaveTimer = null;
      persistCurrentDraft();
    }, 150);
  }

  function destroy() {
    if (draftSaveTimer) {
      clearTimeoutFn(draftSaveTimer);
      draftSaveTimer = null;
    }
  }

  return {
    getBoard: () => board,
    getHistory: () => history,
    getFileHandle: () => fileHandle,
    getActiveFileName: () => activeFileName,
    isDirty: () => dirty,
    setBoard: (nextBoard) => { board = nextBoard; emitSessionChanged(); },
    setFileHandle: (nextFileHandle) => { fileHandle = nextFileHandle; emitSessionChanged(); },
    setDirty: (nextDirty) => { dirty = Boolean(nextDirty); emitSessionChanged(); },
    serializeCurrentBoard,
    persistCurrentDraft,
    schedulePersistCurrentDraft,
    pushHistory,
    restoreFromHistory,
    hydrateLocalDraft,
    openBoardFile: openBoardFileAction,
    saveBoardFile,
    saveBoardFileAs,
    writeToHandle,
    newBoard,
    destroy,
  };
}
