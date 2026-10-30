import { expect, test } from "vitest";
import { parseRoute, serializeRoute } from "./route";
import { F } from "./testUtils";

const home = { name: "home" } as const;

test("empty, bare and root hashes are home", () => {
  for (const h of ["", "#", "#/"]) {
    expect(parseRoute(h), h).toEqual({ route: home, filters: {}, redirect: false });
  }
});

test("mood route with filters", () => {
  expect(parseRoute("#/mood/on-edge?type=Movie&rt=mid")).toEqual({
    route: { name: "mood", mood: "on-edge" },
    filters: { type: "Movie", runtime: "mid" },
    redirect: false,
  });
  expect(parseRoute("#/mood/all").route).toEqual({ name: "mood", mood: "all" });
});

test("unknown paths and slugs redirect home and drop bad filters", () => {
  for (const h of ["#/mood/zzz", "#/mood/", "#/nope?type=Bogus"]) {
    expect(parseRoute(h), h).toEqual({ route: home, filters: {}, redirect: true });
  }
});

test("legacy query-only hash redirects home but keeps valid filters", () => {
  expect(parseRoute("#mood=on-edge&type=Series")).toEqual({ route: home, filters: { type: "Series" }, redirect: true });
});

test("serializeRoute and round trip", () => {
  expect(serializeRoute(home, F())).toBe("#/");
  expect(serializeRoute(home, F({ runtime: "mid" }))).toBe("#/?rt=mid");
  const r = { name: "mood", mood: "moved" } as const;
  const s = serializeRoute(r, F({ runtime: "long" }));
  expect(s).toBe("#/mood/moved?rt=long");
  expect(parseRoute(s)).toEqual({ route: r, filters: { runtime: "long" }, redirect: false });
});
