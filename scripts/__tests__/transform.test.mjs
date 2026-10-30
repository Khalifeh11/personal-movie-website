import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { readWatchlist } from "../lib/csv.mjs";
import { pickTrailer, toTitle } from "../lib/transform.mjs";
import { bucketFor } from "../../src/lib/moods.ts";

const fx = (f) => new URL(`./fixtures/${f}`, import.meta.url);
const rows = readWatchlist(fx("rows.csv"));
const byId = Object.fromEntries(rows.map((r) => [r.Const, r]));
const movieDetails = JSON.parse(readFileSync(fx("movie-details.json"), "utf8"));
const tvDetails = JSON.parse(readFileSync(fx("tv-details.json"), "utf8"));

describe("toTitle", () => {
  test("movie row + details → Title", () => {
    const t = toTitle(byId.tt0051378, { media: "movie", id: 1 }, movieDetails, bucketFor);
    expect(t).toMatchObject({
      id: "tt0051378", title: "Elevator to the Gallows", originalTitle: "Ascenseur pour l'échafaud",
      type: "Movie", runtime: 91, year: 1958, imdbRating: 7.9, imdbVotes: 32365,
      genres: ["Crime", "Drama", "Thriller"], directors: ["Louis Malle"],
      mood: "Tense, gritty", moodBucket: "on-edge", themes: ["Justice", "morality"],
      imdbUrl: "https://www.imdb.com/title/tt0051378/",
      overview: movieDetails.overview,
      backdrop: "/img/backdrop/tt0051378.jpg", backdropSmall: "/img/backdrop-sm/tt0051378.jpg",
      poster: "/img/poster/tt0051378.jpg", trailerKey: "officialTrailerKey",
      tmdbRating: 7.6, tmdbVotes: 820, rtScore: null, metacritic: null,
    });
  });

  test("tv series maps to Series; no director; no backdrop falls back to poster", () => {
    const t = toTitle(byId.tt5753856, { media: "tv", id: 2 }, tvDetails, bucketFor);
    expect(t).toMatchObject({
      type: "Series", directors: [], trailerKey: null,
      poster: "/img/poster/tt5753856.jpg", backdrop: "/img/poster/tt5753856.jpg", backdropSmall: "/img/poster/tt5753856.jpg",
    });
  });

  test("unmatched row keeps CSV data only", () => {
    const t = toTitle(byId.tt6207098, null, null, bucketFor);
    expect(t).toMatchObject({
      id: "tt6207098", type: "Movie", overview: "", backdrop: null, backdropSmall: null,
      poster: null, trailerKey: null, tmdbRating: null, tmdbVotes: null,
    });
  });
});

test("pickTrailer prefers official YouTube Trailer, ignores other sites", () => {
  expect(pickTrailer(movieDetails.videos.results)).toBe("officialTrailerKey");
  expect(pickTrailer([{ site: "YouTube", type: "Trailer", official: false, key: "k" }])).toBe("k");
  expect(pickTrailer([{ site: "YouTube", type: "Teaser", official: true, key: "t" }])).toBeNull();
  expect(pickTrailer(undefined)).toBeNull();
});
