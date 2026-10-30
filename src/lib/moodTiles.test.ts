import { expect, test } from "vitest";
import { BUCKETS } from "./moods";
import { countLabel, moodTiles } from "./moodTiles";
import { mk } from "./testUtils";

const deck = [
  mk({ id: "a", moodBucket: "on-edge", poster: "/a.jpg" }),
  mk({ id: "b", moodBucket: "moved", poster: "/b.jpg" }),
  mk({ id: "c", moodBucket: "on-edge", poster: null }),
  mk({ id: "d", moodBucket: "on-edge", poster: "/d.jpg" }),
];

test("one tile per bucket in order, then All", () => {
  expect(moodTiles(deck).map((t) => t.slug)).toEqual([...BUCKETS.map((b) => b.slug), "all"]);
  expect(moodTiles(deck).at(-1)!.label).toBe("All");
});

test("counts per bucket; All counts the whole deck", () => {
  const bySlug = Object.fromEntries(moodTiles(deck).map((t) => [t.slug, t.count]));
  expect(bySlug["on-edge"]).toBe(3);
  expect(bySlug.moved).toBe(1);
  expect(bySlug.all).toBe(4);
});

test("posters skip nulls, keep deck order, pad to four", () => {
  const tiles = Object.fromEntries(moodTiles(deck).map((t) => [t.slug, t]));
  expect(tiles["on-edge"].posters).toEqual(["/a.jpg", "/d.jpg", null, null]);
  expect(tiles.unsettling).toMatchObject({ count: 0, posters: [null, null, null, null] });
  expect(tiles.all.posters).toEqual(["/a.jpg", "/b.jpg", "/d.jpg", null]);
});

test("countLabel", () => {
  expect(countLabel(1)).toBe("1 title");
  expect(countLabel(0)).toBe("0 titles");
  expect(countLabel(5)).toBe("5 titles");
});
