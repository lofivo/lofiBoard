import { normalizeBoard } from "../board/model.js";

export const LOCAL_DRAFT_KEY = "lofiBoard:auto-draft:v1";
export const LOCAL_DRAFT_FILE_NAME = "自动草稿";

function getDefaultStorage() {
  return globalThis.localStorage ?? null;
}

export function loadLocalDraft(storage = getDefaultStorage()) {
  if (!storage) return { ok: true, board: null };

  try {
    const raw = storage.getItem(LOCAL_DRAFT_KEY);
    if (!raw) return { ok: true, board: null };

    return {
      ok: true,
      board: normalizeBoard(JSON.parse(raw)),
    };
  } catch (error) {
    return { ok: false, board: null, error };
  }
}

export function saveLocalDraft(board, storage = getDefaultStorage()) {
  if (!storage) return { ok: false, error: new Error("localStorage 不可用") };

  try {
    storage.setItem(LOCAL_DRAFT_KEY, JSON.stringify(board));
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
}

export function clearLocalDraft(storage = getDefaultStorage()) {
  if (!storage) return { ok: true };

  try {
    storage.removeItem(LOCAL_DRAFT_KEY);
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
}
