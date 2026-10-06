import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it } from "vitest";
import { DRAFT_KEY, readDraft, recover, writeDraft } from "../../src/draft.ts";
import { openStore } from "../../src/store.ts";

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k) => map.get(k) ?? null,
    key: (i) => [...map.keys()][i] ?? null,
    removeItem: (k) => void map.delete(k),
    setItem: (k, v) => void map.set(k, v),
  };
}

describe("readDraft", () => {
  it("returns null for missing or malformed drafts", () => {
    const storage = memoryStorage();
    expect(readDraft(storage)).toBeNull();
    storage.setItem(DRAFT_KEY, "{not json");
    expect(readDraft(storage)).toBeNull();
    storage.setItem(DRAFT_KEY, JSON.stringify({ id: 1 }));
    expect(readDraft(storage)).toBeNull();
  });
  it("round-trips through writeDraft", () => {
    const storage = memoryStorage();
    writeDraft(storage, { id: "abc", text: "hi", updated: 7 });
    expect(readDraft(storage)).toEqual({ id: "abc", text: "hi", updated: 7 });
  });
});

describe("recover", () => {
  it("writes a newer draft back and clears it", async () => {
    const store = await openStore(new IDBFactory());
    const storage = memoryStorage();
    await store.put({ id: "a", text: "old", created: 1, updated: 2 });
    writeDraft(storage, { id: "a", text: "newer", updated: 3 });
    const note = await recover(store, storage);
    expect(note).toEqual({ id: "a", text: "newer", created: 1, updated: 3 });
    expect(await store.get("a")).toEqual(note);
    expect(readDraft(storage)).toBeNull();
  });
  it("leaves a stored note that is already current", async () => {
    const store = await openStore(new IDBFactory());
    const storage = memoryStorage();
    await store.put({ id: "a", text: "current", created: 1, updated: 5 });
    writeDraft(storage, { id: "a", text: "stale", updated: 4 });
    expect(await recover(store, storage)).toBeNull();
    expect((await store.get("a"))?.text).toBe("current");
    expect(readDraft(storage)).toBeNull();
  });
  it("creates the note when nothing was stored", async () => {
    const store = await openStore(new IDBFactory());
    const storage = memoryStorage();
    writeDraft(storage, { id: "b", text: "only here", updated: 9 });
    const note = await recover(store, storage);
    expect(note).toEqual({ id: "b", text: "only here", created: 9, updated: 9 });
  });
  it("drops an empty draft that was never stored", async () => {
    const store = await openStore(new IDBFactory());
    const storage = memoryStorage();
    writeDraft(storage, { id: "c", text: "  ", updated: 9 });
    expect(await recover(store, storage)).toBeNull();
    expect(await store.list()).toEqual([]);
  });
});
