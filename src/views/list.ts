import type { App } from "../app.ts";
import { whenLabel } from "../dates.ts";
import { el } from "../dom.ts";
import { notePath } from "../router.ts";
import { titleOf } from "../text.ts";

export async function renderList(app: App): Promise<void> {
  const notes = (await app.store.list()).filter((n) => n.text.trim() !== "");
  const now = Date.now();

  document.title = "Notes";
  app.menu.replaceChildren(el("a", { href: "/" }, "New note"));

  const items = notes.map((note) =>
    el(
      "li",
      {},
      el(
        "a",
        { href: notePath(note.id) },
        el("span", { class: "title" }, titleOf(note.text)),
        el(
          "time",
          { datetime: new Date(note.updated).toISOString() },
          whenLabel(note.updated, now),
        ),
      ),
    ),
  );

  const content = items.length
    ? el("ul", { class: "notes" }, ...items)
    : el(
        "div",
        {},
        el("p", {}, "Nothing here yet."),
        el("p", { class: "actions" }, el("a", { href: "/" }, "Start writing")),
      );

  app.main.replaceChildren(
    el(
      "div",
      { class: "page" },
      content,
      el(
        "footer",
        { class: "colophon" },
        el("a", { href: "https://github.com/sean-reid/notes" }, "Source"),
        el("a", { href: "https://en.wikipedia.org/wiki/Free_writing" }, "Free writing"),
      ),
    ),
  );
  window.scrollTo({ top: 0, behavior: "instant" });
}
