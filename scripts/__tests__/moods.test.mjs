import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { applyMoods } from "../lib/moods.mjs";

const vocab = JSON.parse(readFileSync(new URL("../../src/data/moods.json", import.meta.url), "utf8"));
const t = (id) => ({ id, title: id });

test("vocabulary: 17 moods, tense first, slow-and-quiet last", () => {
  expect(vocab).toHaveLength(17);
  expect(vocab[0]).toEqual({ slug: "tense", label: "Tense" });
  expect(vocab.at(-1)).toEqual({ slug: "slow-and-quiet", label: "Slow & quiet" });
});

test("merges tags in vocabulary order; reports untagged and stray ids", () => {
  const res = applyMoods([t("tt1"), t("tt2")], { tt1: ["gritty", "tense"], tt9: ["funny"] }, vocab);
  expect(res.titles).toEqual([{ ...t("tt1"), moods: ["tense", "gritty"] }, { ...t("tt2"), moods: [] }]);
  expect(res.untagged).toEqual(["tt2"]);
  expect(res.stray).toEqual(["tt9"]);
});

test("throws naming the id for unknown slugs, empty lists and more than 3 tags", () => {
  for (const tags of [["zany"], [], ["tense", "gritty", "dread", "funny"]]) {
    expect(() => applyMoods([t("tt1")], { tt1: tags }, vocab), JSON.stringify(tags)).toThrow(/tt1/);
  }
});
