import { expect, test, type Page } from "@playwright/test";
import { VISIBLE_LINES } from "../../src/surface.ts";
import { HINT } from "../../src/views/write.ts";

const LINES = [
  "The trick is to keep the hand moving.",
  "Stopping is where the judging starts.",
  "Everything above this line is still here, saved, just out of sight.",
  "A paragraph break is the only structure there is.",
  "The three lines you can read are the ones you are in the middle of.",
  "This is the line being typed right now.",
];

const ready = (page: Page) => expect(page.locator(".surface")).toBeFocused();

async function typeLines(page: Page, lines: string[]): Promise<void> {
  await ready(page);
  for (const [i, line] of lines.entries()) {
    if (i) await page.keyboard.press("Enter");
    await page.keyboard.type(line);
  }
}

const saved = (page: Page) =>
  expect
    .poll(() =>
      page.evaluate(
        () => Object.keys(localStorage).filter((k) => k.startsWith("notes:draft:")).length,
      ),
    )
    .toBe(0);

const metrics = (page: Page) =>
  page.evaluate(() => {
    const ta = document.querySelector<HTMLTextAreaElement>(".surface");
    const veil = document.querySelector<HTMLElement>(".veil");
    if (!ta || !veil) throw new Error("surface missing");
    return {
      lineHeight: parseFloat(getComputedStyle(ta).lineHeight),
      height: ta.getBoundingClientRect().height,
      veil: veil.getBoundingClientRect().height,
      caret: ta.selectionStart,
      value: ta.value,
      lastLineTop: ta.getBoundingClientRect().bottom - parseFloat(getComputedStyle(ta).lineHeight),
    };
  });

test("a new note shows one sentence of help until the first character", async ({ page }) => {
  await page.goto("/");
  await ready(page);
  const hint = page.locator(".hint");
  await expect(hint).toHaveText(HINT);
  await page.keyboard.type("a");
  await expect(hint).toBeHidden();
  await expect(page).toHaveURL(/\/n\/[0-9a-hj-kmnp-tv-z]{10}$/);
});

test("lines past the last three go under the veil and the last line holds still", async ({
  page,
}, info) => {
  await page.goto("/");
  await typeLines(page, LINES.slice(0, 2));
  let m = await metrics(page);
  expect(m.veil).toBe(0);
  const before = m.lastLineTop;

  await page.keyboard.press("Enter");
  await typeLines(page, LINES.slice(2));
  m = await metrics(page);
  const lines = Math.round(m.height / m.lineHeight);
  expect(lines).toBeGreaterThan(VISIBLE_LINES);
  expect(m.veil).toBeCloseTo(m.height - VISIBLE_LINES * m.lineHeight, 0);
  expect(Math.abs(m.lastLineTop - before)).toBeLessThan(2);
  await page.screenshot({ path: info.outputPath("writing.png") });
});

test("the caret cannot climb into the veiled lines", async ({ page }) => {
  await page.goto("/");
  await typeLines(page, LINES);
  const end = await metrics(page);
  for (let i = 0; i < 8; i++) await page.keyboard.press("ArrowUp");
  const m = await metrics(page);
  expect(m.caret).toBeLessThan(end.caret);
  const hiddenEnd = await page.evaluate((VISIBLE) => {
    const ta = document.querySelector<HTMLTextAreaElement>(".surface");
    if (!ta) throw new Error("surface missing");
    const lh = parseFloat(getComputedStyle(ta).lineHeight);
    const mirror = document.querySelector<HTMLElement>(".mirror");
    if (!mirror) throw new Error("mirror missing");
    const marker = document.createElement("span");
    marker.className = "caret-mark";
    mirror.textContent = ta.value.slice(0, ta.selectionStart);
    mirror.append(marker);
    const caretLine = Math.round(marker.offsetTop / lh);
    const total = Math.round(ta.getBoundingClientRect().height / lh);
    return { caretLine, firstVisible: total - VISIBLE };
  }, VISIBLE_LINES);
  expect(hiddenEnd.caretLine).toBeGreaterThanOrEqual(hiddenEnd.firstVisible);
  await page.keyboard.press("Home");
  await page.keyboard.type("Edited: ");
  const after = await metrics(page);
  expect(after.value).toContain("Edited: ");
  expect(after.value.indexOf("Edited: ")).toBeGreaterThan(LINES[0]!.length);
});

