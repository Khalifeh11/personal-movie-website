import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { promisify } from "node:util";

const API = "https://api.themoviedb.org/3";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function makeTmdb({ apiKey, fetch = globalThis.fetch, imageBase = "https://image.tmdb.org/t/p", delayMs = 50 }) {
  if (!apiKey) throw new Error("TMDB_API_KEY missing — add it to .env");

  async function get(path, params = {}) {
    const url = new URL(API + path);
    url.searchParams.set("api_key", apiKey);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    for (let attempt = 0; attempt < 2; attempt++) {
      await sleep(delayMs);
      const res = await fetch(url);
      if (res.status === 429 && attempt === 0) {
        await sleep(Number(res.headers.get("retry-after") ?? 2) * 1000);
        continue;
      }
      if (!res.ok) throw new Error(`TMDB ${res.status} for ${path}`);
      return res.json();
    }
    throw new Error(`TMDB rate-limited twice for ${path}`);
  }

  return {
    async find(imdbId) {
      const r = await get(`/find/${imdbId}`, { external_source: "imdb_id" });
      if (r.movie_results?.[0]) return { media: "movie", id: r.movie_results[0].id };
      if (r.tv_results?.[0]) return { media: "tv", id: r.tv_results[0].id };
      return null;
    },
    details(media, id) {
      return get(`/${media}/${id}`, { append_to_response: "videos,images,keywords" });
    },
    /** Saves the TMDB jpg next to destFile, then converts it to destFile (.webp) with cwebp. */
    async download(sizePath, destFile) {
      if (existsSync(destFile)) return;
      const jpg = destFile.replace(/\.webp$/, ".jpg");
      if (!existsSync(jpg)) {
        const res = await fetch(imageBase + sizePath);
        if (!res.ok) throw new Error(`Image ${res.status} for ${sizePath}`);
        await mkdir(dirname(jpg), { recursive: true });
        await writeFile(jpg, Buffer.from(await res.arrayBuffer()));
      }
      await promisify(execFile)("cwebp", ["-quiet", "-q", "82", jpg, "-o", destFile]);
    },
    /** A 560px-wide, lighter cut of an existing webp (mood tiles never show more than ~350 CSS px). Needs ImageMagick. */
    async tile(srcFile, destFile) {
      if (existsSync(destFile)) return;
      await mkdir(dirname(destFile), { recursive: true });
      await promisify(execFile)("magick", [srcFile, "-resize", "560x", "-quality", "65", destFile]);
    },
  };
}
