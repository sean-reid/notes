export const VISIBLE_LINES = 3;

export interface Surface {
  update(): void;
  destroy(): void;
}

interface Parts {
  textarea: HTMLTextAreaElement;
  mirror: HTMLElement;
  veil: HTMLElement;
}

// The textarea grows with its text, a veil in paper colour covers all but
// the last few lines, and the window scrolls so the last line holds still.
export function mountSurface({ textarea, mirror, veil }: Parts): Surface {
  const marker = document.createElement("span");
  marker.className = "caret-mark";
  let lineHeight = 0;
  let height = 0;
  let lines = 0;
  let lastSelection = { start: textarea.value.length, end: textarea.value.length };

  const measure = (text: string): number => {
    mirror.textContent = text;
    mirror.append(marker);
    return marker.offsetTop;
  };

  const lineOf = (offset: number): number =>
    lineHeight ? Math.round(measure(textarea.value.slice(0, offset)) / lineHeight) : 0;

  const firstVisible = (): number => Math.max(0, lines - VISIBLE_LINES);

  const anchor = (): number => {
    const vv = window.visualViewport;
    const top = vv?.offsetTop ?? 0;
    const viewport = vv?.height ?? window.innerHeight;
    return top + Math.max(viewport * 0.4, 44 + (VISIBLE_LINES + 1) * lineHeight);
  };

  const pin = (): void => {
    const lastLineTop = textarea.getBoundingClientRect().top + window.scrollY + height - lineHeight;
    window.scrollTo({ top: Math.max(0, lastLineTop - anchor()), behavior: "instant" });
  };

  const update = (): void => {
    lineHeight = parseFloat(getComputedStyle(textarea).lineHeight) || 0;
    if (!lineHeight) return;
    height = measure(textarea.value) + lineHeight;
    textarea.style.height = `${height}px`;
    if (textarea.scrollHeight > height) {
      height = textarea.scrollHeight;
      textarea.style.height = `${height}px`;
    }
    lines = Math.round(height / lineHeight);
    veil.style.height = `${Math.max(0, height - VISIBLE_LINES * lineHeight)}px`;
    pin();
  };

  const onSelection = (): void => {
    if (document.activeElement !== textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    if (lineOf(start) < firstVisible()) {
      textarea.setSelectionRange(lastSelection.start, lastSelection.end);
      pin();
      return;
    }
    lastSelection = { start, end };
  };

  const onKeydown = (event: KeyboardEvent): void => {
    if (lines <= VISIBLE_LINES) return;
    const jump =
      (event.metaKey || event.ctrlKey) && (event.key === "ArrowUp" || event.key === "Home");
    const up = event.key === "ArrowUp" || event.key === "PageUp";
    if (jump || (up && lineOf(textarea.selectionStart) <= firstVisible())) event.preventDefault();
  };

  const onVeil = (event: MouseEvent): void => {
    event.preventDefault();
    textarea.focus();
  };

  document.addEventListener("selectionchange", onSelection);
  textarea.addEventListener("keydown", onKeydown);
  textarea.addEventListener("input", update);
  textarea.addEventListener("focus", pin);
  veil.addEventListener("mousedown", onVeil);
  window.addEventListener("resize", update);
  window.visualViewport?.addEventListener("resize", update);
  update();

  return {
    update,
    destroy() {
      document.removeEventListener("selectionchange", onSelection);
      textarea.removeEventListener("keydown", onKeydown);
      textarea.removeEventListener("input", update);
      textarea.removeEventListener("focus", pin);
      veil.removeEventListener("mousedown", onVeil);
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
    },
  };
}
