import { afterEach, expect, test, vi } from "vitest";
import { clearView, freshNavigate, keyOf, loadView, routeKey, saveView } from "./viewState";

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

// vitest runs in node (no DOM), so the browser globals freshNavigate touches are stubbed.
function stubBrowser(hash: string) {
  const assigned: string[] = [];
  const loc = {};
  Object.defineProperty(loc, "hash", { get: () => hash, set: (v: string) => { assigned.push(v); } });
  const replaceState = vi.fn();
  const dispatchEvent = vi.fn();
  vi.stubGlobal("location", loc);
  vi.stubGlobal("history", { replaceState });
  vi.stubGlobal("dispatchEvent", dispatchEvent);
  vi.stubGlobal("HashChangeEvent", class { constructor(public type: string) {} });
  vi.stubGlobal("scrollTo", vi.fn());
  return { assigned, replaceState, dispatchEvent };
}

afterEach(() => vi.unstubAllGlobals());

test("freshNavigate with replace swaps the history entry and fires one hashchange", () => {
  const { assigned, replaceState, dispatchEvent } = stubBrowser("#/decades");
  freshNavigate("#/decades?d=1990", true);
  expect(replaceState).toHaveBeenCalledWith(null, "", "#/decades?d=1990");
  expect(assigned).toEqual([]);
  expect(dispatchEvent).toHaveBeenCalledTimes(1);
  expect(dispatchEvent.mock.calls[0][0].type).toBe("hashchange");
});

test("freshNavigate without replace still assigns location.hash", () => {
  const { assigned, replaceState, dispatchEvent } = stubBrowser("#/");
  freshNavigate("#/decades");
  expect(assigned).toEqual(["#/decades"]);
  expect(replaceState).not.toHaveBeenCalled();
  expect(dispatchEvent).not.toHaveBeenCalled();
});
