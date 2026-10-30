import { expect, test } from "vitest";
import { mk } from "./testUtils";
import { tintOf } from "./tint";

test("prefers the still's tint, then the first mood's accent, then grey", () => {
  expect(tintOf(mk({ tint: "#cf3040", moods: ["dread"] }))).toBe("#cf3040");
  expect(tintOf(mk({ tint: null, moods: ["dread"] }))).toBe("#7A2A8C");
  expect(tintOf(mk({ tint: null, moods: [] }))).toBe("#8a8a8a");
  expect(tintOf(undefined)).toBe("#8a8a8a");
});
