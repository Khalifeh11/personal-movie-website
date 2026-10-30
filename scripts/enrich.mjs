// Usage: npm run enrich -- [--force] [--limit N]
import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readWatchlist } from "./lib/csv.mjs";
import { applyMoods } from "./lib/moods.mjs";
import { isoDate, toTitle } from "./lib/transform.mjs";
import { makeTmdb } from "./lib/tmdb.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const vocab = JSON.parse(readFileSync(join(root, "src/data/moods.json"), "utf8"));
const readJson = (path, fallback) => (existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : fallback);

export async function main({ csvPath, outPath, imgDir, tagsPath, tmdb, force = false, limit, log = console.log }) {
  const rows = readWatchlist(csvPath);
  const existing = readJson(outPath, []);
  const byId = new Map(existing.map((t) => [t.id, t]));
  const todo = limit ? rows.slice(0, limit) : rows;
  let written = 0;
  let skipped = 0;
  const unmatched = [];

  for (const row of todo) {
    const id = row.Const;
    if (byId.has(id) && !force) {
      skipped++;
      continue;
    }
    const found = await tmdb.find(id);
    const details = found ? await tmdb.details(found.media, found.id) : null;
    if (!found) unmatched.push(id);

    if (details?.backdrop_path) {
      await tmdb.download(`/w1280${details.backdrop_path}`, join(imgDir, "backdrop", `${id}.webp`));
      await tmdb.download(`/w780${details.backdrop_path}`, join(imgDir, "backdrop-sm", `${id}.webp`));
    }
    if (details?.poster_path) {
      await tmdb.download(`/w500${details.poster_path}`, join(imgDir, "poster", `${id}.webp`));
    }

    byId.set(id, toTitle(row, found, details));
    written++;
    log(`${String(written + skipped).padStart(3)}/${todo.length} ${row.Title}${found ? "" : "  (no TMDB match)"}`);
  }

  // CSV-only fields merge on every run, like moods, so older outputs gain them without --force.
  for (const row of rows) {
    const t = byId.get(row.Const);
    if (t) t.added = isoDate(row.Created);
  }

  // Keep CSV order for everything we have. Moods merge on every run so tag edits apply without --force.
  const { titles: out, untagged, stray } = applyMoods(
    rows.map((r) => byId.get(r.Const)).filter(Boolean),
    tagsPath ? readJson(tagsPath, {}) : {},
    vocab,
  );
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(out, null, 2) + "\n");
  if (unmatched.length) log(`Unmatched (${unmatched.length}): ${unmatched.join(", ")}`);
  if (untagged.length) log(`Untagged (${untagged.length}): ${untagged.join(", ")}`);
  if (stray.length) log(`Stray tags (${stray.length}): ${stray.join(", ")}`);
  return { written, skipped, unmatched };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const limitIdx = args.indexOf("--limit");
  const res = await main({
    csvPath: join(root, "data/watchlist.csv"),
    outPath: join(root, "src/data/titles.json"),
    imgDir: join(root, "public/img"),
    tagsPath: join(root, "data/mood-tags.json"),
    tmdb: makeTmdb({ apiKey: process.env.TMDB_API_KEY }),
    force: args.includes("--force"),
    limit: limitIdx >= 0 ? Number(args[limitIdx + 1]) : undefined,
  });
  console.log(`Done: ${res.written} written, ${res.skipped} skipped, ${res.unmatched.length} unmatched.`);
}
