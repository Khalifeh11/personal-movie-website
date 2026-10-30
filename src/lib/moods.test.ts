import { readFileSync } from "node:fs";
import { describe, expect, test, vi } from "vitest";
import buckets from "../data/mood-buckets.json";
import { BUCKETS, bucketFor, bucketLabel } from "./moods";

describe("bucketFor", () => {
  test("maps every spec mood to its bucket", () => {
    expect(bucketFor("Tense, gritty")).toBe("on-edge");
    expect(bucketFor("Melancholic, poetic")).toBe("moved");
    expect(bucketFor("Informative, observational")).toBe("real-life");
  });

  test("unknown mood falls back to moved and warns", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(bucketFor("Zany, unknown")).toBe("moved");
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  test("every Likely mood in the CSV is mapped", () => {
    const csv = readFileSync("data/watchlist.csv", "utf8");
    // Likely mood is the quoted 2nd-to-last column; Broad themes is the quoted last column.
    const moods = new Set([...csv.matchAll(/"([^"]+)","[^"]+"\r?\n/g)].map((m) => m[1]));
    expect(moods.size).toBeGreaterThan(20);
    const known = new Set(Object.values(buckets).flat());
    for (const m of moods) expect(known.has(m), m).toBe(true);
  });
});

describe("BUCKETS", () => {
  test("order and labels", () => {
    expect(BUCKETS.map((b) => b.label)).toEqual([
      "On edge", "Unsettling", "Mind-bending", "Wry & funny", "Transported", "Moved", "Real life",
    ]);
    expect(bucketLabel("all")).toBe("All");
    expect(bucketLabel("wry-funny")).toBe("Wry & funny");
  });
});
