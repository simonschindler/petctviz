import { describe, expect, it } from "vitest";

import { computeTooltipPosition } from "../src/ui/help.js";

const VIEWPORT = { width: 1000, height: 800 };
const TIP = { width: 200, height: 60 };

describe("computeTooltipPosition", () => {
  it("places the tooltip to the right of the anchor when there is room", () => {
    const anchor = { left: 100, right: 120, top: 50 };
    expect(computeTooltipPosition(anchor, TIP, VIEWPORT)).toEqual({ left: 128, top: 50 });
  });

  it("flips to the left when it would overflow the right edge", () => {
    const anchor = { left: 900, right: 920, top: 50 };
    expect(computeTooltipPosition(anchor, TIP, VIEWPORT)).toEqual({ left: 692, top: 50 });
  });

  it("clamps within the viewport when neither side fits", () => {
    const anchor = { left: 10, right: 30, top: 5 };
    const tip = { width: 2000, height: 60 };
    expect(computeTooltipPosition(anchor, tip, VIEWPORT)).toEqual({ left: 8, top: 8 });
  });

  it("shifts up when it would overflow the bottom", () => {
    const anchor = { left: 100, right: 120, top: 780 };
    expect(computeTooltipPosition(anchor, TIP, VIEWPORT)).toEqual({ left: 128, top: 732 });
  });
});
