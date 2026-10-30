import { expect, test } from "vitest";
import { homeShelves, SHELF_LIMIT, shelfTitles } from "./shelves";
import { mk } from "./testUtils";

const ids = (ts: { id: string }[]) => ts.map((t) => t.id);
const byId = (shelves: ReturnType<typeof homeShelves>, id: string) => shelves.find((s) => s.id === id);

const short89 = mk({ id: "s89", title: "B", year: 1957, runtime: 89, added: "2015-11-05", directors: [] });
const short88 = mk({ id: "s88", title: "A", year: 1995, runtime: 88, added: null, directors: [] });
const series60 = mk({ id: "tv", type: "Series", runtime: 60, added: "2013-01-01", directors: [] });
const long = mk({ id: "long", runtime: 165, year: 2014, added: "2017-06-17", directors: ["Richard Linklater"] });
const hero = mk({ id: "hero", runtime: 99, year: 2001, added: "2013-12-14", directors: ["Richard Linklater"] });
const deck = [long, series60, short89, short88, hero];

test("short: movies under 90 only, shortest first, series excluded", () => {
  expect(ids(shelfTitles(deck, "short"))).toEqual(["s88", "s89"]);
  const shelf = byId(homeShelves(deck, hero), "short")!;
  expect(shelf.heading).toBe("Under 90 minutes");
  expect(shelf.meta(short89)).toBe("1957 · 89 min");
  expect(shelf.seeAll).toEqual({ name: "shelf", shelf: "short" });
});

test("waiting: oldest added first, null added excluded, meta 'since YYYY'", () => {
  expect(ids(shelfTitles(deck, "waiting"))).toEqual(["tv", "hero", "s89", "long"]);
  const shelf = byId(homeShelves(deck, hero), "waiting")!;
  expect(shelf.heading).toBe("Waiting the longest");
  expect(shelf.count).toBe(4);
  expect(shelf.meta(series60)).toBe("since 2013");
  expect(shelf.seeAll).toEqual({ name: "shelf", shelf: "waiting" });
});

test("ties in runtime and added fall back to title order", () => {
  const x = mk({ id: "x", title: "Zed", runtime: 80, added: "2015-01-01", directors: [] });
  const y = mk({ id: "y", title: "Alpha", runtime: 80, added: "2015-01-01", directors: [] });
  expect(ids(shelfTitles([x, y], "short"))).toEqual(["y", "x"]);
  expect(ids(shelfTitles([x, y], "waiting"))).toEqual(["y", "x"]);
});

test("items capped at SHELF_LIMIT, count is the full size", () => {
  const many = Array.from({ length: 15 }, (_, i) => mk({ id: `m${i}`, runtime: 70 + i, directors: [] }));
  const shelf = byId(homeShelves(many, undefined), "short")!;
  expect(shelf.items).toHaveLength(SHELF_LIMIT);
  expect(shelf.count).toBe(15);
});

test("director shelf follows the hero, excludes it, newest first", () => {
  const older = mk({ id: "older", year: 1993, runtime: 100, directors: ["Richard Linklater"] });
  const shelves = homeShelves([...deck, older], hero);
  const shelf = byId(shelves, "director")!;
  expect(shelf.heading).toBe("More from Richard Linklater");
  expect(ids(shelf.items)).toEqual(["long", "older"]);
  expect(shelf.count).toBe(2);
  expect(shelf.meta(long)).toBe("2014 · 165 min");
  expect(shelf.seeAll).toEqual({ name: "director", director: "Richard Linklater" });
  expect(shelves.map((s) => s.id)).toEqual(["short", "waiting", "director"]);
});

test("director shelf omitted without other titles, without directors, or without a hero", () => {
  const lone = mk({ id: "lone", directors: ["Nobody Else"] });
  expect(byId(homeShelves([...deck, lone], lone), "director")).toBeUndefined();
  expect(byId(homeShelves(deck, series60), "director")).toBeUndefined();
  expect(byId(homeShelves(deck, undefined), "director")).toBeUndefined();
});

test("empty deck → no shelves", () => {
  expect(homeShelves([], undefined)).toEqual([]);
});

test("a shelf with nothing in it is omitted", () => {
  expect(homeShelves([long], long).map((s) => s.id)).toEqual(["waiting"]);
});
