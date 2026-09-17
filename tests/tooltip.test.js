import { describe, expect, it } from "vitest";

import { formatPatch } from "../src/ui/tooltip.js";

const subject = {
  positions: new Float32Array([1.5, -2.25, 3]),
  suvMean: new Float32Array([4.2]),
  suvMin: new Float32Array([1.1]),
  suvMax: new Float32Array([7.7]),
  organId: new Uint8Array([1]),
};

describe("formatPatch", () => {
  it("includes suv statistics", () => {
    const text = formatPatch(subject, 0, { 0: "heart", 1: "liver" });
    expect(text).toContain("4.20");
    expect(text).toContain("1.10");
    expect(text).toContain("7.70");
  });

  it("includes mm coordinates and the organ name", () => {
    const text = formatPatch(subject, 0, { 0: "heart", 1: "liver" });
    expect(text).toContain("1.5");
    expect(text).toContain("-2.3");
    expect(text).toContain("liver");
  });

  it("returns null for a missing patch", () => {
    expect(formatPatch(subject, 5, {})).toBe(null);
  });
});
