import { describe, expect, it, vi } from "vitest";
import {
  LOCAL_DRAFT_KEY,
  clearLocalDraft,
  loadLocalDraft,
  saveLocalDraft,
} from "../../src/services/draft-storage.js";

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: vi.fn((key) => (values.has(key) ? values.get(key) : null)),
    setItem: vi.fn((key, value) => {
      values.set(key, value);
    }),
    removeItem: vi.fn((key) => {
      values.delete(key);
    }),
  };
}

describe("draft storage service", () => {
  it("saves and restores a normalized local draft", () => {
    const storage = createStorage();
    const board = {
      version: 1,
      app: "lofiBoard",
      canvas: { backgroundMode: "plain" },
      viewport: { x: 32, y: -12, scale: 1.5 },
      elements: [{ id: "rect_1", type: "rect", zIndex: 0, x: 10, y: 20 }],
    };

    expect(saveLocalDraft(board, storage)).toEqual({ ok: true });
    const result = loadLocalDraft(storage);

    expect(storage.setItem).toHaveBeenCalledWith(LOCAL_DRAFT_KEY, JSON.stringify(board));
    expect(result.ok).toBe(true);
    expect(result.board).toMatchObject({
      canvas: { backgroundMode: "plain" },
      viewport: { x: 32, y: -12, scale: 1.5 },
      elements: [{ id: "rect_1", type: "rect", x: 10, y: 20 }],
    });
  });

  it("returns an empty result when no draft exists", () => {
    const storage = createStorage();

    expect(loadLocalDraft(storage)).toEqual({ ok: true, board: null });
  });

  it("keeps broken draft data when restore fails", () => {
    const storage = createStorage({ [LOCAL_DRAFT_KEY]: "{broken" });
    const result = loadLocalDraft(storage);

    expect(result.ok).toBe(false);
    expect(result.board).toBeNull();
    expect(storage.removeItem).not.toHaveBeenCalled();
  });

  it("reports localStorage write failures without throwing", () => {
    const error = new Error("quota exceeded");
    const storage = createStorage();
    storage.setItem.mockImplementation(() => {
      throw error;
    });

    const result = saveLocalDraft({ version: 1 }, storage);

    expect(result.ok).toBe(false);
    expect(result.error).toBe(error);
  });

  it("clears the stored local draft", () => {
    const storage = createStorage({ [LOCAL_DRAFT_KEY]: "{}" });

    expect(clearLocalDraft(storage)).toEqual({ ok: true });
    expect(storage.removeItem).toHaveBeenCalledWith(LOCAL_DRAFT_KEY);
  });
});
