import { expect, test } from "vitest";
import { parseHash, serializeHash } from "./hash";
import type { Filters } from "./types";

test("round trip", () => {
  const f: Filters = { mood: "on-edge", type: "Movie", runtime: "mid", hideWatched: true };
  expect(serializeHash(f)).toBe("#mood=on-edge&type=Movie&rt=mid");
  expect(parseHash("#mood=on-edge&type=Movie&rt=mid")).toEqual({
    mood: "on-edge", type: "Movie", runtime: "mid",
  });
});

test("defaults omitted", () => {
  expect(serializeHash({ mood: "all", type: "all", runtime: "any", hideWatched: true })).toBe("");
  expect(serializeHash({ mood: "moved", type: "all", runtime: "any", hideWatched: false })).toBe("#mood=moved");
});

test("invalid values dropped; empty hash → empty object", () => {
  expect(parseHash("#mood=zzz&rt=huge&type=Movie")).toEqual({ type: "Movie" });
  expect(parseHash("")).toEqual({});
  expect(parseHash("#")).toEqual({});
});
