import type { App, Teardown } from "../app.ts";
import { el } from "../dom.ts";
import { clearDraft, writeDraft } from "../draft.ts";
import { newId } from "../id.ts";
import { notePath } from "../router.ts";
import type { Note } from "../store.ts";
import { mountSurface } from "../surface.ts";
import { renderReveal } from "./reveal.ts";

const SAVE_DELAY = 300;

export const HINT = "Write. The lines above fade as you go; everything stays on this device.";

export async function renderWrite(app: App, id: string | null): Promise<Teardown> {
  const stored = id ? await app.store.get(id) : undefined;
  if (id && !stored) {
    renderMissing(app, "This note is not on this device.");
    return () => {};
  }
  const now = Date.now();
  const note: Note = stored ?? { id: newId(), text: "", created: now, updated: now };
  let saved = stored !== undefined;
  let dirty = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const textarea = el("textarea", {
    class: "surface",
    "aria-label": "Your note",
    spellcheck: "false",
    autocapitalize: "sentences",
    rows: "1",
  });
  textarea.value = note.text;
  const mirror = el("div", { class: "mirror", "aria-hidden": "true" });
  const veil = el("div", { class: "veil", "aria-hidden": "true" });
  const hint = el("p", { class: "hint" }, HINT);
  hint.hidden = note.text !== "";
  const sheet = el("div", { class: "sheet" }, textarea, mirror, veil);
  app.main.replaceChildren(el("div", { class: "page" }, sheet, hint));

  const done = el("button", { type: "button" }, "Done");
  app.menu.replaceChildren(el("a", { href: "/notes" }, "Notes"), done);

  const persist = async (): Promise<void> => {
    clearTimeout(timer);
    if (!dirty) return;
    dirty = false;
    const snapshot = { ...note };
    await app.store.put(snapshot);
    saved = true;
    if (!dirty) clearDraft(localStorage);
  };

  const onInput = (): void => {
    note.text = textarea.value;
    note.updated = Date.now();
    dirty = true;
    hint.hidden = note.text !== "";
    writeDraft(localStorage, { id: note.id, text: note.text, updated: note.updated });
    if (location.pathname === "/") history.replaceState(null, "", notePath(note.id));
    clearTimeout(timer);
    timer = setTimeout(() => void persist(), SAVE_DELAY);
  };

  const onHide = (): void => {
    if (document.visibilityState === "hidden") void persist();
  };

  const finish = async (): Promise<void> => {
    await persist();
    if (note.text.trim() === "") {
      app.navigate("/notes");
      return;
    }
    teardown();
    renderReveal(app, note);
  };

  const surface = mountSurface({ textarea, mirror, veil });
  textarea.addEventListener("input", onInput);
  document.addEventListener("visibilitychange", onHide);
  window.addEventListener("pagehide", onHide);
  done.addEventListener("click", () => void finish());
  textarea.focus();
  textarea.setSelectionRange(note.text.length, note.text.length);
  surface.update();

  const teardown = (): void => {
    surface.destroy();
    textarea.removeEventListener("input", onInput);
    document.removeEventListener("visibilitychange", onHide);
    window.removeEventListener("pagehide", onHide);
  };

  return async () => {
    teardown();
    await persist();
    if (saved && note.text.trim() === "") await app.store.remove(note.id);
  };
}

export function renderMissing(app: App, message: string): void {
  app.menu.replaceChildren(el("a", { href: "/notes" }, "Notes"));
  app.main.replaceChildren(
    el(
      "div",
      { class: "page plain" },
      el("p", {}, message),
      el("p", { class: "actions" }, el("a", { href: "/" }, "Start writing")),
    ),
  );
}