test("the note survives a reload and appears in the list", async ({ page }, info) => {
  await page.goto("/");
  await typeLines(page, LINES.slice(0, 2));
  await saved(page);
  await page.reload();
  await expect(page.locator(".surface")).toHaveValue(LINES.slice(0, 2).join("\n"));

  await page.goto("/notes");
  const item = page.locator(".notes a");
  await expect(item).toHaveCount(1);
  await expect(item.locator(".title")).toHaveText(LINES[0]!);
  await expect(item.locator("time")).toHaveText("Today");
  await page.screenshot({ path: info.outputPath("list.png"), fullPage: true });
});

test("done reveals the whole note with copy, download, and delete", async ({
  page,
  context,
  browserName,
}, info) => {
  await page.goto("/");
  await typeLines(page, LINES);
  await page.getByRole("button", { name: "Done" }).click();
  await expect(page).toHaveURL(/\/n\/[0-9a-hj-kmnp-tv-z]{10}\/done$/);
  const reveal = page.locator(".reveal");
  await expect(reveal).toContainText(LINES[0]!);
  await expect(reveal).toContainText(LINES[5]!);
  await expect(page.locator(".count")).toHaveText(/^\d+ words$/);
  await page.screenshot({ path: info.outputPath("reveal.png"), fullPage: true });

  if (browserName === "chromium") {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.getByRole("button", { name: "Copy" }).click();
    await expect(page.locator(".status")).toHaveText("Copied");
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    expect(clip).toBe(`${LINES.join("\n")}\n`);
  }

  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download .txt" }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe("the-trick-is-to-keep-the-hand-moving.txt");

  await page.getByRole("link", { name: "Keep writing" }).click();
  await expect(page.locator(".surface")).toHaveValue(LINES.join("\n"));
  await page.getByRole("button", { name: "Done" }).click();

  const remove = page.getByRole("button", { name: "Delete" });
  await remove.click();
  await expect(page.getByRole("button", { name: "Delete this note?" })).toBeVisible();
  await page.getByRole("button", { name: "Delete this note?" }).click();
  await expect(page).toHaveURL(/\/notes$/);
  await expect(page.locator(".notes a")).toHaveCount(0);
  await expect(page.getByText("Nothing here yet.")).toBeVisible();
});

test("done on an empty note leaves nothing behind", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Done" }).click();
  await expect(page).toHaveURL(/\/notes$/);
  await expect(page.locator(".notes a")).toHaveCount(0);
});

test("a note id from another device says so", async ({ page }, info) => {
  await page.goto("/n/zzzzzzzzzz");
  await expect(page.getByText("This note is not on this device.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Start writing" })).toBeVisible();
  await page.screenshot({ path: info.outputPath("missing.png") });
  await page.goto("/elsewhere");
  await expect(page.getByText("Nothing here.")).toBeVisible();
});

test("a draft left in localStorage is recovered on the next visit", async ({ page }) => {
  await page.goto("/notes");
  await page.evaluate(() => {
    localStorage.setItem(
      "notes:draft:abcdefgh23",
      JSON.stringify({ text: "rescued line", updated: Date.now() }),
    );
  });
  await page.goto("/n/abcdefgh23");
  await expect(page.locator(".surface")).toHaveValue("rescued line");
});

test("select all and the jump keys stay out of the veiled lines", async ({ page }) => {
  await page.goto("/");
  await typeLines(page, LINES);
  const end = (await metrics(page)).caret;
  for (const key of ["Control+Home", "Control+ArrowUp", "PageUp"]) {
    await page.keyboard.press(key);
    expect((await metrics(page)).caret).toBe(end);
  }
  await page.keyboard.press("ControlOrMeta+a");
  await expect.poll(async () => (await metrics(page)).caret).toBe(end);
  await page.keyboard.type("!");
  expect((await metrics(page)).value).toBe(`${LINES.join("\n")}!`);
});

test("arrow up still moves on a short note", async ({ page }) => {
  await page.goto("/");
  await typeLines(page, LINES.slice(0, 2));
  const end = (await metrics(page)).caret;
  await page.keyboard.press("ArrowUp");
  expect((await metrics(page)).caret).toBeLessThan(end);
});

test("the last line is pinned again after the viewport shrinks", async ({ page }) => {
  await page.goto("/");
  await typeLines(page, LINES);
  await page.setViewportSize({ width: 375, height: 560 });
  await expect.poll(async () => (await metrics(page)).lastLineTop).toBeLessThan(560 * 0.5);
  expect((await metrics(page)).lastLineTop).toBeGreaterThan(560 * 0.3);
});

