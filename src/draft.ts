import type { Note, NoteStore } from "./store.ts";

export interface Draft {
  id: string;
  text: string;
  updated: number;
}

export const DRAFT_KEY = "notes:draft";

export function readDraft(storage: Storage): Draft | null {
  try {
    const raw = storage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const { id, text, updated } = parsed as Record<string, unknown>;
    if (typeof id !== "string" || typeof text !== "string" || typeof updated !== "number") {
      return null;
    }
    return { id, text, updated };
  } catch {
    return null;
  }
}

export function writeDraft(storage: Storage, draft: Draft): void {
  try {
    storage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Quota or private mode: the IndexedDB write still lands.
  }
}

export function clearDraft(storage: Storage): void {
  storage.removeItem(DRAFT_KEY);
}

// A draft newer than the stored note means the tab closed before the
// IndexedDB write landed. Write it back and clear it either way.
export async function recover(store: NoteStore, storage: Storage): Promise<Note | null> {
  const draft = readDraft(storage);
  if (!draft) return null;
  clearDraft(storage);
  const stored = await store.get(draft.id);
  if (stored && stored.updated >= draft.updated) return null;
  if (draft.text.trim() === "" && !stored) return null;
  const note: Note = {
    id: draft.id,
    text: draft.text,
    created: stored?.created ?? draft.updated,
    updated: draft.updated,
  };
  await store.put(note);
  return note;
}
