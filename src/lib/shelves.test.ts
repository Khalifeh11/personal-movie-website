import { expect, test } from "vitest";
import { homeShelves, SHELF_LIMIT, shelfTitles } from "./shelves";
import { mk } from "./testUtils";

// Local-time midnight, like the app passes.
const today = new Date(2026, 9, 30);
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
  const shelf = byId(homeShelves(deck, hero, today), "short")!;
  expect(shelf.heading).toBe("Under 90 minutes");
  expect(shelf.meta(short89)).toBe("1957 · 89 min");
  expect(shelf.seeAll).toEqual({ name: "shelf", shelf: "short" });
});

test("waiting: oldest added first, null added excluded, meta 'since YYYY'", () => {
  expect(ids(shelfTitles(deck, "waiting"))).toEqual(["tv", "hero", "s89", "long"]);
  const shelf = byId(homeShelves(deck, hero, today), "waiting")!;
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
  const shelf = byId(homeShelves(many, undefined, today), "short")!;
  expect(shelf.items).toHaveLength(SHELF_LIMIT);
  expect(shelf.count).toBe(15);
});

test("director shelf follows the hero, excludes it, newest first", () => {
  const older = mk({ id: "older", year: 1993, runtime: 100, directors: ["Richard Linklater"] });
  const shelves = homeShelves([...deck, older], hero, today);
  const shelf = byId(shelves, "director")!;
  expect(shelf.heading).toBe("More from Richard Linklater");
  expect(ids(shelf.items)).toEqual(["long", "older"]);
  expect(shelf.count).toBe(2);
  expect(shelf.meta(long)).toBe("2014 · 165 min");
  expect(shelf.seeAll).toEqual({ name: "director", director: "Richard Linklater" });
  expect(shelves.map((s) => s.id)).toEqual(["short", "waiting", "director"]);
});

test("director shelf needs at least two other titles", () => {
  // hero + long share a director: one other title is too thin a shelf.
  expect(byId(homeShelves(deck, hero, today), "director")).toBeUndefined();
  const older = mk({ id: "older", year: 1993, directors: ["Richard Linklater"] });
  expect(byId(homeShelves([...deck, older], hero, today), "director")?.count).toBe(2);
});

test("director shelf omitted without other titles, without directors, or without a hero", () => {
  const lone = mk({ id: "lone", directors: ["Nobody Else"] });
  expect(byId(homeShelves([...deck, lone], lone, today), "director")).toBeUndefined();
  expect(byId(homeShelves(deck, series60, today), "director")).toBeUndefined();
  expect(byId(homeShelves(deck, undefined, today), "director")).toBeUndefined();
});

test("empty deck → no shelves", () => {
  expect(homeShelves([], undefined, today)).toEqual([]);
});

test("a shelf with nothing in it is omitted", () => {
  expect(homeShelves([long], long, today).map((s) => s.id)).toEqual(["waiting"]);
});

const added = (id: string, d: string) => mk({ id, added: d, directors: [] });

test("around: within 3 days either side, earlier years only", () => {
  const ts = [added("in3", "2013-10-27"), added("out", "2013-10-26"), added("same", "2026-10-30"), added("fwd", "2014-11-02"), added("none", "2014-11-03")];
  expect(ids(shelfTitles(ts, "around", today)).sort()).toEqual(["fwd", "in3"]);
});

test("around: wraps across Jan 1 both ways", () => {
  const ts = [added("dec", "2015-12-30"), added("far", "2015-12-27")];
  expect(ids(shelfTitles(ts, "around", new Date(2026, 0, 1)))).toEqual(["dec"]);
  expect(ids(shelfTitles([added("jan", "2015-01-02")], "around", new Date(2026, 11, 31)))).toEqual(["jan"]);
});

test("around: Feb 29 counts as Mar 1", () => {
  expect(ids(shelfTitles([added("leap", "2016-02-29")], "around", new Date(2026, 2, 2)))).toEqual(["leap"]);
});

test("around: nearest day first, then earliest added, then title", () => {
  const ts = [added("far", "2013-10-28"), added("a", "2015-10-30"), added("b", "2013-10-30")];
  expect(ids(shelfTitles(ts, "around", today))).toEqual(["b", "a", "far"]);
});

test("around shelf: fourth after waiting, before director, with a short-date caption", () => {
  const near = mk({ id: "near", added: "2013-10-30", runtime: 100, directors: [] });
  const older = mk({ id: "older", year: 1993, runtime: 100, directors: ["Richard Linklater"] });
  const shelves = homeShelves([...deck, near, older], hero, today);
  expect(shelves.map((s) => s.id)).toEqual(["short", "waiting", "around", "director"]);
  const shelf = byId(shelves, "around")!;
  expect(shelf.heading).toBe("This week, years ago");
  expect(shelf.meta(hero)).toBe("Dec 14, 2013");
  expect(shelf.seeAll).toEqual({ name: "shelf", shelf: "around" });
});

test("around shelf omitted when nothing is near", () => {
  expect(byId(homeShelves(deck, hero, today), "around")).toBeUndefined();
});

test("around: Jan 1 excludes a film added days ago last year, keeps older Decembers", () => {
  const ts = [added("recent", "2025-12-30"), added("old", "2024-12-30")];
  expect(ids(shelfTitles(ts, "around", new Date(2026, 0, 1)))).toEqual(["old"]);
});
