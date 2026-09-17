import { describe, expect, it } from "vitest";

import { COLORMAPS, makeColorFn, sampleColormap } from "../src/core/colormaps.js";
import { computeOpacity, curatedClinical, normalizeSuv } from "../src/core/logic.js";

describe("normalizeSuv", () => {
  it("maps the range endpoints to 0 and 1", () => {
    expect(normalizeSuv(2, [2, 10])).toBe(0);
    expect(normalizeSuv(10, [2, 10])).toBe(1);
  });

  it("clamps outside the range", () => {
    expect(normalizeSuv(-5, [2, 10])).toBe(0);
    expect(normalizeSuv(99, [2, 10])).toBe(1);
  });

  it("handles a degenerate range", () => {
    expect(normalizeSuv(5, [5, 5])).toBe(0);
  });
});

describe("computeOpacity", () => {
  it("is fully opaque at and above the threshold", () => {
    expect(computeOpacity(5, 5, 2)).toBe(1);
    expect(computeOpacity(9, 5, 2)).toBe(1);
  });

  it("fades linearly below the threshold", () => {
    expect(computeOpacity(4, 5, 2)).toBeCloseTo(0.5);
    expect(computeOpacity(3, 5, 2)).toBeCloseTo(0);
  });

  it("clamps to zero below the fade band", () => {
    expect(computeOpacity(0, 5, 2)).toBe(0);
  });

  it("becomes a hard cutoff when fadeWidth is zero", () => {
    expect(computeOpacity(4.9, 5, 0)).toBe(0);
    expect(computeOpacity(5, 5, 0)).toBe(1);
  });
});

describe("sampleColormap", () => {
  it("returns the stop colors at the endpoints", () => {
    expect(sampleColormap("gray", 0)).toEqual([0, 0, 0]);
    expect(sampleColormap("gray", 1)).toEqual([1, 1, 1]);
  });

  it("interpolates between stops", () => {
    const [r] = sampleColormap("gray", 0.5);
    expect(r).toBeCloseTo(0.5);
  });

  it("falls back to the pet colormap for unknown names", () => {
    expect(sampleColormap("nope", 0)).toEqual(sampleColormap("pet", 0));
  });
});

describe("makeColorFn", () => {
  it("produces a color for a suv value", () => {
    const fn = makeColorFn("viridis", [0, 10]);
    const color = fn(5);
    expect(color).toHaveLength(3);
    expect(color.every((c) => c >= 0 && c <= 1)).toBe(true);
  });
});

describe("curatedClinical", () => {
  it("returns an empty list for a missing record", () => {
    expect(curatedClinical(null)).toEqual([]);
  });

  it("maps known fields to labels and preserves values", () => {
    const rows = curatedClinical({ age: "50", sex: "0" });
    const age = rows.find((row) => row.label === "Age");
    expect(age.value).toBe("50");
    const cohort = rows.find((row) => row.label === "Cohort");
    expect(cohort.value).toBe(null);
  });
});

describe("COLORMAPS", () => {
  it("exposes pet, viridis and gray", () => {
    expect(Object.keys(COLORMAPS).sort()).toEqual(["gray", "pet", "viridis"]);
  });
});
