import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it } from "vitest";
import { openStore } from "../../src/store.ts";

const note = (id: string, updated: number) => ({ id, text: `note ${id}`, created: 1, updated });

describe("openStore", () => {
  it("round-trips a note", async () => {
    const store = await openStore(new IDBFactory());
    await store.put(note("a", 5));
    expect(await store.get("a")).toEqual(note("a", 5));
    expect(await store.get("missing")).toBeUndefined();
  });
  it("lists newest first and forgets removed notes", async () => {
    const store = await openStore(new IDBFactory());
    await store.put(note("a", 1));
    await store.put(note("b", 3));
    await store.put(note("c", 2));
    expect((await store.list()).map((n) => n.id)).toEqual(["b", "c", "a"]);
    await store.remove("b");
    expect((await store.list()).map((n) => n.id)).toEqual(["c", "a"]);
  });
  it("overwrites on the same id", async () => {
    const store = await openStore(new IDBFactory());
    await store.put(note("a", 1));
    await store.put({ ...note("a", 2), text: "changed" });
    expect((await store.list()).length).toBe(1);
    expect((await store.get("a"))?.text).toBe("changed");
  });
});
