export const TITLE_LENGTH = 80;

export function titleOf(text: string): string {
  const line = text.split("\n").find((l) => l.trim() !== "");
  return line ? line.trim().slice(0, TITLE_LENGTH) : "Untitled";
}

export function wordCount(text: string): number {
  const trimmed = text.trim();
  return trimmed === "" ? 0 : trimmed.split(/\s+/).length;
}

export function plainText(text: string): string {
  const body = text
    .split("\n")
    .map((l) => l.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return body === "" ? "" : `${body}\n`;
}

export function fileNameFor(text: string): string {
  const slug = titleOf(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${slug || "note"}.txt`;
}