test("hiding the tab writes the note at once", async ({ page }) => {
  await page.clock.install();
  await page.goto("/");
  await ready(page);
  await page.keyboard.type("quick");
  expect(
    await page.evaluate(() => Object.keys(localStorage).some((k) => k.startsWith("notes:draft:"))),
  ).toBe(true);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await saved(page);
  const stored = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const req = indexedDB.open("notes", 1);
        req.onsuccess = () => {
          const count = req.result.transaction("notes").objectStore("notes").count();
          count.onsuccess = () => resolve(count.result);
        };
      }),
  );
  expect(stored).toBe(1);
});

test("a note emptied out again is removed", async ({ page }) => {
  await page.goto("/");
  await ready(page);
  await page.keyboard.type("gone soon");
  await saved(page);
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Backspace");
  await page.getByRole("link", { name: "Notes", exact: true }).click();
  await expect(page.getByText("Nothing here yet.")).toBeVisible();
  const stored = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const req = indexedDB.open("notes", 1);
        req.onsuccess = () => {
          const count = req.result.transaction("notes").objectStore("notes").count();
          count.onsuccess = () => resolve(count.result);
        };
      }),
  );
  expect(stored).toBe(0);
});

test("delete disarms itself after five seconds", async ({ page }) => {
  await page.clock.install();
  await page.goto("/");
  await ready(page);
  await page.keyboard.type("keep me");
  await page.getByRole("button", { name: "Done" }).click();
  await page.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByRole("button", { name: "Delete this note?" })).toBeVisible();
  await page.clock.runFor(5000);
  await expect(page.getByRole("button", { name: "Delete", exact: true })).toBeVisible();
});

test("copy falls back to selecting the text when the clipboard is refused", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: () => Promise.reject(new Error("refused")) },
    });
  });
  await page.goto("/");
  await ready(page);
  await page.keyboard.type("select me");
  await page.getByRole("button", { name: "Done" }).click();
  await page.getByRole("button", { name: "Copy" }).click();
  await expect(page.locator(".status")).toHaveText("Select and copy");
  expect(await page.evaluate(() => getSelection()?.toString())).toContain("select me");
});

test("back returns from the list to the note", async ({ page }) => {
  await page.goto("/");
  await ready(page);
  await page.keyboard.type("come back");
  await saved(page);
  await page.getByRole("link", { name: "Notes", exact: true }).click();
  await expect(page.locator(".notes a")).toHaveCount(1);
  await page.goBack();
  await expect(page.locator(".surface")).toHaveValue("come back");
});

test("back from the finished view returns to writing", async ({ page }) => {
  await page.goto("/");
  await ready(page);
  await page.keyboard.type("round trip");
  await page.getByRole("button", { name: "Done" }).click();
  await expect(page.locator(".reveal")).toHaveText("round trip\n");
  await page.reload();
  await expect(page.locator(".reveal")).toHaveText("round trip\n");
  await page.goBack();
  await expect(page.locator(".surface")).toHaveValue("round trip");
});

test("tapping blank paper keeps the caret", async ({ page }) => {
  await page.goto("/");
  await ready(page);
  await page.keyboard.type("stay");
  await page.mouse.click(100, 600);
  await ready(page);
  await page.keyboard.type(" put");
  await expect(page.locator(".surface")).toHaveValue("stay put");
});

test("a long note never makes the page scrollable", async ({ page }) => {
  await page.goto("/");
  await ready(page);
  await page.evaluate(() => {
    const ta = document.querySelector<HTMLTextAreaElement>(".surface");
    if (!ta) throw new Error("surface missing");
    ta.value = Array.from({ length: 300 }, (_, i) => `Line ${i + 1} of a long note.`).join("\n");
    ta.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.mouse.wheel(0, -4000);
  const scrolled = await page.evaluate(() => ({
    y: window.scrollY,
    overflow: document.documentElement.scrollHeight - window.innerHeight,
  }));
  expect(scrolled.y).toBe(0);
  expect(scrolled.overflow).toBeLessThanOrEqual(0);
  const m = await metrics(page);
  const viewport = page.viewportSize()?.height ?? 0;
  expect(m.lastLineTop).toBeGreaterThan(viewport * 0.3);
  expect(m.lastLineTop).toBeLessThan(viewport * 0.5);
});

test("a caret stranded by a reflow moves back into view", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await ready(page);
  const two = [LINES[0]!, LINES[2]!];
  await typeLines(page, two);
  await page.evaluate(() =>
    document.querySelector<HTMLTextAreaElement>(".surface")?.setSelectionRange(0, 0),
  );
  await expect.poll(async () => (await metrics(page)).caret).toBe(0);
  await page.setViewportSize({ width: 320, height: 600 });
  await expect.poll(async () => (await metrics(page)).caret).toBe(two.join("\n").length);
  await page.keyboard.type("!");
  expect((await metrics(page)).value.endsWith("!")).toBe(true);
});
