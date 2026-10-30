import { describe, expect, test } from "vitest";
import { F, mk, U } from "../lib/testUtils";
import { counterText, deckReducer, initDeck, resolveInitialFilters } from "./deck";

const titles = [
  mk({ id: "a", moodBucket: "on-edge" }),
  mk({ id: "b", moodBucket: "on-edge" }),
  mk({ id: "c", moodBucket: "moved" }),
  mk({ id: "d", moodBucket: "moved" }),
  mk({ id: "e", moodBucket: "unsettling" }),
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
    const onEdgeIdx = s.deck.findIndex((t) => t.moodBucket === "on-edge");
    s = deckReducer(titles, {}, s, { type: "jump", id: s.deck[onEdgeIdx].id });
    const currentId = s.deck[s.index].id;
    s = deckReducer(titles, {}, s, { type: "setFilters", filters: { mood: "on-edge" } });
    expect(s.deck[s.index].id).toBe(currentId);
    expect(s.filters.mood).toBe("on-edge");
    s = deckReducer(titles, {}, s, { type: "setFilters", filters: { mood: "unsettling" } });
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

  test("shuffle changes seed and order, resets index", () => {
    let s = deckReducer(titles, {}, start(), { type: "next" });
    const order = ids(s);
    s = deckReducer(titles, {}, s, { type: "shuffle" });
    expect(s.seed).not.toBe(7);
    expect(s.index).toBe(0);
    expect(ids(s).sort()).toEqual([...order].sort());
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
  const defaults = { mood: "all", type: "all", runtime: "any", hideWatched: true };
  test("defaults when nothing stored", () => {
    expect(resolveInitialFilters("", null)).toEqual(defaults);
  });
  test("stored used when no hash", () => {
    expect(resolveInitialFilters("", { mood: "moved", hideWatched: false })).toEqual({ ...defaults, mood: "moved", hideWatched: false });
  });
  test("hash wins over stored for the keys it has", () => {
    expect(resolveInitialFilters("#mood=on-edge", { mood: "moved", type: "Series" })).toEqual({ ...defaults, mood: "on-edge", type: "Series" });
  });
  test("garbage in storage is ignored", () => {
    expect(resolveInitialFilters("", { mood: "zzz" as never, runtime: 5 as never })).toEqual(defaults);
  });
});
