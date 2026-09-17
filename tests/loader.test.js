import { describe, expect, it } from "vitest";

import { decodeSubject } from "../src/data/loader.js";

function makeBuffer(records) {
  const array = new Float32Array(records.length * 7);
  records.forEach((record, index) => {
    const offset = index * 7;
    array.set(record, offset);
  });
  return array.buffer;
}

describe("decodeSubject", () => {
  it("splits the interleaved buffer into typed arrays", () => {
    const buffer = makeBuffer([
      [1, 2, 3, 4, 5, 6, 0],
      [7, 8, 9, 10, 11, 12, 1],
    ]);
    const subject = decodeSubject(buffer);

    expect(subject.count).toBe(2);
    expect(Array.from(subject.positions)).toEqual([1, 2, 3, 7, 8, 9]);
    expect(Array.from(subject.suvMean)).toEqual([4, 10]);
    expect(Array.from(subject.suvMin)).toEqual([5, 11]);
    expect(Array.from(subject.suvMax)).toEqual([6, 12]);
    expect(Array.from(subject.organId)).toEqual([0, 1]);
  });

  it("groups patch indices by organ", () => {
    const buffer = makeBuffer([
      [0, 0, 0, 1, 1, 1, 0],
      [0, 0, 0, 1, 1, 1, 1],
      [0, 0, 0, 1, 1, 1, 0],
    ]);
    const subject = decodeSubject(buffer);
    expect(subject.byOrgan.get(0)).toEqual([0, 2]);
    expect(subject.byOrgan.get(1)).toEqual([1]);
  });

  it("computes axis-aligned bounds", () => {
    const buffer = makeBuffer([
      [1, 2, 3, 0, 0, 0, 0],
      [-1, 8, 0, 0, 0, 0, 0],
    ]);
    const subject = decodeSubject(buffer);
    expect(subject.bounds.min).toEqual([-1, 2, 0]);
    expect(subject.bounds.max).toEqual([1, 8, 3]);
  });
});
