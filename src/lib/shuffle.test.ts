import { expect, test } from "vitest";
import { daySeed, seededShuffle } from "./shuffle";

test("same seed same order; different seed different order; input untouched", () => {
  const a = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  expect(seededShuffle(a, 42)).toEqual(seededShuffle(a, 42));
  expect(seededShuffle(a, 42)).not.toEqual(seededShuffle(a, 43));
  expect(seededShuffle(a, 42).slice().sort((x, y) => x - y)).toEqual(a);
  expect(a).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test("daySeed is YYYYMMDD in local time", () => {
  expect(daySeed(new Date(2026, 9, 30))).toBe(20261030);
});
