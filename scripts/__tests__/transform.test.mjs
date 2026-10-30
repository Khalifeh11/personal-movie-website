import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { readWatchlist } from "../lib/csv.mjs";
import { pickTrailer, toTitle } from "../lib/transform.mjs";

const fx = (f) => new URL(`./fixtures/${f}`, import.meta.url);
const rows = readWatchlist(fx("rows.csv"));
const byId = Object.fromEntries(rows.map((r) => [r.Const, r]));
const movieDetails = JSON.parse(readFileSync(fx("movie-details.json"), "utf8"));
const tvDetails = JSON.parse(readFileSync(fx("tv-details.json"), "utf8"));

describe("toTitle", () => {
  test("movie row + details → Title", () => {
    const t = toTitle(byId.tt0051378, { media: "movie", id: 1 }, movieDetails);
    expect(t).toMatchObject({
      id: "tt0051378", title: "Elevator to the Gallows", originalTitle: "Ascenseur pour l'échafaud",
      type: "Movie", runtime: 91, year: 1958, added: "2017-06-17", imdbRating: 7.9, imdbVotes: 32365,
      genres: ["Crime", "Drama", "Thriller"], directors: ["Louis Malle"],
      mood: "Tense, gritty", keywords: ["murder", "film noir"], themes: ["Justice", "morality"],
      imdbUrl: "https://www.imdb.com/title/tt0051378/",
      overview: movieDetails.overview,
      backdrop: "/img/backdrop/tt0051378.webp", backdropSmall: "/img/backdrop-sm/tt0051378.webp",
      poster: "/img/poster/tt0051378.webp", trailerKey: "officialTrailerKey",
      tmdbRating: 7.6, tmdbVotes: 820, rtScore: null, metacritic: null,
    });
  });

  test("tv series maps to Series; no director; no backdrop falls back to poster", () => {
    const t = toTitle(byId.tt5753856, { media: "tv", id: 2 }, tvDetails);
    expect(t).toMatchObject({
      type: "Series", directors: [], trailerKey: null, keywords: ["time travel"],
      poster: "/img/poster/tt5753856.webp", backdrop: "/img/poster/tt5753856.webp", backdropSmall: "/img/poster/tt5753856.webp",
    });
  });

  test("unmatched row keeps CSV data only", () => {
    const t = toTitle(byId.tt6207098, null, null);
    expect(t).toMatchObject({
      id: "tt6207098", type: "Movie", overview: "", backdrop: null, backdropSmall: null,
      poster: null, trailerKey: null, tmdbRating: null, tmdbVotes: null, keywords: [],
    });
    expect(t).not.toHaveProperty("moodBucket");
  });

  test("added comes from Created; empty or garbage → null", () => {
    const row = { ...byId.tt0051378, Created: "" };
    expect(toTitle(row, null, null).added).toBeNull();
    expect(toTitle({ ...row, Created: "not a date" }, null, null).added).toBeNull();
    expect(toTitle({ ...row, Created: "2013-12-14" }, null, null).added).toBe("2013-12-14");
  });
});

test("pickTrailer prefers official YouTube Trailer, ignores other sites", () => {
  expect(pickTrailer(movieDetails.videos.results)).toBe("officialTrailerKey");
  expect(pickTrailer([{ site: "YouTube", type: "Trailer", official: false, key: "k" }])).toBe("k");
  expect(pickTrailer([{ site: "YouTube", type: "Teaser", official: true, key: "t" }])).toBeNull();
  expect(pickTrailer(undefined)).toBeNull();
});
