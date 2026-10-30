import { describe, expect, test } from "vitest";
import { F, mk, U } from "../lib/testUtils";
import { counterText, deckReducer, initDeck, resolveInitialFilters } from "./deck";

const titles = [
  mk({ id: "a", runtime: 90 }),
  mk({ id: "b", runtime: 95 }),
  mk({ id: "c", runtime: 110 }),
  mk({ id: "d", runtime: 120 }),
  mk({ id: "e", runtime: 150 }),
];
const start = (f = F()) => initDeck(titles, f, {}, 7);
const ids = (s: ReturnType<typeof start>) => s.deck.map((t) => t.id);

describe("deckReducer", () => {
  test("next/prev wrap around", () => {
    let s = start();
    expect(s.deck).toHaveLength(5);
    s = deckReducer(titles, {}, s, { type: "prev" });
    expect(s.index).toBe(4);
    s = deckReducer(titles, {}, s, { type: "next" });
    expect(s.index).toBe(0);
  });

  test("setFilters keeps current title if still present, else resets to 0", () => {
    let s = start();
    const shortIdx = s.deck.findIndex((t) => t.runtime! < 100);
    s = deckReducer(titles, {}, s, { type: "jump", id: s.deck[shortIdx].id });
    const currentId = s.deck[s.index].id;
    s = deckReducer(titles, {}, s, { type: "setFilters", filters: { runtime: "short" } });
    expect(s.deck[s.index].id).toBe(currentId);
    expect(s.filters.runtime).toBe("short");
    s = deckReducer(titles, {}, s, { type: "setFilters", filters: { runtime: "long" } });
    expect(ids(s)).toEqual(["e"]);
    expect(s.index).toBe(0);
  });

  test("jump sets index to that id; unknown id is ignored", () => {
    let s = start();
    s = deckReducer(titles, {}, s, { type: "jump", id: "d" });
    expect(s.deck[s.index].id).toBe("d");
    const before = s.index;
    s = deckReducer(titles, {}, s, { type: "jump", id: "zzz" });
    expect(s.index).toBe(before);
  });

  test("rebuild with everything watched + hideWatched → empty deck, index 0, next is safe", () => {
    const all = Object.fromEntries(titles.map((t) => [t.id, U({ watched: true })]));
    let s = start(F({ hideWatched: true }));
    s = deckReducer(titles, all, s, { type: "rebuild", user: all });
    expect(s.deck).toEqual([]);
    expect(s.index).toBe(0);
    s = deckReducer(titles, all, s, { type: "next" });
    expect(s.index).toBe(0);
  });
});

test("counterText pads to two digits; empty deck shows 00 / 00", () => {
  expect(counterText(start())).toBe("01 / 05");
  expect(counterText({ ...start(), deck: [], index: 0 })).toBe("00 / 00");
});

describe("resolveInitialFilters", () => {
  const defaults = { type: "all", runtime: "any", hideWatched: true };
  test("defaults when nothing stored", () => {
    expect(resolveInitialFilters("", null)).toEqual(defaults);
  });
  test("stored used when no hash", () => {
    expect(resolveInitialFilters("", { runtime: "long", hideWatched: false })).toEqual({ ...defaults, runtime: "long", hideWatched: false });
  });
  test("hash wins over stored for the keys it has", () => {
    expect(resolveInitialFilters("#/mood/moved?rt=short", { runtime: "long", type: "Series" })).toEqual({ ...defaults, runtime: "short", type: "Series" });
  });
  test("garbage in storage is ignored", () => {
    expect(resolveInitialFilters("", { type: "zzz" as never, runtime: 5 as never })).toEqual(defaults);
  });
});
