import { expect, test } from "vitest";
import { byline, feelsLine, genreLine, ratingText } from "./format";
import { mk } from "./testUtils";

test("byline: film / series with and without director", () => {
  expect(byline(mk({ directors: ["Louis Malle"] }))).toEqual({ lead: "A film by", name: "Louis Malle" });
  expect(byline(mk({ type: "Series", directors: ["Baran bo Odar"] }))).toEqual({ lead: "A series by", name: "Baran bo Odar" });
  expect(byline(mk({ type: "Series", directors: [] }))).toEqual({ lead: "A series", name: null });
  expect(byline(mk({ type: "Movie", directors: [] }))).toEqual({ lead: "A film", name: null });
  expect(byline(mk({ directors: ["Joel Coen", "Ethan Coen"] }))).toEqual({ lead: "A film by", name: "Joel Coen & Ethan Coen" });
});

test("genreLine: first three joined with a middot", () => {
  expect(genreLine(mk({ genres: ["Action", "Crime", "Drama", "Thriller"] }))).toBe("Action · Crime · Drama");
  expect(genreLine(mk({ genres: [] }))).toBe("—");
});

test("ratingText: one decimal or dash", () => {
  expect(ratingText(mk({ imdbRating: 8 }))).toBe("8.0");
  expect(ratingText(mk({ imdbRating: 7.9 }))).toBe("7.9");
  expect(ratingText(mk({ imdbRating: null }))).toBe("—");
});

test("feelsLine: mood labels joined, empty when untagged", () => {
  expect(feelsLine(mk({ moods: ["tense", "gritty"] }))).toBe("Tense · Gritty");
  expect(feelsLine(mk({ moods: ["slow-and-quiet"] }))).toBe("Slow & quiet");
  expect(feelsLine(mk({ moods: [] }))).toBe("");
});
