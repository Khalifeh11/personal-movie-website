import { expect, test } from "vitest";
import { MOODS, moodLabel } from "./moods";

test("17 moods in spec order with labels", () => {
  expect(MOODS.map((m) => m.label)).toEqual([
    "Tense", "Gritty", "Puzzling", "Dread", "Mind-bending", "Thought-provoking", "Funny", "Absurd", "Satirical",
    "Feel-good", "Bittersweet", "Heartbreaking", "Epic", "Dreamy", "Romantic", "True story", "Slow & quiet",
  ]);
  expect(moodLabel("slow-and-quiet")).toBe("Slow & quiet");
  expect(moodLabel("all")).toBe("All");
});
