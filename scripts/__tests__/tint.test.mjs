import { expect, test } from "vitest";
import { dominantTint } from "../lib/tint.mjs";

const px = (count, [r, g, b]) => Array.from({ length: count }, () => [r, g, b]).flat();
const buf = (...runs) => Uint8Array.from(runs.flat());

test("a saturated hue wins over a larger grey area", () => {
  const tint = dominantTint(buf(px(90, [120, 120, 120]), px(10, [200, 40, 40])));
  expect(tint).toMatch(/^#[0-9a-f]{6}$/);
  const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(tint.slice(i, i + 2), 16));
  expect(r).toBeGreaterThan(g);
  expect(r).toBeGreaterThan(b);
});

test("pushes the hue to a lightness that reads on black", () => {
  const tint = dominantTint(buf(px(20, [0, 0, 60])));
  expect(tint).toBe("#3030cf");
});

test("near-monochrome stills get no tint", () => {
  expect(dominantTint(buf(px(100, [30, 30, 30]), px(3, [200, 40, 40])))).toBeNull();
  expect(dominantTint(new Uint8Array())).toBeNull();
});
