export type TitleType = "Movie" | "Series";
export type MoodSlug =
  | "tense" | "gritty" | "puzzling" | "dread" | "mind-bending" | "thought-provoking"
  | "funny" | "absurd" | "satirical" | "feel-good" | "bittersweet" | "heartbreaking"
  | "epic" | "dreamy" | "romantic" | "true-story" | "slow-and-quiet";
export type MoodFilter = MoodSlug | "all";
export type RuntimeBand = "any" | "short" | "mid" | "long";
export type TypeFilter = "all" | TitleType;

export interface Title {
  id: string;
  title: string;
  originalTitle: string;
  year: number | null;
  type: TitleType;
  runtime: number | null;
  /** IMDb "added to list" date, `YYYY-MM-DD`; null when the export lacks it. */
  added: string | null;
  imdbRating: number | null;
  imdbVotes: number | null;
  genres: string[];
  directors: string[];
  category: string;
  mood: string;
  /** 1-3 moods in vocabulary order; empty when the title isn't tagged yet. */
  moods: MoodSlug[];
  themes: string[];
  keywords: string[];
  imdbUrl: string;
  overview: string;
  backdrop: string | null;
  backdropSmall: string | null;
  poster: string | null;
  trailerKey: string | null;
  tmdbRating: number | null;
  tmdbVotes: number | null;
  rtScore: number | null;
  metacritic: number | null;
}

export interface Filters {
  type: TypeFilter;
  runtime: RuntimeBand;
  hideWatched: boolean;
}

export interface UserEntry {
  watched: boolean;
  rating: number | null;
  note: string;
  updatedAt: string;
}
