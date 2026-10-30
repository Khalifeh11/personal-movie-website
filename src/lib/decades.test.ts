import { expect, test } from "vitest";
import titlesJson from "../data/titles.json";
import {
  busiestDecade,
  decadeLabel,
  decadeOf,
  decades,
  decadeTitles,
  FIRST_YEAR,
  isDecade,
  nextDecade,
  yearCounts,
} from "./decades";
import { mk } from "./testUtils";

const now = new Date("2026-10-30");

test("decadeOf floors to the decade", () => {
  expect(decadeOf(1957)).toBe(1950);
  expect(decadeOf(2026)).toBe(2020);
});

test("decades runs from FIRST_YEAR to the current decade", () => {
  const ds = decades(now);
  expect(ds).toEqual([1930, 1940, 1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020]);
  expect(ds).toHaveLength(10);
});

test("yearCounts: index 0 is FIRST_YEAR, null years skipped", () => {
  const counts = yearCounts([mk({ year: 1930 }), mk({ year: 1930 }), mk({ year: 2026 }), mk({ year: null })], now);
  expect(counts).toHaveLength(97);
  expect(counts[0]).toBe(2);
  expect(counts[96]).toBe(1);
  expect(counts.reduce((a, b) => a + b, 0)).toBe(3);
});

test("decadeTitles keeps one decade, sorted by year then title", () => {
  const ts = [
    mk({ id: "b", title: "B", year: 2001 }),
    mk({ id: "a", title: "A", year: 2001 }),
    mk({ id: "z", title: "Z", year: 2000 }),
    mk({ id: "x", title: "X", year: 2010 }),
    mk({ id: "w", title: "W", year: 1999 }),
    mk({ id: "n", title: "N", year: null }),
  ];
  expect(decadeTitles(ts, 2000).map((t) => t.id)).toEqual(["z", "a", "b"]);
});

test("busiestDecade: most titles, ties go earlier, null when no years", () => {
  expect(busiestDecade([mk({ year: 2000 }), mk({ year: 2005 }), mk({ year: 1995 })])).toBe(2000);
  expect(busiestDecade([mk({ year: 1995 }), mk({ year: 2005 })])).toBe(1990);
  expect(busiestDecade([])).toBeNull();
  expect(busiestDecade([mk({ year: null })])).toBeNull();
});

test("nextDecade finds the nearest populated decade in a direction", () => {
  const ts = [mk({ year: 1957 }), mk({ year: 2004 })];
  expect(nextDecade(1990, ts, 1, now)).toBe(2000);
  expect(nextDecade(1990, ts, -1, now)).toBe(1950);
  expect(nextDecade(2020, ts, 1, now)).toBeNull();
});

test("decadeLabel", () => {
  expect(decadeLabel(2000)).toBe("2000s");
});

test("isDecade accepts multiples of 10 from FIRST_YEAR to the current decade", () => {
  expect(isDecade("2000", now)).toBe(true);
  expect(isDecade("2003", now)).toBe(false);
  expect(isDecade("1850", now)).toBe(false);
  expect(isDecade("2030", now)).toBe(false);
});

test("FIRST_YEAR covers every title in the catalogue", () => {
  const years = (titlesJson as { year: number | null }[]).flatMap((t) => (t.year == null ? [] : [t.year]));
  expect(FIRST_YEAR).toBeLessThanOrEqual(Math.min(...years));
});
