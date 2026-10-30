const list = (s) => (s ? s.split(",").map((x) => x.trim()).filter(Boolean) : []);
const num = (s) => {
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : null;
};
const int = (s) => {
  const n = num(s);
  return n == null ? null : Math.round(n);
};

const SERIES = new Set(["TV Series", "TV Mini Series"]);

/** First YouTube "Trailer", official ones first; YouTube key or null. */
export function pickTrailer(videos) {
  const trailers = (videos ?? []).filter((v) => v.site === "YouTube" && v.type === "Trailer");
  return (trailers.find((v) => v.official) ?? trailers[0])?.key ?? null;
}

/** CSV row (+ optional TMDB match/details) → Title, per the spec schema. */
export function toTitle(row, found, details, bucketFor) {
  const id = row.Const;
  const hasBackdrop = Boolean(details?.backdrop_path);
  const poster = details?.poster_path ? `/img/poster/${id}.webp` : null;
  return {
    id,
    title: row.Title,
    originalTitle: row["Original Title"] || row.Title,
    year: int(row.Year),
    type: SERIES.has(row["Title Type"]) ? "Series" : "Movie",
    runtime: int(row["Runtime (mins)"]),
    imdbRating: num(row["IMDb Rating"]),
    imdbVotes: int(row["Num Votes"]),
    genres: list(row.Genres),
    directors: list(row.Directors),
    category: row["Primary category"],
    mood: row["Likely mood"],
    moodBucket: bucketFor(row["Likely mood"]),
    themes: list(row["Broad themes"]),
    imdbUrl: row.URL,
    overview: details?.overview ?? "",
    backdrop: hasBackdrop ? `/img/backdrop/${id}.webp` : poster,
    backdropSmall: hasBackdrop ? `/img/backdrop-sm/${id}.webp` : poster,
    poster,
    trailerKey: pickTrailer(details?.videos?.results),
    tmdbRating: found ? (details?.vote_average ?? null) : null,
    tmdbVotes: found ? (details?.vote_count ?? null) : null,
    rtScore: null,
    metacritic: null,
  };
}
