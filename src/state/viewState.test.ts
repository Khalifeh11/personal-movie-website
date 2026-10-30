import { expect, test } from "vitest";
import { clearView, keyOf, loadView, routeKey, saveView } from "./viewState";

const v = { sort: "year" as const, dir: "asc" as const, query: "mal", scrollY: 1200 };

test("routeKey is the path without query", () => {
  expect(routeKey({ name: "home" })).toBe("/");
  expect(routeKey({ name: "mood", mood: "tense" })).toBe("/mood/tense");
  expect(routeKey({ name: "director", director: "Bong Joon Ho" })).toBe("/director/bong-joon-ho");
});

test("save, load, clear", () => {
  expect(loadView("/mood/tense")).toBeNull();
  saveView("/mood/tense", v);
  expect(loadView("/mood/tense")).toEqual(v);
  clearView("/mood/tense");
  expect(loadView("/mood/tense")).toBeNull();
});

test("keyOf takes the path between # and ?", () => {
  expect(keyOf("#/mood/dread?type=Movie")).toBe("/mood/dread");
  expect(keyOf("#/")).toBe("/");
  expect(keyOf("#/director/x")).toBe("/director/x");
});
