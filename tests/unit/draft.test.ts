import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it } from "vitest";
import { clearDraft, DRAFT_KEY, readDraft, recover, writeDraft } from "../../src/draft.ts";
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
    storage.setItem(DRAFT_KEY, JSON.stringify({ id: "abcdefgh23", text: "x", updated: Infinity }));
    expect(readDraft(storage)).toBeNull();
    storage.setItem(DRAFT_KEY, JSON.stringify({ id: "nope", text: "x", updated: 1 }));
    expect(readDraft(storage)).toBeNull();
  });
  it("round-trips through writeDraft", () => {
    const storage = memoryStorage();
    writeDraft(storage, { id: "abcdefgh23", text: "hi", updated: 7 });
    expect(readDraft(storage)).toEqual({ id: "abcdefgh23", text: "hi", updated: 7 });
  });
});

describe("clearDraft", () => {
  it("leaves another note's draft alone", () => {
    const storage = memoryStorage();
    writeDraft(storage, { id: "abcdefgh2a", text: "mine", updated: 1 });
    clearDraft(storage, "abcdefgh2b");
    expect(readDraft(storage)?.id).toBe("abcdefgh2a");
    clearDraft(storage, "abcdefgh2a");
    expect(readDraft(storage)).toBeNull();
  });
});

describe("recover", () => {
  it("writes a newer draft back and clears it", async () => {
    const store = await openStore(new IDBFactory());
    const storage = memoryStorage();
    await store.put({ id: "abcdefgh2a", text: "old", created: 1, updated: 2 });
    writeDraft(storage, { id: "abcdefgh2a", text: "newer", updated: 3 });
    const note = await recover(store, storage);
    expect(note).toEqual({ id: "abcdefgh2a", text: "newer", created: 1, updated: 3 });
    expect(await store.get("abcdefgh2a")).toEqual(note);
    expect(readDraft(storage)).toBeNull();
  });
  it("leaves a stored note that is already current", async () => {
    const store = await openStore(new IDBFactory());
    const storage = memoryStorage();
    await store.put({ id: "abcdefgh2a", text: "current", created: 1, updated: 5 });
    writeDraft(storage, { id: "abcdefgh2a", text: "stale", updated: 4 });
    expect(await recover(store, storage)).toBeNull();
    expect((await store.get("abcdefgh2a"))?.text).toBe("current");
    expect(readDraft(storage)).toBeNull();
  });
  it("creates the note when nothing was stored", async () => {
    const store = await openStore(new IDBFactory());
    const storage = memoryStorage();
    writeDraft(storage, { id: "abcdefgh2b", text: "only here", updated: 9 });
    const note = await recover(store, storage);
    expect(note).toEqual({ id: "abcdefgh2b", text: "only here", created: 9, updated: 9 });
  });
  it("drops an empty draft that was never stored", async () => {
    const store = await openStore(new IDBFactory());
    const storage = memoryStorage();
    writeDraft(storage, { id: "abcdefgh2c", text: "  ", updated: 9 });
    expect(await recover(store, storage)).toBeNull();
    expect(await store.list()).toEqual([]);
  });
});
