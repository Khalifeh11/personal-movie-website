import { describe, expect, test, vi } from "vitest";
import { LocalStorageUserData, STORAGE_KEY } from "./userData";

function fakeStorage(): Pick<Storage, "getItem" | "setItem"> {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
  };
}

describe("LocalStorageUserData", () => {
  test("get default, set stamps updatedAt and persists under STORAGE_KEY", async () => {
    const s = fakeStorage();
    const d = new LocalStorageUserData(s, () => new Date("2026-10-30T20:00:00Z"));
    expect(d.get("tt1")).toEqual({ watched: false, rating: null, note: "", updatedAt: "" });
    await d.set("tt1", { watched: true, rating: 4.5 });
    expect(s.getItem(STORAGE_KEY)).toContain("tt1");
    expect(new LocalStorageUserData(s).get("tt1")).toMatchObject({
      watched: true, rating: 4.5, note: "", updatedAt: "2026-10-30T20:00:00.000Z",
    });
  });

  test("rating must be 0.5 steps in [0.5,5] or null", async () => {
    const d = new LocalStorageUserData(fakeStorage());
    await expect(d.set("tt1", { rating: 4.3 })).rejects.toThrow();
    await expect(d.set("tt1", { rating: 6 })).rejects.toThrow();
    await expect(d.set("tt1", { rating: 0 })).rejects.toThrow();
    await d.set("tt1", { rating: 0.5 });
    await d.set("tt1", { rating: null });
    expect(d.get("tt1").rating).toBeNull();
  });

  test("all() returns every entry", async () => {
    const d = new LocalStorageUserData(fakeStorage());
    await d.set("a", { watched: true });
    await d.set("b", { note: "x" });
    expect(Object.keys(await d.all()).sort()).toEqual(["a", "b"]);
  });

  test("export shape", async () => {
    const d = new LocalStorageUserData(fakeStorage());
    await d.set("tt1", { note: "hi" });
    const parsed = JSON.parse(d.exportJson());
    expect(parsed.version).toBe(1);
    expect(parsed.entries.tt1.note).toBe("hi");
  });

  test("import rejects bad shape and keeps data; merges newer only", async () => {
    const d = new LocalStorageUserData(fakeStorage(), () => new Date("2026-10-30T20:00:00Z"));
    await d.set("tt1", { note: "keep" });
    await expect(d.importJson("not json")).rejects.toThrow("Invalid user data file");
    await expect(d.importJson('{"foo":1}')).rejects.toThrow("Invalid user data file");
    await expect(d.importJson('{"version":1,"entries":{"tt1":{"watched":"yes"}}}')).rejects.toThrow("Invalid user data file");
    expect(d.get("tt1").note).toBe("keep");

    const older = { watched: true, rating: null, note: "older", updatedAt: "2000-01-01T00:00:00.000Z" };
    const newer = { watched: true, rating: null, note: "newer", updatedAt: "2999-01-01T00:00:00.000Z" };
    await d.importJson(JSON.stringify({ version: 1, entries: { tt1: older, tt2: newer } }));
    expect(d.get("tt1").note).toBe("keep");
    expect(d.get("tt2").note).toBe("newer");
  });

  test("subscribe fires on set and import; unsubscribe stops it", async () => {
    const d = new LocalStorageUserData(fakeStorage());
    const cb = vi.fn();
    const off = d.subscribe(cb);
    await d.set("tt1", { watched: true });
    await d.importJson(JSON.stringify({ version: 1, entries: {} }));
    expect(cb).toHaveBeenCalledTimes(2);
    off();
    await d.set("tt1", { watched: false });
    expect(cb).toHaveBeenCalledTimes(2);
  });
});
