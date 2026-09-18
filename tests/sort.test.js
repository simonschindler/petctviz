import { describe, expect, it } from "vitest";

import { sortBackToFront } from "../src/scene/sort.js";

const POSITIONS = new Float32Array([0, 0, 0, 0, 0, 10, 0, 0, -10, 0, 0, 5]);
const CAMERA = { x: 0, y: 0, z: 100 };

describe("sortBackToFront", () => {
  it("orders indices from farthest to nearest", () => {
    expect(sortBackToFront([0, 1, 2, 3], POSITIONS, CAMERA)).toEqual([2, 0, 3, 1]);
  });

  it("sorts in place and returns the same array", () => {
    const order = [0, 1, 2, 3];
    expect(sortBackToFront(order, POSITIONS, CAMERA)).toBe(order);
  });

  it("handles an empty order", () => {
    expect(sortBackToFront([], POSITIONS, CAMERA)).toEqual([]);
  });
});
