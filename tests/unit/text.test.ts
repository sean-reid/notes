import { describe, expect, it } from "vitest";
import { fileNameFor, plainText, TITLE_LENGTH, titleOf, wordCount } from "../../src/text.ts";

describe("titleOf", () => {
  it("takes the first non-empty line, trimmed", () => {
    expect(titleOf("\n\n  Morning pages  \nmore")).toBe("Morning pages");
  });
  it("cuts at the title length", () => {
    expect(titleOf("x".repeat(TITLE_LENGTH + 20))).toHaveLength(TITLE_LENGTH);
  });
  it("falls back when there is no text", () => {
    expect(titleOf("  \n ")).toBe("Untitled");
  });
});

describe("wordCount", () => {
  it("counts whitespace-separated words", () => {
    expect(wordCount("one two\n\nthree   four ")).toBe(4);
    expect(wordCount("")).toBe(0);
    expect(wordCount("  \n")).toBe(0);
  });
});

describe("plainText", () => {
  it("trims line ends, collapses blank runs, ends with one newline", () => {
    expect(plainText("a  \n\n\n\nb \n\n")).toBe("a\n\nb\n");
  });
  it("keeps single newlines and one blank line between paragraphs", () => {
    expect(plainText("a\nb\n\nc")).toBe("a\nb\n\nc\n");
  });
  it("is empty for empty input", () => {
    expect(plainText("\n \n")).toBe("");
  });
});

describe("fileNameFor", () => {
  it("slugs the title", () => {
    expect(fileNameFor("Café notes: day 1!\nbody")).toBe("café-notes-day-1.txt");
  });
  it("has a fallback name", () => {
    expect(fileNameFor("")).toBe("untitled.txt");
    expect(fileNameFor("!!!")).toBe("note.txt");
  });
});
