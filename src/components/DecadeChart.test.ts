import { expect, test } from "vitest";
import { decadeAtFraction } from "./DecadeChart";

const now = new Date("2026-10-30");

test("decadeAtFraction maps the chart width onto the year axis", () => {
  expect(decadeAtFraction(0, now)).toBe(1930);
  expect(decadeAtFraction(0.999, now)).toBe(2020);
  // 97 years: index 48 is 1978.
  expect(decadeAtFraction(0.5, now)).toBe(1970);
});

test("decadeAtFraction clamps outside the chart", () => {
  expect(decadeAtFraction(-0.2, now)).toBe(1930);
  expect(decadeAtFraction(1.5, now)).toBe(2020);
});
