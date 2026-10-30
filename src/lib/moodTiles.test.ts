import { expect, test } from "vitest";
import { MOODS } from "./moods";
import { countLabel, moodTiles } from "./moodTiles";
import { mk } from "./testUtils";

const deck = [
  mk({ id: "a", moods: ["tense", "gritty"] }),
  mk({ id: "b", moods: ["bittersweet"] }),
  mk({ id: "c", moods: ["tense"] }),
  mk({ id: "d", moods: ["tense"] }),
  mk({ id: "e", moods: [] }),
];

const all = [
  mk({ id: "a", moods: ["tense", "gritty"], imdbRating: 9, imdbVotes: 10, backdrop: "/a.jpg", backdropSmall: "/a-sm.jpg" }),
  mk({ id: "b", moods: ["tense"], imdbRating: 8, imdbVotes: 10, backdrop: "/b.jpg", backdropSmall: null }),
  mk({ id: "c", moods: ["gritty"], imdbRating: 9, imdbVotes: 5, backdrop: "/c.jpg", backdropSmall: "/c-sm.jpg" }),
  mk({ id: "d", moods: ["dread"], imdbRating: 9, backdrop: null }),
];

test("one tile per mood in order, then All", () => {
  expect(moodTiles(deck, deck).map((t) => t.slug)).toEqual([...MOODS.map((m) => m.slug), "all"]);
  expect(moodTiles(deck, deck).at(-1)!.label).toBe("All");
});

test("a film counts in each of its moods; All counts the whole deck incl. untagged", () => {
  const bySlug = Object.fromEntries(moodTiles(deck, deck).map((t) => [t.slug, t.count]));
  expect(bySlug.tense).toBe(3);
  expect(bySlug.gritty).toBe(1);
  expect(bySlug.bittersweet).toBe(1);
  expect(bySlug.all).toBe(5);
});

test("picks the best-rated backdrop per mood, from all titles, never reusing one", () => {
  const t = Object.fromEntries(moodTiles([], all).map((x) => [x.slug, x]));
  expect(t.tense.backdrop).toBe("/a-sm.jpg"); // a wins tense (9 > 8)
  expect(t.gritty.backdrop).toBe("/c-sm.jpg"); // a already used → c
  expect(t.dread.backdrop).toBeNull(); // only title has no backdrop
  expect(t.all.backdrop).toBe("/b.jpg"); // a, c used; b has no small → full
  expect(t.tense.count).toBe(0); // count still from the (empty) deck
  expect(t.tense.accent).toBe("#E04E3A");
});

test("ties break by votes then id", () => {
  const x = mk({ id: "x", moods: ["funny"], imdbRating: 7, imdbVotes: 1, backdrop: "/x.jpg" });
  const y = mk({ id: "y", moods: ["funny"], imdbRating: 7, imdbVotes: 2, backdrop: "/y.jpg" });
  const z = mk({ id: "z", moods: ["funny"], imdbRating: 7, imdbVotes: 2, backdrop: "/z.jpg" });
  expect(moodTiles([], [z, x, y]).find((t) => t.slug === "funny")!.backdrop).toBe("/y.jpg");
});

test("hero override wins and is skipped by later tiles; a bad hero id falls through", () => {
  const heroOf = (s: string) => (s === "gritty" ? "a" : s === "dread" ? "nope" : null);
  const t = Object.fromEntries(moodTiles([], all, heroOf).map((x) => [x.slug, x]));
  expect(t.gritty.backdrop).toBe("/a-sm.jpg");
  expect(t.tense.backdrop).toBe("/b.jpg");
  expect(t.dread.backdrop).toBeNull();
});

test("countLabel", () => {
  expect(countLabel(1)).toBe("1 title");
  expect(countLabel(0)).toBe("0 titles");
  expect(countLabel(5)).toBe("5 titles");
});
