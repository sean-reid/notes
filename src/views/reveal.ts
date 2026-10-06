import type { App } from "../app.ts";
import { el } from "../dom.ts";
import { clearDraft } from "../draft.ts";
import { notePath } from "../router.ts";
import type { Note } from "../store.ts";
import { fileNameFor, plainText, wordCount } from "../text.ts";

const STATUS_DELAY = 2000;
const CONFIRM_DELAY = 5000;

export function renderReveal(app: App, note: Note): void {
  const text = plainText(note.text);
  const words = wordCount(text);
  const body = el("div", { class: "reveal" }, text);
  const count = el("p", { class: "count" }, `${words} ${words === 1 ? "word" : "words"}`);
  const status = el("p", { class: "status", role: "status", "aria-live": "polite" });

  const copy = el("button", { type: "button" }, "Copy");
  const download = el("button", { type: "button" }, "Download .txt");
  const keep = el("a", { href: notePath(note.id) }, "Keep writing");
  const remove = el("button", { type: "button" }, "Delete");
  let statusTimer: ReturnType<typeof setTimeout> | undefined;
  let confirmTimer: ReturnType<typeof setTimeout> | undefined;
  let armed = false;

  const say = (message: string): void => {
    status.textContent = message;
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => (status.textContent = ""), STATUS_DELAY);
  };

  copy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(text);
      say("Copied");
    } catch {
      getSelection()?.selectAllChildren(body);
      say("Select and copy");
    }
  });

  download.addEventListener("click", () => {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const link = el("a", { href: url, download: fileNameFor(note.text) });
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), STATUS_DELAY);
  });

  remove.addEventListener("click", async () => {
    if (!armed) {
      armed = true;
      remove.textContent = "Delete this note?";
      confirmTimer = setTimeout(() => {
        armed = false;
        remove.textContent = "Delete";
      }, CONFIRM_DELAY);
      return;
    }
    clearTimeout(confirmTimer);
    await app.store.remove(note.id);
    clearDraft(localStorage);
    app.navigate("/notes");
  });

  app.menu.replaceChildren(el("a", { href: "/notes" }, "Notes"));
  app.main.replaceChildren(
    el(
      "div",
      { class: "page plain" },
      body,
      count,
      el("div", { class: "actions" }, copy, download, keep, remove),
      status,
    ),
  );
  window.scrollTo({ top: 0, behavior: "instant" });
  copy.focus();
}
