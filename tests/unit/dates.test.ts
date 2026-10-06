import { describe, expect, it } from "vitest";
import { whenLabel } from "../../src/dates.ts";

const now = new Date(2026, 9, 6, 15, 0).getTime();
const daysAgo = (n: number, hour = 9) => new Date(2026, 9, 6 - n, hour).getTime();

describe("whenLabel", () => {
  it("names today and yesterday", () => {
    expect(whenLabel(daysAgo(0, 1), now, "en-GB")).toBe("Today");
    expect(whenLabel(daysAgo(1, 23), now, "en-GB")).toBe("Yesterday");
  });
  it("uses the weekday inside a week", () => {
    expect(whenLabel(daysAgo(2), now, "en-GB")).toBe("Sunday");
    expect(whenLabel(daysAgo(6), now, "en-GB")).toBe("Wednesday");
  });
  it("uses a short date after that, with the year when it differs", () => {
    expect(whenLabel(daysAgo(7), now, "en-GB")).toBe("29 Sept");
    expect(whenLabel(new Date(2025, 11, 25).getTime(), now, "en-GB")).toBe("25 Dec 2025");
  });
});
