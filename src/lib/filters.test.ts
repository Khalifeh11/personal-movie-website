import { describe, expect, test } from "vitest";
import { buildDeck, formatRuntime, inMood, matches, runtimeBand } from "./filters";
import { F, mk, U } from "./testUtils";

test("runtime bands", () => {
  expect(runtimeBand(99)).toBe("short");
  expect(runtimeBand(100)).toBe("mid");
  expect(runtimeBand(140)).toBe("mid");
  expect(runtimeBand(141)).toBe("long");
  expect(runtimeBand(null)).toBeNull();
});

test("null runtime passes any, fails ranged bands", () => {
  const t = mk({ runtime: null });
  expect(matches(t, F({ runtime: "any" }), {})).toBe(true);
  for (const r of ["short", "mid", "long"] as const) {
    expect(matches(t, F({ runtime: r }), {}), r).toBe(false);
  }
});

test("inMood: all matches everything, a bucket only itself", () => {
  const t = mk({ moodBucket: "on-edge" });
  expect(inMood(t, "all")).toBe(true);
  expect(inMood(t, "on-edge")).toBe(true);
  expect(inMood(t, "moved")).toBe(false);
});

describe("matches", () => {
  const t = mk({ id: "tt1", moodBucket: "on-edge", type: "Series" });
  test("type filter", () => {
    expect(matches(t, F({ type: "Series" }), {})).toBe(true);
    expect(matches(t, F({ type: "Movie" }), {})).toBe(false);
  });
  test("hideWatched", () => {
    const user = { tt1: U({ watched: true }) };
    expect(matches(t, F({ hideWatched: true }), user)).toBe(false);
    expect(matches(t, F({ hideWatched: false }), user)).toBe(true);
    expect(matches(t, F({ hideWatched: true }), {})).toBe(true);
  });
});

test("buildDeck is seeded and can be empty", () => {
  const ts = [mk({ id: "a" }), mk({ id: "b" }), mk({ id: "c" })];
  expect(buildDeck(ts, F(), {}, 1)).toEqual(buildDeck(ts, F(), {}, 1));
  expect(buildDeck(ts, F(), {}, 1)).toHaveLength(3);
  const allWatched = Object.fromEntries(ts.map((t) => [t.id, U({ watched: true })]));
  expect(buildDeck(ts, F({ hideWatched: true }), allWatched, 1)).toEqual([]);
});

test("formatRuntime", () => {
  expect(formatRuntime(mk({ runtime: 91 }))).toBe("91 min");
  expect(formatRuntime(mk({ runtime: 60, type: "Series" }))).toBe("60 min / ep");
  expect(formatRuntime(mk({ runtime: null }))).toBe("—");
});
