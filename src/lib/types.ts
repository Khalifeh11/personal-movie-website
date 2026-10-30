export type TitleType = "Movie" | "Series";
export type MoodSlug =
  | "on-edge" | "unsettling" | "mind-bending" | "wry-funny"
  | "transported" | "moved" | "real-life";
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
  imdbRating: number | null;
  imdbVotes: number | null;
  genres: string[];
  directors: string[];
  category: string;
  mood: string;
  moodBucket: MoodSlug;
  themes: string[];
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
