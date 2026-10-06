import type { App } from "../app.ts";
import { el, notesLink } from "../dom.ts";
import { clearDraft } from "../draft.ts";
import { notePath } from "../router.ts";
import { fileNameFor, plainText, titleOf, wordCount } from "../text.ts";
import { renderMissing } from "./write.ts";

const STATUS_DELAY = 2000;
const CONFIRM_DELAY = 5000;

export async function renderReveal(app: App, id: string): Promise<void> {
  const note = await app.store.get(id);
  if (!note || note.text.trim() === "") {
    renderMissing(app, "This note is not on this device.");
    return;
  }
  const text = plainText(note.text);
  const words = wordCount(text);
  const body = el("div", { class: "reveal" }, text);
  const status = el("span", { class: "status", role: "status", "aria-live": "polite" });
  const count = el("p", { class: "count" }, `${words} ${words === 1 ? "word" : "words"}`, status);

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
    say("Downloaded");
    setTimeout(() => URL.revokeObjectURL(url), STATUS_DELAY);
  });

  remove.addEventListener("click", async () => {
    if (!armed) {
      armed = true;
      remove.textContent = "Delete this note?";
      say("Press again to delete");
      confirmTimer = setTimeout(() => {
        armed = false;
        remove.textContent = "Delete";
        say("Kept");
      }, CONFIRM_DELAY);
      return;
    }
    clearTimeout(confirmTimer);
    await app.store.remove(note.id);
    clearDraft(localStorage, note.id);
    app.navigate("/notes");
  });

  document.title = titleOf(note.text);
  app.menu.replaceChildren(notesLink());
  app.main.replaceChildren(
    el(
      "div",
      { class: "page" },
      body,
      count,
      el("div", { class: "actions" }, copy, download, keep, remove),
    ),
  );
  window.scrollTo({ top: 0, behavior: "instant" });
  copy.focus();
}
