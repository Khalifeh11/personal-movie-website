import { expect, test } from "vitest";
import { searchTitles, sortTitles } from "./browse";
import { mk, U } from "./testUtils";

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
