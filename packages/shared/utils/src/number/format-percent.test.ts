import { describe, expect, it } from "vitest";

import { formatPercent } from "./format-percent";

describe("formatPercent", () => {
  it("formats decimal values as percentages", () => {
    expect(formatPercent(0.956, 1)).toBe("95.6%");
  });
});
