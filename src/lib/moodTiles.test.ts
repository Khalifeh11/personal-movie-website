import { expect, test } from "vitest";
import { MOODS } from "./moods";
import { countLabel, moodTiles } from "./moodTiles";
import { mk } from "./testUtils";

const deck = [
  mk({ id: "a", moods: ["tense", "gritty"], poster: "/a.jpg" }),
  mk({ id: "b", moods: ["bittersweet"], poster: "/b.jpg" }),
  mk({ id: "c", moods: ["tense"], poster: null }),
  mk({ id: "d", moods: ["tense"], poster: "/d.jpg" }),
  mk({ id: "e", moods: [], poster: null }),
];

test("one tile per mood in order, then All", () => {
  expect(moodTiles(deck).map((t) => t.slug)).toEqual([...MOODS.map((m) => m.slug), "all"]);
  expect(moodTiles(deck).at(-1)!.label).toBe("All");
});

test("a film counts in each of its moods; All counts the whole deck incl. untagged", () => {
  const bySlug = Object.fromEntries(moodTiles(deck).map((t) => [t.slug, t.count]));
  expect(bySlug.tense).toBe(3);
  expect(bySlug.gritty).toBe(1);
  expect(bySlug.bittersweet).toBe(1);
  expect(bySlug.all).toBe(5);
});

test("posters skip nulls, keep deck order, pad to four", () => {
  const tiles = Object.fromEntries(moodTiles(deck).map((t) => [t.slug, t]));
  expect(tiles.tense.posters).toEqual(["/a.jpg", "/d.jpg", null, null]);
  expect(tiles.dread).toMatchObject({ count: 0, posters: [null, null, null, null] });
  expect(tiles.all.posters).toEqual(["/a.jpg", "/b.jpg", "/d.jpg", null]);
});

test("countLabel", () => {
  expect(countLabel(1)).toBe("1 title");
  expect(countLabel(0)).toBe("0 titles");
  expect(countLabel(5)).toBe("5 titles");
});
