import type { App, Teardown } from "./app.ts";
import { el } from "./dom.ts";
import { recover } from "./draft.ts";
import { parseRoute } from "./router.ts";
import { openStore } from "./store.ts";
import { renderList } from "./views/list.ts";
import { renderReveal } from "./views/reveal.ts";
import { renderMissing, renderWrite } from "./views/write.ts";

const main = document.getElementById("main");
const menu = document.getElementById("menu");
if (!main || !menu) throw new Error("page shell is missing");

const store = await openStore().catch((error: unknown) => {
  console.error(error);
  main.replaceChildren(
    el(
      "div",
      { class: "page" },
      el(
        "p",
        {},
        "This browser is not letting the page store anything, so there is nowhere to write.",
      ),
    ),
  );
  return null;
});
if (!store) throw new Error("storage unavailable");
await recover(store, localStorage).catch(console.error);

let teardown: Teardown | null = null;
let pending: Promise<void> = Promise.resolve();

const app: App = {
  store,
  main,
  menu,
  navigate(path) {
    history.pushState(null, "", path);
    render();
  },
};

async function show(): Promise<void> {
  try {
    await teardown?.();
    teardown = null;
    const route = parseRoute(location.pathname);
    if (route.kind === "list") await renderList(app);
    else if (route.kind === "write") teardown = await renderWrite(app, route.id);
    else if (route.kind === "reveal") await renderReveal(app, route.id);
    else renderMissing(app, "Nothing here.");
  } catch (error) {
    console.error(error);
    teardown = null;
    renderMissing(app, "This page could not be opened.");
  }
}

function render(): void {
  pending = pending.then(show);
}

document.addEventListener("click", (event) => {
  if (event.defaultPrevented || event.button !== 0) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const link = (event.target as Element).closest("a");
  if (!link || link.origin !== location.origin || link.hasAttribute("download")) return;
  event.preventDefault();
  app.navigate(link.pathname);
});

window.addEventListener("popstate", render);
render();
