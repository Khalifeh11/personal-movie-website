import { expect, test } from "vitest";
import { MOODS, moodAccent, moodHero, moodLabel } from "./moods";

test("17 moods in spec order with labels", () => {
  expect(MOODS.map((m) => m.label)).toEqual([
    "Tense", "Gritty", "Puzzling", "Dread", "Mind-bending", "Thought-provoking", "Funny", "Absurd", "Satirical",
    "Feel-good", "Bittersweet", "Heartbreaking", "Epic", "Dreamy", "Romantic", "True story", "Slow & quiet",
  ]);
  expect(moodLabel("slow-and-quiet")).toBe("Slow & quiet");
  expect(moodLabel("all")).toBe("All");
});

test("every mood has a hex accent and a hero slot", () => {
  for (const m of MOODS) {
    expect(m.accent).toMatch(/^#[0-9A-F]{6}$/);
    expect(m.hero === null || /^tt\d+$/.test(m.hero)).toBe(true);
  }
});

test("moodAccent / moodHero", () => {
  expect(moodAccent("tense")).toBe("#E04E3A");
  expect(moodAccent("slow-and-quiet")).toBe("#6B9080");
  expect(moodAccent("all")).toBe("#FFFFFF");
  expect(moodHero("tense")).toBeNull();
  expect(moodHero("all")).toBeNull();
});
