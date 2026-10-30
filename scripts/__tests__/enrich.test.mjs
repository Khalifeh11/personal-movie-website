import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test, vi } from "vitest";
import { main } from "../enrich.mjs";

const fx = (f) => fileURLToPath(new URL(`./fixtures/${f}`, import.meta.url));
const movieDetails = JSON.parse(readFileSync(fx("movie-details.json"), "utf8"));
const tvDetails = JSON.parse(readFileSync(fx("tv-details.json"), "utf8"));

function fakeTmdb() {
  return {
    find: vi.fn(async (id) =>
      id === "tt0051378" ? { media: "movie", id: 1 } : id === "tt5753856" ? { media: "tv", id: 2 } : null),
    details: vi.fn(async (media) => (media === "movie" ? movieDetails : tvDetails)),
    download: vi.fn(async () => {}),
    tile: vi.fn(async () => {}),
  };
}

function setup() {
  const dir = mkdtempSync(join(tmpdir(), "enrich-"));
  return { csvPath: fx("rows.csv"), outPath: join(dir, "titles.json"), imgDir: join(dir, "img"), tagsPath: join(dir, "mood-tags.json"), log: () => {} };
}

test("writes all titles, reports unmatched, downloads images", async () => {
  const opts = setup();
  const tmdb = fakeTmdb();
  const res = await main({ ...opts, tmdb, force: false });
  expect(res).toEqual({ written: 3, skipped: 0, unmatched: ["tt6207098"] });
  const out = JSON.parse(readFileSync(opts.outPath, "utf8"));
  expect(out.map((t) => t.id).sort()).toEqual(["tt0051378", "tt5753856", "tt6207098"]);
  // movie: backdrop w1280 + w780 + poster w500; tv: poster only
  expect(tmdb.download).toHaveBeenCalledWith("/w1280/elevatorBackdrop.jpg", join(opts.imgDir, "backdrop", "tt0051378.webp"));
  expect(tmdb.download).toHaveBeenCalledWith("/w780/elevatorBackdrop.jpg", join(opts.imgDir, "backdrop-sm", "tt0051378.webp"));
  expect(tmdb.download).toHaveBeenCalledWith("/w500/darkPoster.jpg", join(opts.imgDir, "poster", "tt5753856.webp"));
  expect(tmdb.download).toHaveBeenCalledTimes(4);
  expect(tmdb.tile).toHaveBeenCalledWith(join(opts.imgDir, "backdrop-sm", "tt0051378.webp"), join(opts.imgDir, "backdrop-tile", "tt0051378.webp"));
});

test("second run skips existing; --force refetches", async () => {
  const opts = setup();
  await main({ ...opts, tmdb: fakeTmdb(), force: false });
  const again = fakeTmdb();
  expect(await main({ ...opts, tmdb: again, force: false })).toEqual({ written: 0, skipped: 3, unmatched: [] });
  expect(again.find).not.toHaveBeenCalled();
  const forced = fakeTmdb();
  expect((await main({ ...opts, tmdb: forced, force: true })).written).toBe(3);
  expect(forced.find).toHaveBeenCalledTimes(3);
});

test("limit processes only the first N CSV rows and keeps prior output", async () => {
  const opts = setup();
  const res = await main({ ...opts, tmdb: fakeTmdb(), force: false, limit: 2 });
  expect(res.written).toBe(2);
  const out = JSON.parse(readFileSync(opts.outPath, "utf8"));
  expect(out).toHaveLength(2);
  const more = await main({ ...opts, tmdb: fakeTmdb(), force: false });
  expect(more).toMatchObject({ written: 1, skipped: 2 });
});

test("merges mood tags on every run, including skipped titles; logs untagged ids", async () => {
  const opts = setup();
  const lines = [];
  writeFileSync(opts.tagsPath, JSON.stringify({ tt0051378: ["gritty", "tense"] }));
  await main({ ...opts, tmdb: fakeTmdb(), log: (l) => lines.push(l) });
  const moodsOf = () => Object.fromEntries(JSON.parse(readFileSync(opts.outPath, "utf8")).map((t) => [t.id, t.moods]));
  expect(moodsOf()).toEqual({ tt0051378: ["tense", "gritty"], tt5753856: [], tt6207098: [] });
  expect(lines).toContain("Untagged (2): tt6207098, tt5753856");

  writeFileSync(opts.tagsPath, JSON.stringify({ tt0051378: ["dread"], tt5753856: ["mind-bending"], tt6207098: ["funny"] }));
  const again = fakeTmdb();
  expect(await main({ ...opts, tmdb: again })).toMatchObject({ written: 0, skipped: 3 });
  expect(again.find).not.toHaveBeenCalled();
  expect(moodsOf()).toEqual({ tt0051378: ["dread"], tt5753856: ["mind-bending"], tt6207098: ["funny"] });
});

test("added merges from the CSV on every run, including skipped titles", async () => {
  const opts = setup();
  await main({ ...opts, tmdb: fakeTmdb() });
  const out = JSON.parse(readFileSync(opts.outPath, "utf8"));
  // Simulate an output written before `added` existed.
  writeFileSync(opts.outPath, JSON.stringify(out.map(({ added: _added, ...t }) => t)));
  const again = fakeTmdb();
  expect(await main({ ...opts, tmdb: again })).toMatchObject({ written: 0, skipped: 3 });
  expect(again.find).not.toHaveBeenCalled();
  const addedOf = Object.fromEntries(JSON.parse(readFileSync(opts.outPath, "utf8")).map((t) => [t.id, t.added]));
  expect(addedOf).toEqual({ tt0051378: "2017-06-17", tt6207098: "2017-11-01", tt5753856: "2018-02-11" });
});
