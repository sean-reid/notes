export const VISIBLE_LINES = 3;

export interface Surface {
  update(): void;
  destroy(): void;
}

interface Parts {
  stage: HTMLElement;
  sheet: HTMLElement;
  textarea: HTMLTextAreaElement;
  mirror: HTMLElement;
  veil: HTMLElement;
}

const mark = (): HTMLSpanElement => {
  const span = document.createElement("span");
  span.className = "caret-mark";
  return span;
};

export function mountSurface({ stage, sheet, textarea, mirror, veil }: Parts): Surface {
  const caretMark = mark();
  const endMark = mark();
  let lineHeight = 0;
  let height = 0;
  let lines = 0;
  let lastSelection = { start: textarea.value.length, end: textarea.value.length };

  // Lays out only the text from the caret's own hard line to the end, since
  // wrapping never depends on earlier lines.
  const rowsBelow = (offset: number): number => {
    const text = textarea.value;
    const from = text.lastIndexOf("\n", offset - 1) + 1;
    mirror.replaceChildren(text.slice(from, offset), caretMark, text.slice(offset), endMark);
    return Math.round((endMark.offsetTop - caretMark.offsetTop) / lineHeight);
  };

  const hidden = (offset: number): boolean =>
    lines > VISIBLE_LINES && offset < textarea.value.length && rowsBelow(offset) >= VISIBLE_LINES;

  const anchor = (): number => {
    const vv = window.visualViewport;
    const top = vv?.offsetTop ?? 0;
    const viewport = vv?.height ?? window.innerHeight;
    return top + Math.max(viewport * 0.4, 44 + (VISIBLE_LINES + 1) * lineHeight);
  };

  const pin = (): void => {
    sheet.style.top = `${anchor() - (height - lineHeight)}px`;
  };

  const record = (): void => {
    lastSelection = { start: textarea.selectionStart, end: textarea.selectionEnd };
  };

  const update = (): void => {
    lineHeight = parseFloat(getComputedStyle(textarea).lineHeight) || 0;
    if (!lineHeight) return;
    textarea.style.height = "auto";
    height = textarea.scrollHeight;
    textarea.style.height = `${height}px`;
    lines = Math.round(height / lineHeight);
    veil.style.height = `${Math.max(0, height - VISIBLE_LINES * lineHeight)}px`;
    pin();
    if (hidden(textarea.selectionStart)) {
      const end = textarea.value.length;
      textarea.setSelectionRange(end, end);
    }
    record();
  };

  const onSelection = (): void => {
    if (document.activeElement !== textarea) return;
    if (!hidden(textarea.selectionStart)) {
      record();
      return;
    }
    const end = textarea.value.length;
    const back = hidden(lastSelection.start) ? { start: end, end } : lastSelection;
    textarea.setSelectionRange(back.start, back.end);
  };

  const onKeydown = (event: KeyboardEvent): void => {
    if (lines <= VISIBLE_LINES) return;
    const jump =
      (event.metaKey || event.ctrlKey) && (event.key === "ArrowUp" || event.key === "Home");
    const up = event.key === "ArrowUp" || event.key === "PageUp";
    if (jump || (up && rowsBelow(textarea.selectionStart) >= VISIBLE_LINES - 1)) {
      event.preventDefault();
    }
  };

  const onStage = (event: MouseEvent): void => {
    if (event.target === textarea) return;
    event.preventDefault();
    textarea.focus();
  };

  const unscroll = (): void => {
    textarea.scrollTop = 0;
  };

  document.addEventListener("selectionchange", onSelection);
  textarea.addEventListener("keydown", onKeydown);
  textarea.addEventListener("input", update);
  textarea.addEventListener("focus", pin);
  textarea.addEventListener("scroll", unscroll);
  stage.addEventListener("mousedown", onStage);
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
      textarea.removeEventListener("scroll", unscroll);
      stage.removeEventListener("mousedown", onStage);
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
    },
  };
}
