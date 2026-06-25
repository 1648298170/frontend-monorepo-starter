import { describe, expect, it } from "vitest";

import { formatDate } from "./format-date";

describe("formatDate", () => {
  it("formats dates with the requested locale", () => {
    expect(formatDate("2026-06-23", "en-US")).toBe("06/23/2026");
  });
});
