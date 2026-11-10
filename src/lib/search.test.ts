import { expect, test } from "vitest";
import { decadeQuery, fold, matchRange, moodQuery, rankTitles, wordStartIndex } from "./search";
import { mk } from "./testUtils";

const NOW = new Date("2026-11-10");
const carol = mk({ id: "carol", title: "Carol", year: 2015, imdbRating: 7.2, directors: ["Todd Haynes"] });
const cars = mk({ id: "cars", title: "The Cars That Ate Paris", year: 1974, imdbRating: 6.0, directors: ["Peter Weir"] });
const scarface = mk({ id: "scar", title: "Scarface", year: 1983, imdbRating: 8.3, directors: ["Brian De Palma"] });
const halloween = mk({ id: "hal", title: "Halloween", year: 1978, imdbRating: 7.7, directors: ["John Carpenter"] });
const spotlight = mk({ id: "spot", title: "Spotlight", year: 2015, imdbRating: 8.1, directors: ["Tom McCarthy"] });
const heist = mk({ id: "heist", title: "Rififi", year: 1955, imdbRating: 8.1, directors: ["Jules Dassin"], keywords: ["heist"] });
const amelie = mk({ id: "amelie", title: "Amélie", year: 2001, imdbRating: 8.3, directors: ["Jean-Pierre Jeunet"] });
const all = [halloween, scarface, spotlight, cars, carol, heist, amelie];
const ids = (ts: { id: string }[]) => ts.map((t) => t.id);

test("ranks title start, title word, title anywhere, then director", () => {
  expect(ids(rankTitles(all, "car"))).toEqual(["carol", "cars", "scar", "hal"]);
});

test("director matches only at the start of a name word", () => {
  expect(ids(rankTitles(all, "carthy"))).toEqual([]);
  expect(ids(rankTitles(all, "mccar"))).toEqual(["spot"]);
  expect(ids(rankTitles(all, "pierre"))).toEqual(["amelie"]);
});

test("exact year, multi-word, keywords, accents", () => {
  expect(ids(rankTitles(all, "2015"))).toEqual(["spot", "carol"]);
  expect(ids(rankTitles(all, "haynes 2015"))).toEqual(["carol"]);
  expect(ids(rankTitles(all, "heist"))).toEqual(["heist"]);
  expect(ids(rankTitles(all, "AMELIE"))).toEqual(["amelie"]);
  expect(rankTitles(all, "  ")).toEqual([]);
});

test("rating breaks ties within a tier", () => {
  const a = mk({ id: "a", title: "Night A", imdbRating: 6 });
  const b = mk({ id: "b", title: "Night B", imdbRating: 8 });
  expect(ids(rankTitles([a, b], "night"))).toEqual(["b", "a"]);
});

test("wordStartIndex", () => {
  expect(wordStartIndex(fold("John Carpenter"), "car")).toBe(5);
  expect(wordStartIndex(fold("Oscar Carpenter"), "car")).toBe(6);
  expect(wordStartIndex(fold("Oscar"), "car")).toBe(-1);
});

test("decadeQuery", () => {
  expect(decadeQuery("90s", NOW)).toBe(1990);
  expect(decadeQuery("'70s", NOW)).toBe(1970);
  expect(decadeQuery("10s", NOW)).toBe(2010);
  expect(decadeQuery("1960s", NOW)).toBe(1960);
  expect(decadeQuery("1960", NOW)).toBeNull();
  expect(decadeQuery("1920s", NOW)).toBeNull();
  expect(decadeQuery("2030s", NOW)).toBeNull();
  expect(decadeQuery("car", NOW)).toBeNull();
});

test("moodQuery", () => {
  expect(moodQuery("dream").map((m) => m.slug)).toEqual(["dreamy"]);
  expect(moodQuery("d")).toEqual([]);
  expect(moodQuery("zz")).toEqual([]);
});

test("matchRange", () => {
  expect(matchRange("Scarface", "car")).toEqual([1, 4]);
  expect(matchRange("Tom McCarthy", "car", true)).toBeNull();
  expect(matchRange("John Carpenter", "CAR", true)).toEqual([5, 8]);
  expect(matchRange("Amélie", "ame")).toEqual([0, 3]);
  expect(matchRange("Carol", "")).toBeNull();
});
