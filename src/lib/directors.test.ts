import { expect, test } from "vitest";
import { directorsOf, slugify, titlesBy } from "./directors";
import { mk } from "./testUtils";

test("slugify lower-cases, strips diacritics, collapses non-alphanumerics", () => {
  expect(slugify("Bong Joon Ho")).toBe("bong-joon-ho");
  expect(slugify("Jean-Pierre Jeunet")).toBe("jean-pierre-jeunet");
  expect(slugify("Miloš Forman")).toBe("milos-forman");
  expect(slugify("Gaspar Noé")).toBe("gaspar-noe");
  expect(slugify("  Ridley   Scott! ")).toBe("ridley-scott");
});

test("directorsOf is unique in first-seen order; titlesBy matches exactly", () => {
  const ts = [mk({ id: "a", directors: ["X", "Y"] }), mk({ id: "b", directors: ["Y"] }), mk({ id: "c", directors: [] })];
  expect(directorsOf(ts)).toEqual(["X", "Y"]);
  expect(titlesBy(ts, "Y").map((t) => t.id)).toEqual(["a", "b"]);
  expect(titlesBy(ts, "Z")).toEqual([]);
});
