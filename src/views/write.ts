import type { App, Teardown } from "../app.ts";
import { el, notesLink } from "../dom.ts";
import { clearDraft, writeDraft } from "../draft.ts";
import { newId } from "../id.ts";
import { notePath, revealPath } from "../router.ts";
import type { Note } from "../store.ts";
import { mountSurface } from "../surface.ts";
import { titleOf } from "../text.ts";

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
  let writes = 0;
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
  const hint = el("p", { class: "hint", id: "hint" }, HINT);
  const sheet = el("div", { class: "sheet" }, textarea, mirror, veil, hint);
  const stage = el("div", { class: "stage" }, el("div", { class: "column" }, sheet));
  app.main.replaceChildren(stage);
  document.title = note.text ? titleOf(note.text) : "notes";

  const showHint = (): void => {
    hint.hidden = note.text !== "";
    if (hint.hidden) textarea.removeAttribute("aria-describedby");
    else textarea.setAttribute("aria-describedby", "hint");
  };
  showHint();

  const done = el("button", { type: "button" }, "Done");
  app.menu.replaceChildren(notesLink(), done);

  const persist = async (): Promise<void> => {
    clearTimeout(timer);
    if (!dirty) return;
    dirty = false;
    const write = ++writes;
    await app.store.put({ ...note });
    saved = true;
    if (write === writes && !dirty) clearDraft(localStorage, note.id);
  };

  const onInput = (): void => {
    note.text = textarea.value;
    note.updated = Date.now();
    dirty = true;
    showHint();
    writeDraft(localStorage, { id: note.id, text: note.text, updated: note.updated });
    if (location.pathname === "/") history.replaceState(null, "", notePath(note.id));
    clearTimeout(timer);
    timer = setTimeout(() => void persist(), SAVE_DELAY);
  };

  const onHide = (): void => {
    if (document.visibilityState === "hidden") void persist();
  };
  const onPageHide = (): void => void persist();

  const finish = async (): Promise<void> => {
    await persist();
    app.navigate(note.text.trim() === "" ? "/notes" : revealPath(note.id));
  };

  const surface = mountSurface({ stage, sheet, textarea, mirror, veil });
  textarea.addEventListener("input", onInput);
  document.addEventListener("visibilitychange", onHide);
  window.addEventListener("pagehide", onPageHide);
  done.addEventListener("click", () => void finish());
  textarea.focus();
  textarea.setSelectionRange(note.text.length, note.text.length);
  surface.update();

  const teardown = (): void => {
    surface.destroy();
    textarea.removeEventListener("input", onInput);
    document.removeEventListener("visibilitychange", onHide);
    window.removeEventListener("pagehide", onPageHide);
  };

  return async () => {
    teardown();
    await persist();
    if (saved && note.text.trim() === "") await app.store.remove(note.id);
  };
}

export function renderMissing(app: App, message: string): void {
  document.title = "notes";
  app.menu.replaceChildren(notesLink());
  app.main.replaceChildren(
    el(
      "div",
      { class: "page" },
      el("p", {}, message),
      el("p", { class: "actions" }, el("a", { href: "/" }, "Start writing")),
    ),
  );
}
