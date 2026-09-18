import { describe, expect, it } from "vitest";

import { clampWindow, presetRange, resolveWindow } from "../src/core/window.js";

const WINDOWS = {
  global: { min: 0, p1: 1, p5: 2, p95: 8, p99: 10, max: 20 },
  organs: {
    heart: { min: 0, p1: 1.5, p5: 2, p95: 9, p99: 16, max: 20 },
    liver: { min: 0, p1: 1.2, p5: 2.5, p95: 4.5, p99: 5, max: 17 },
  },
};

describe("presetRange", () => {
  it("returns percentile bounds for the percentile presets", () => {
    expect(presetRange(WINDOWS.global, "p1p99")).toEqual([1, 10]);
    expect(presetRange(WINDOWS.global, "p5p95")).toEqual([2, 8]);
  });

  it("returns the full extent for the full preset", () => {
    expect(presetRange(WINDOWS.global, "full")).toEqual([0, 20]);
  });
});

describe("clampWindow", () => {
  it("clamps to the spec extent", () => {
    expect(clampWindow(-5, 100, WINDOWS.global)).toEqual([0, 20]);
  });

  it("swaps inverted bounds", () => {
    expect(clampWindow(7, 3, WINDOWS.global)).toEqual([3, 7]);
  });
});

describe("resolveWindow", () => {
  it("uses the global spec in global scope", () => {
    expect(resolveWindow(WINDOWS, { scope: "global", preset: "p1p99" }, "heart")).toEqual([1, 10]);
  });

  it("uses the per-organ spec in organ scope", () => {
    expect(resolveWindow(WINDOWS, { scope: "organ", preset: "p1p99" }, "liver")).toEqual([1.2, 5]);
  });

  it("falls back to the global spec for an unknown organ", () => {
    expect(resolveWindow(WINDOWS, { scope: "organ", preset: "p1p99" }, "brain")).toEqual([1, 10]);
  });

  it("uses a custom global window and clamps it", () => {
    const window = resolveWindow(
      WINDOWS,
      { scope: "global", preset: "custom", custom: { global: [-5, 100] } },
      "heart",
    );
    expect(window).toEqual([0, 20]);
  });

  it("uses a custom per-organ window", () => {
    const window = resolveWindow(
      WINDOWS,
      { scope: "organ", preset: "custom", custom: { liver: [3, 4] } },
      "liver",
    );
    expect(window).toEqual([3, 4]);
  });

  it("falls back to p1-p99 when custom is missing", () => {
    expect(resolveWindow(WINDOWS, { scope: "global", preset: "custom" }, "heart")).toEqual([1, 10]);
  });
});
