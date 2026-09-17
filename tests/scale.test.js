import { describe, expect, it } from "vitest";

import { makeColorFn } from "../src/core/colormaps.js";
import { makeScale } from "../src/core/logic.js";

const RANGE = [0.15, 39.15];

describe("makeScale linear", () => {
  it("maps the range endpoints to 0 and 1", () => {
    const scale = makeScale("linear", RANGE);
    expect(scale.tOf(RANGE[0])).toBe(0);
    expect(scale.tOf(RANGE[1])).toBe(1);
  });

  it("round-trips through valueAt", () => {
    const scale = makeScale("linear", RANGE);
    expect(scale.valueAt(scale.tOf(5))).toBeCloseTo(5, 6);
  });

  it("clamps outside the range", () => {
    const scale = makeScale("linear", RANGE);
    expect(scale.tOf(-10)).toBe(0);
    expect(scale.tOf(1000)).toBe(1);
    expect(scale.valueAt(-1)).toBe(RANGE[0]);
    expect(scale.valueAt(2)).toBe(RANGE[1]);
  });
});

describe("makeScale log", () => {
  it("maps the range endpoints to 0 and 1", () => {
    const scale = makeScale("log", RANGE);
    expect(scale.tOf(RANGE[0])).toBeCloseTo(0, 6);
    expect(scale.tOf(RANGE[1])).toBeCloseTo(1, 6);
  });

  it("places mid-range values higher than the linear scale", () => {
    const linear = makeScale("linear", RANGE);
    const log = makeScale("log", RANGE);
    const mid = (RANGE[0] + RANGE[1]) / 2;
    expect(log.tOf(mid)).toBeGreaterThan(linear.tOf(mid));
  });

  it("round-trips through valueAt", () => {
    const scale = makeScale("log", RANGE);
    for (const value of [0.2, 1, 5, 20, 39]) {
      expect(scale.valueAt(scale.tOf(value))).toBeCloseTo(value, 6);
    }
  });

  it("is monotonic increasing", () => {
    const scale = makeScale("log", RANGE);
    let previous = -1;
    for (let value = RANGE[0]; value <= RANGE[1]; value += 0.5) {
      const t = scale.tOf(value);
      expect(t).toBeGreaterThanOrEqual(previous);
      previous = t;
    }
  });

  it("clamps outside the range", () => {
    const scale = makeScale("log", RANGE);
    expect(scale.tOf(-5)).toBe(0);
    expect(scale.tOf(1e6)).toBe(1);
  });

  it("handles a zero minimum without NaN", () => {
    const scale = makeScale("log", [0, 10]);
    expect(scale.tOf(0)).toBe(0);
    expect(scale.tOf(10)).toBeCloseTo(1, 6);
    expect(Number.isFinite(scale.tOf(5))).toBe(true);
  });

  it("handles a degenerate range", () => {
    const scale = makeScale("log", [5, 5]);
    expect(scale.tOf(5)).toBe(0);
    expect(scale.valueAt(0.5)).toBe(5);
  });
});

describe("makeColorFn scale mode", () => {
  it("defaults to linear", () => {
    expect(makeColorFn("gray", RANGE)(5)).toEqual(makeColorFn("gray", RANGE, "linear")(5));
  });

  it("brightens a mid-range value under log", () => {
    const linear = makeColorFn("gray", RANGE, "linear")(5);
    const log = makeColorFn("gray", RANGE, "log")(5);
    expect(log[0]).toBeGreaterThan(linear[0]);
  });
});
