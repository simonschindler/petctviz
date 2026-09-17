import { describe, expect, it } from "vitest";

import { computeOpacity } from "../src/core/logic.js";

describe("threshold fade interaction", () => {
  it("hides everything when the threshold is above every value", () => {
    const values = [1, 2, 3];
    const opacity = values.map((value) => computeOpacity(value, 4, 0.5));
    expect(opacity.every((value) => value === 0)).toBe(true);
  });

  it("shows everything when the threshold is at or below the minimum", () => {
    const values = [1, 2, 3];
    const opacity = values.map((value) => computeOpacity(value, 1, 1));
    expect(opacity.every((value) => value === 1)).toBe(true);
  });

  it("produces a partial fade inside the band", () => {
    expect(computeOpacity(3, 4, 2)).toBeCloseTo(0.5);
  });
});
