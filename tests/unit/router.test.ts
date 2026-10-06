import { describe, expect, it } from "vitest";
import { notePath, parseRoute } from "../../src/router.ts";

describe("parseRoute", () => {
  it("maps the three paths", () => {
    expect(parseRoute("/")).toEqual({ kind: "write", id: null });
    expect(parseRoute("/notes")).toEqual({ kind: "list" });
    expect(parseRoute("/n/abcdefgh23")).toEqual({ kind: "write", id: "abcdefgh23" });
  });
  it("rejects malformed ids and other paths", () => {
    expect(parseRoute("/n/short")).toEqual({ kind: "unknown" });
    expect(parseRoute("/n/ABCDEFGH23")).toEqual({ kind: "unknown" });
    expect(parseRoute("/elsewhere")).toEqual({ kind: "unknown" });
  });
  it("round-trips through notePath", () => {
    expect(parseRoute(notePath("abcdefgh23"))).toEqual({ kind: "write", id: "abcdefgh23" });
  });
});
