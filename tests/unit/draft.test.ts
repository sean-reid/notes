import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it } from "vitest";
import { clearDraft, draftIds, draftKey, readDraft, recover, writeDraft } from "../../src/draft.ts";
import { openStore } from "../../src/store.ts";

const A = "abcdefgh2a";
const B = "abcdefgh2b";

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
    expect(readDraft(storage, A)).toBeNull();
    storage.setItem(draftKey(A), "{not json");
    expect(readDraft(storage, A)).toBeNull();
    storage.setItem(draftKey(A), JSON.stringify({ text: 1 }));
    expect(readDraft(storage, A)).toBeNull();
    storage.setItem(draftKey(A), JSON.stringify({ text: "x", updated: Infinity }));
    expect(readDraft(storage, A)).toBeNull();
  });
  it("round-trips through writeDraft", () => {
    const storage = memoryStorage();
    writeDraft(storage, { id: A, text: "hi", updated: 7 });
    expect(readDraft(storage, A)).toEqual({ id: A, text: "hi", updated: 7 });
  });
});

describe("draftIds", () => {
  it("lists only well-formed draft keys", () => {
    const storage = memoryStorage();
    writeDraft(storage, { id: A, text: "a", updated: 1 });
    writeDraft(storage, { id: B, text: "b", updated: 1 });
    storage.setItem("notes:draft:nope", "{}");
    storage.setItem("other", "{}");
    expect(draftIds(storage).sort()).toEqual([A, B]);
  });
});

describe("clearDraft", () => {
  it("leaves another note's draft alone", () => {
    const storage = memoryStorage();
    writeDraft(storage, { id: A, text: "mine", updated: 1 });
    writeDraft(storage, { id: B, text: "theirs", updated: 1 });
    clearDraft(storage, B);
    expect(readDraft(storage, A)?.text).toBe("mine");
    expect(readDraft(storage, B)).toBeNull();
  });
});

describe("recover", () => {
  it("writes a newer draft back and clears it", async () => {
    const store = await openStore(new IDBFactory());
    const storage = memoryStorage();
    await store.put({ id: A, text: "old", created: 1, updated: 2 });
    writeDraft(storage, { id: A, text: "newer", updated: 3 });
    const notes = await recover(store, storage);
    expect(notes).toEqual([{ id: A, text: "newer", created: 1, updated: 3 }]);
    expect(await store.get(A)).toEqual(notes[0]);
    expect(readDraft(storage, A)).toBeNull();
  });
  it("leaves a stored note that is already current", async () => {
    const store = await openStore(new IDBFactory());
    const storage = memoryStorage();
    await store.put({ id: A, text: "current", created: 1, updated: 5 });
    writeDraft(storage, { id: A, text: "stale", updated: 4 });
    expect(await recover(store, storage)).toEqual([]);
    expect((await store.get(A))?.text).toBe("current");
    expect(readDraft(storage, A)).toBeNull();
  });
  it("creates the note when nothing was stored", async () => {
    const store = await openStore(new IDBFactory());
    const storage = memoryStorage();
    writeDraft(storage, { id: B, text: "only here", updated: 9 });
    expect(await recover(store, storage)).toEqual([
      { id: B, text: "only here", created: 9, updated: 9 },
    ]);
  });
  it("drops an empty draft that was never stored", async () => {
    const store = await openStore(new IDBFactory());
    const storage = memoryStorage();
    writeDraft(storage, { id: A, text: "  ", updated: 9 });
    expect(await recover(store, storage)).toEqual([]);
    expect(await store.list()).toEqual([]);
    expect(storage.length).toBe(0);
  });
  it("recovers two notes left by two tabs", async () => {
    const store = await openStore(new IDBFactory());
    const storage = memoryStorage();
    writeDraft(storage, { id: A, text: "tab one", updated: 1 });
    writeDraft(storage, { id: B, text: "tab two", updated: 2 });
    const notes = await recover(store, storage);
    expect(notes.map((n) => n.id).sort()).toEqual([A, B]);
    expect((await store.list()).map((n) => n.text)).toEqual(["tab two", "tab one"]);
    expect(storage.length).toBe(0);
  });
});
