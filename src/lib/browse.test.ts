import { expect, test } from "vitest";
import { defaultDir, defaultDirFor, defaultSort, scopeKey, scopeLabel, scopeTitles, searchTitles, sortTitles } from "./browse";
import { mk, U } from "./testUtils";

const TODAY = new Date("2026-10-30");

const a = mk({ id: "a", title: "Brazil", year: 1985, runtime: 132, imdbRating: 7.9 });
const b = mk({ id: "b", title: "Alien", year: 1979, runtime: null, imdbRating: null });
const c = mk({ id: "c", title: "Le Samouraï", originalTitle: "Le Samouraï", year: 1967, runtime: 105, imdbRating: 8.0, directors: ["Jean-Pierre Melville"] });
const d = mk({ id: "d", title: "Elevator to the Gallows", year: null, runtime: 91, imdbRating: 7.9, directors: ["Louis Malle"] });
const all = [a, b, c, d];
const ids = (ts: { id: string }[]) => ts.map((t) => t.id);

test("imdb: desc, nulls last, ties keep input order", () => {
  expect(ids(sortTitles(all, "imdb", {}))).toEqual(["c", "a", "d", "b"]);
});
test("year: desc, nulls last", () => {
  expect(ids(sortTitles(all, "year", {}))).toEqual(["a", "b", "c", "d"]);
});
test("runtime: asc, nulls last", () => {
  expect(ids(sortTitles(all, "runtime", {}))).toEqual(["d", "c", "a", "b"]);
});
test("added: asc, nulls last", () => {
  const ts = [mk({ id: "a", added: "2017-06-17" }), mk({ id: "b", added: null }), mk({ id: "c", added: "2013-12-14" })];
  expect(ids(sortTitles(ts, "added", {}))).toEqual(["c", "a", "b"]);
  expect(defaultDir("added")).toBe("asc");
});
test("title: asc", () => {
  expect(ids(sortTitles(all, "title", {}))).toEqual(["b", "a", "d", "c"]);
});
test("mine: your rating desc, unrated last", () => {
  const user = { d: U({ rating: 4.5 }), a: U({ rating: 2 }) };
  expect(ids(sortTitles(all, "mine", user))).toEqual(["d", "a", "b", "c"]);
});
test("search is case- and diacritic-insensitive over title and director", () => {
  expect(ids(searchTitles(all, "samour"))).toEqual(["c"]);
  expect(ids(searchTitles(all, "MALLE"))).toEqual(["d"]);
  expect(ids(searchTitles(all, "  "))).toEqual(ids(all));
});
test("direction flips order; nulls stay last", () => {
  expect(ids(sortTitles(all, "imdb", {}, "asc"))).toEqual(["a", "d", "c", "b"]);
  expect(ids(sortTitles(all, "runtime", {}, "desc"))).toEqual(["a", "c", "d", "b"]);
  expect(ids(sortTitles(all, "title", {}, "desc"))).toEqual(["c", "d", "a", "b"]);
});
test("search matches genre, mood, keyword and year; every word must match", () => {
  const e = mk({ id: "e", title: "Heat", year: 1995, genres: ["Crime"], moods: ["tense"], keywords: ["heist"], directors: ["Michael Mann"] });
  const ts = [...all, e];
  expect(ids(searchTitles(ts, "crime"))).toEqual(["e"]);
  expect(ids(searchTitles(ts, "Tense"))).toEqual(["e"]);
  expect(ids(searchTitles(ts, "heist"))).toEqual(["e"]);
  expect(ids(searchTitles(ts, "1995"))).toEqual(["e"]);
  expect(ids(searchTitles(ts, "mann heist"))).toEqual(["e"]);
  expect(ids(searchTitles(ts, "mann alien"))).toEqual([]);
});

test("scopeTitles narrows by mood or by exact director", () => {
  const ts = [mk({ id: "a", moods: ["tense"], directors: ["X"] }), mk({ id: "b", moods: ["dread"], directors: ["X", "Y"] }), mk({ id: "c", moods: ["tense"], directors: [] })];
  expect(scopeTitles(ts, { kind: "mood", mood: "tense" }).map((t) => t.id)).toEqual(["a", "c"]);
  expect(scopeTitles(ts, { kind: "mood", mood: "all" }).length).toBe(3);
  expect(scopeTitles(ts, { kind: "director", name: "X" }).map((t) => t.id)).toEqual(["a", "b"]);
});

test("scopeLabel", () => {
  expect(scopeLabel({ kind: "mood", mood: "slow-and-quiet" })).toBe("Slow & quiet");
  expect(scopeLabel({ kind: "director", name: "Billy Wilder" })).toBe("Billy Wilder");
});

test("shelf scopes list the shelf's set, label with its heading and pick its default sort", () => {
  const ts = [mk({ id: "a", runtime: 95, added: "2015-01-01" }), mk({ id: "b", type: "Series", runtime: 60, added: "2013-01-01" }), mk({ id: "c", runtime: 85, added: null })];
  expect(ids(scopeTitles(ts, { kind: "shelf", shelf: "short", today: TODAY }))).toEqual(["c"]);
  expect(ids(scopeTitles(ts, { kind: "shelf", shelf: "waiting", today: TODAY }))).toEqual(["b", "a"]);
  expect(scopeLabel({ kind: "shelf", shelf: "short", today: TODAY })).toBe("Under 90 minutes");
  expect(scopeLabel({ kind: "shelf", shelf: "waiting", today: TODAY })).toBe("Waiting the longest");
  expect(scopeKey({ kind: "shelf", shelf: "short", today: TODAY })).toBe("shelf:short");
  expect(defaultSort({ kind: "shelf", shelf: "waiting", today: TODAY })).toBe("added");
  expect(defaultSort({ kind: "shelf", shelf: "short", today: TODAY })).toBe("runtime");
  expect(defaultSort({ kind: "mood", mood: "all" })).toBe("imdb");
  expect(defaultSort({ kind: "director", name: "X" })).toBe("imdb");
});

test("decade scope lists the decade year-ascending, labelled, keyed, sorted by year", () => {
  const ts = [mk({ id: "a", year: 2007 }), mk({ id: "b", year: 1999 }), mk({ id: "c", year: 2001 })];
  const scope = { kind: "decade", decade: 2000 } as const;
  expect(ids(scopeTitles(ts, scope))).toEqual(["c", "a"]);
  expect(scopeLabel(scope)).toBe("2000s");
  expect(scopeKey(scope)).toBe("decade:2000");
  expect(defaultSort(scope)).toBe("year");
  expect(defaultDirFor(scope, "year")).toBe("asc");
  expect(defaultDirFor({ kind: "mood", mood: "tense" }, "year")).toBe("desc");
});

test("search scope: ranked matches, quoted label, own key", () => {
  const scope = { kind: "search", q: "mal" } as const;
  expect(ids(scopeTitles(all, scope))).toEqual(["d"]);
  expect(scopeLabel(scope)).toBe("“mal”");
  expect(scopeKey(scope)).toBe("search:mal");
  expect(defaultSort(scope)).toBe("imdb");
});
