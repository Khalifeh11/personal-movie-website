import { expect, test } from "vitest";
import { parseQuery, serializeQuery } from "./hash";
import type { Filters } from "./types";

test("round trip", () => {
  const f: Filters = { type: "Movie", runtime: "mid", hideWatched: true };
  expect(serializeQuery(f)).toBe("type=Movie&rt=mid");
  expect(parseQuery("type=Movie&rt=mid")).toEqual({ type: "Movie", runtime: "mid" });
});

test("defaults omitted", () => {
  expect(serializeQuery({ type: "all", runtime: "any", hideWatched: true })).toBe("");
  expect(serializeQuery({ type: "Series", runtime: "any", hideWatched: false })).toBe("type=Series");
});

test("invalid values and unknown keys dropped; empty query → empty object", () => {
  expect(parseQuery("mood=on-edge&rt=huge&type=Movie")).toEqual({ type: "Movie" });
  expect(parseQuery("")).toEqual({});
});
