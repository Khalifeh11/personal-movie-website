import type { Filters, Title, UserEntry } from "./types";

export function mk(partial: Partial<Title> = {}): Title {
  return {
    id: "tt0000000",
    title: "Untitled",
    originalTitle: "Untitled",
    year: 2000,
    type: "Movie",
    runtime: 100,
    imdbRating: 7,
    imdbVotes: 1000,
    genres: ["Drama"],
    directors: ["Someone"],
    category: "Human drama & character studies",
    mood: "Serious, dramatic",
    moodBucket: "moved",
    themes: [],
    imdbUrl: "https://www.imdb.com/title/tt0000000/",
    overview: "",
    backdrop: null,
    backdropSmall: null,
    poster: null,
    trailerKey: null,
    tmdbRating: null,
    tmdbVotes: null,
    rtScore: null,
    metacritic: null,
    ...partial,
  };
}

export function F(partial: Partial<Filters> = {}): Filters {
  return { type: "all", runtime: "any", hideWatched: false, ...partial };
}

export function U(partial: Partial<UserEntry> = {}): UserEntry {
  return { watched: false, rating: null, note: "", updatedAt: "", ...partial };
}
