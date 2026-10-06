import { describe, expect, it } from "vitest";
import { ID_LENGTH, isId, newId } from "../../src/id.ts";

describe("newId", () => {
  it("is ten characters from the alphabet", () => {
    const id = newId();
    expect(id).toHaveLength(ID_LENGTH);
    expect(isId(id)).toBe(true);
  });
  it("maps every byte value into the alphabet", () => {
    const id = newId((b) => b.forEach((_, i) => (b[i] = 255 - i)));
    expect(isId(id)).toBe(true);
    expect(id).toBe("zyxwvtsrqp");
  });
  it("does not repeat", () => {
    const ids = new Set(Array.from({ length: 1000 }, () => newId()));
    expect(ids.size).toBe(1000);
  });
});

describe("isId", () => {
  it("rejects other shapes", () => {
    expect(isId("short")).toBe(false);
    expect(isId("ABCDEFGHJK")).toBe(false);
    expect(isId("abcdefghil")).toBe(false);
  });
});
