import { expect, test } from "vitest";
import { mk } from "./testUtils";
import { whyThis } from "./whyThis";

const today = new Date("2026-10-30");
// Filler titles have no director so the director reason stays out of the way.
const other = (id: string, added: string | null) => mk({ id, added, directors: [] });
const MOOD = "Picked for a Bittersweet night.";

test("movie: waiting + weeknight, oldest in deck", () => {
  const t = mk({ id: "x", added: "2013-12-14", runtime: 99 });
  const deck = [t, other("y", "2015-11-05"), other("z", "2017-06-17"), other("w", "2024-01-01")];
  expect(whyThis(t, { titles: deck, deck, today })).toBe(
    "It's been waiting on your list since December 2013, longer than anything else. At 99 minutes, a weeknight will do.",
  );
});

test("waiting that is not the oldest drops the 'longer than anything else' tail", () => {
  const t = mk({ id: "x", added: "2014-03-01", runtime: 120 });
  const deck = [t, other("y", "2013-01-01"), ...Array.from({ length: 6 }, (_, i) => other(`r${i}`, "2024-01-01"))];
  expect(whyThis(t, { titles: deck, deck, today })).toBe(`It's been waiting on your list since March 2014. ${MOOD}`);
});

test("waiting needs 3 years and the oldest quarter", () => {
  const recent = mk({ id: "x", added: "2024-06-01", runtime: 120 });
  const deck = [recent, other("y", "2013-01-01"), other("z", "2014-01-01"), other("w", "2015-01-01")];
  expect(whyThis(recent, { titles: deck, deck, today })).toBe(MOOD);
  const oldButNotOldest = mk({ id: "q", added: "2020-01-01", runtime: 120 });
  const deck2 = [oldButNotOldest, other("a", "2013-01-01"), other("b", "2014-01-01"), other("c", "2015-01-01"), other("d", "2016-01-01")];
  expect(whyThis(oldButNotOldest, { titles: deck2, deck: deck2, today })).toBe(MOOD);
});

test("series never gets the weeknight line", () => {
  const s = mk({ id: "s", type: "Series", runtime: 60, added: null, directors: [] });
  expect(whyThis(s, { titles: [s], deck: [s], today })).toBe(`Episodes run 60 minutes, so you can try one tonight. ${MOOD}`);
});

test("director counts the other titles; singular and plural", () => {
  const a = mk({ id: "a", runtime: 120, added: null, directors: ["Billy Wilder"] });
  const b = mk({ id: "b", directors: ["Billy Wilder"] });
  expect(whyThis(a, { titles: [a, b], deck: [a, b], today })).toBe(`Billy Wilder is on your list 1 more time. ${MOOD}`);
  const c = mk({ id: "c", directors: ["Billy Wilder"] });
  expect(whyThis(a, { titles: [a, b, c], deck: [a], today })).toMatch(/2 more times\./);
});

test("future or missing added, long runtime, lone director, untagged → null", () => {
  const t = mk({ id: "t", added: "2027-01-01", runtime: 150, moods: [] });
  expect(whyThis(t, { titles: [t], deck: [t], today })).toBeNull();
  const u = mk({ ...t, added: null });
  expect(whyThis(u, { titles: [u], deck: [u], today })).toBeNull();
});

test("ties on the oldest date both count as longest", () => {
  const a = mk({ id: "a", added: "2013-01-01", runtime: 150, moods: [] });
  const b = other("b", "2013-01-01");
  const deck = [a, b, other("c", "2020-01-01"), other("d", "2021-01-01")];
  expect(whyThis(a, { titles: deck, deck, today })).toMatch(/longer than anything else\.$/);
});
