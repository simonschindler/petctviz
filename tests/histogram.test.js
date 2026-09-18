import { describe, expect, it } from "vitest";

import { computeHistogram } from "../src/core/histogram.js";

describe("computeHistogram", () => {
  it("counts values into uniform bins", () => {
    expect(computeHistogram([0, 0.1, 0.5, 0.9, 1], 5, [0, 1])).toEqual([2, 0, 1, 0, 2]);
  });

  it("includes the high endpoint in the last bin", () => {
    expect(computeHistogram([1], 5, [0, 1])).toEqual([0, 0, 0, 0, 1]);
  });

  it("ignores values outside the range", () => {
    expect(computeHistogram([-1, 2, 0.5], 5, [0, 1])).toEqual([0, 0, 1, 0, 0]);
  });

  it("returns zeros for a degenerate range", () => {
    expect(computeHistogram([0.5], 5, [1, 1])).toEqual([0, 0, 0, 0, 0]);
  });

  it("sums to the number of in-range values", () => {
    const values = [0.05, 0.2, 0.4, 0.4, 0.95, 5];
    const counts = computeHistogram(values, 10, [0, 1]);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(5);
  });
});
