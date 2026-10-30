// Usage: npm run enrich -- [--force] [--limit N]
import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readWatchlist } from "./lib/csv.mjs";
import { makeTmdb } from "./lib/tmdb.mjs";
import { toTitle } from "./lib/transform.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const buckets = JSON.parse(readFileSync(join(root, "src/data/mood-buckets.json"), "utf8"));

// Mirrors src/lib/moods.ts#bucketFor (Node 20 can't import the .ts directly).
const moodLookup = new Map(Object.entries(buckets).flatMap(([slug, moods]) => moods.map((m) => [m, slug])));
function bucketFor(mood) {
  const slug = moodLookup.get(mood.trim());
  if (slug) return slug;
  console.warn(`Unmapped mood "${mood}" → moved`);
  return "moved";
}

export async function main({ csvPath, outPath, imgDir, tmdb, force = false, limit, log = console.log }) {
  const rows = readWatchlist(csvPath);
  const existing = existsSync(outPath) ? JSON.parse(readFileSync(outPath, "utf8")) : [];
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

    byId.set(id, toTitle(row, found, details, bucketFor));
    written++;
    log(`${String(written + skipped).padStart(3)}/${todo.length} ${row.Title}${found ? "" : "  (no TMDB match)"}`);
  }

  // Keep CSV order for everything we have.
  const out = rows.map((r) => byId.get(r.Const)).filter(Boolean);
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(out, null, 2) + "\n");
  if (unmatched.length) log(`Unmatched (${unmatched.length}): ${unmatched.join(", ")}`);
  return { written, skipped, unmatched };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const limitIdx = args.indexOf("--limit");
  const res = await main({
    csvPath: join(root, "data/watchlist.csv"),
    outPath: join(root, "src/data/titles.json"),
    imgDir: join(root, "public/img"),
    tmdb: makeTmdb({ apiKey: process.env.TMDB_API_KEY }),
    force: args.includes("--force"),
    limit: limitIdx >= 0 ? Number(args[limitIdx + 1]) : undefined,
  });
  console.log(`Done: ${res.written} written, ${res.skipped} skipped, ${res.unmatched.length} unmatched.`);
}
