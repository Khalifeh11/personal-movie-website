import { expect, test } from "vitest";
import { parseRoute, serializeRoute } from "./route";
import { F } from "./testUtils";

const home = { name: "home" } as const;

test("empty, bare and root hashes are home", () => {
  for (const h of ["", "#", "#/"]) {
    expect(parseRoute(h), h).toEqual({
      route: home,
      filters: {},
      redirect: false,
    });
  }
});

test("mood route with filters", () => {
  expect(parseRoute("#/mood/slow-and-quiet?type=Movie&rt=mid")).toEqual({
    route: { name: "mood", mood: "slow-and-quiet" },
    filters: { type: "Movie", runtime: "mid" },
    redirect: false,
  });
  expect(parseRoute("#/mood/all").route).toEqual({ name: "mood", mood: "all" });
  expect(parseRoute("#/mood/mind-bending").route).toEqual({
    name: "mood",
    mood: "mind-bending",
  });
});

test("unknown paths and slugs redirect home and drop bad filters", () => {
  for (const h of [
    "#/mood/zzz",
    "#/mood/",
    "#/nope?type=Bogus",
    "#/mood/on-edge",
    "#/mood/moved",
    "#/mood/wry-funny",
  ]) {
    expect(parseRoute(h), h).toEqual({
      route: home,
      filters: {},
      redirect: true,
    });
  }
});

test("legacy query-only hash redirects home but keeps valid filters", () => {
  expect(parseRoute("#mood=on-edge&type=Series")).toEqual({
    route: home,
    filters: { type: "Series" },
    redirect: true,
  });
});

test("serializeRoute and round trip", () => {
  expect(serializeRoute(home, F())).toBe("#/");
  expect(serializeRoute(home, F({ runtime: "mid" }))).toBe("#/?rt=mid");
  const r = { name: "mood", mood: "feel-good" } as const;
  const s = serializeRoute(r, F({ runtime: "long" }));
  expect(s).toBe("#/mood/feel-good?rt=long");
  expect(parseRoute(s)).toEqual({
    route: r,
    filters: { runtime: "long" },
    redirect: false,
  });
});

const DIRS = ["Bong Joon Ho", "Miloš Forman"];

test("director route resolves a slug to the name and keeps filters", () => {
  expect(parseRoute("#/director/bong-joon-ho", DIRS)).toEqual({
    route: { name: "director", director: "Bong Joon Ho" },
    filters: {},
    redirect: false,
  });
  expect(parseRoute("#/director/milos-forman?type=Movie", DIRS)).toEqual({
    route: { name: "director", director: "Miloš Forman" },
    filters: { type: "Movie" },
    redirect: false,
  });
});

test("unknown director slug redirects home; no directors list means no director routes", () => {
  expect(parseRoute("#/director/nobody", DIRS)).toEqual({
    route: home,
    filters: {},
    redirect: true,
  });
  expect(parseRoute("#/director/bong-joon-ho")).toEqual({
    route: home,
    filters: {},
    redirect: true,
  });
});

test("director route round trip", () => {
  const r = { name: "director", director: "Miloš Forman" } as const;
  expect(serializeRoute(r, F({ type: "Series" }))).toBe(
    "#/director/milos-forman?type=Series",
  );
  expect(parseRoute(serializeRoute(r, F()), DIRS).route).toEqual(r);
});

test("shelf route parses, keeps filters, rejects unknown ids, round-trips", () => {
  expect(parseRoute("#/shelf/waiting?type=Movie")).toEqual({
    route: { name: "shelf", shelf: "waiting" },
    filters: { type: "Movie" },
    redirect: false,
  });
  expect(parseRoute("#/shelf/zzz")).toEqual({
    route: home,
    filters: {},
    redirect: true,
  });
  expect(serializeRoute({ name: "shelf", shelf: "short" }, F())).toBe(
    "#/shelf/short",
  );
});

test("decades route, bare and with a decade", () => {
  expect(parseRoute("#/decades")).toEqual({
    route: { name: "decades", decade: null },
    filters: {},
    redirect: false,
  });
  expect(parseRoute("#/decades/2000")).toEqual({
    route: { name: "decades", decade: 2000 },
    filters: {},
    redirect: false,
  });
  expect(parseRoute("#/decades/2000?type=Movie")).toEqual({
    route: { name: "decades", decade: 2000 },
    filters: { type: "Movie" },
    redirect: false,
  });
});

test("bad decades redirect home", () => {
  for (const h of ["#/decades/2003", "#/decades/1850"]) {
    expect(parseRoute(h), h).toEqual({
      route: home,
      filters: {},
      redirect: true,
    });
  }
});

test("serializeRoute decades", () => {
  expect(serializeRoute({ name: "decades", decade: null }, F())).toBe(
    "#/decades",
  );
  expect(serializeRoute({ name: "decades", decade: 2000 }, F())).toBe(
    "#/decades/2000",
  );
  expect(
    serializeRoute({ name: "decades", decade: 2000 }, F({ type: "Movie" })),
  ).toBe("#/decades/2000?type=Movie");
});

test("search route round-trips the query, blank or malformed ones go home", () => {
  const route = { name: "search", q: "lost in translation?" } as const;
  const hash = serializeRoute(route, F());
  expect(hash).toBe("#/search/lost%20in%20translation%3F");
  expect(parseRoute(hash).route).toEqual(route);
  expect(parseRoute("#/search/90s?type=Movie")).toEqual({ route: { name: "search", q: "90s" }, filters: { type: "Movie" }, redirect: false });
  for (const h of ["#/search/", "#/search/%20", "#/search/%E0%A4%A"]) expect(parseRoute(h).redirect, h).toBe(true);
});
