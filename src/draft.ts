import { isId } from "./id.ts";
import type { Note, NoteStore } from "./store.ts";

export interface Draft {
  id: string;
  text: string;
  updated: number;
}

export const DRAFT_PREFIX = "notes:draft:";

export const draftKey = (id: string): string => `${DRAFT_PREFIX}${id}`;

export function readDraft(storage: Storage, id: string): Draft | null {
  try {
    const raw = storage.getItem(draftKey(id));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const { text, updated } = parsed as Record<string, unknown>;
    if (typeof text !== "string" || typeof updated !== "number" || !Number.isFinite(updated)) {
      return null;
    }
    return { id, text, updated };
  } catch {
    return null;
  }
}

export function writeDraft(storage: Storage, draft: Draft): void {
  try {
    storage.setItem(
      draftKey(draft.id),
      JSON.stringify({ text: draft.text, updated: draft.updated }),
    );
  } catch {
    // Quota or private mode: the IndexedDB write still lands.
  }
}

export function clearDraft(storage: Storage, id: string): void {
  storage.removeItem(draftKey(id));
}

export function draftIds(storage: Storage): string[] {
  const ids: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (!key?.startsWith(DRAFT_PREFIX)) continue;
    const id = key.slice(DRAFT_PREFIX.length);
    if (isId(id)) ids.push(id);
  }
  return ids;
}

// A draft newer than the stored note means the tab closed before the
// IndexedDB write landed. Write it back and clear it either way.
export async function recover(store: NoteStore, storage: Storage): Promise<Note[]> {
  const recovered: Note[] = [];
  for (const id of draftIds(storage)) {
    const draft = readDraft(storage, id);
    if (!draft) {
      clearDraft(storage, id);
      continue;
    }
    const stored = await store.get(id);
    const stale =
      (stored && stored.updated >= draft.updated) || (draft.text.trim() === "" && !stored);
    if (!stale) {
      const note: Note = {
        id,
        text: draft.text,
        created: stored?.created ?? draft.updated,
        updated: draft.updated,
      };
      await store.put(note);
      recovered.push(note);
    }
    clearDraft(storage, id);
  }
  return recovered;
}
