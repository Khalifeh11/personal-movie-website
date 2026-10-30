import type { UserEntry } from "./types";

export const STORAGE_KEY = "tonight.userData.v1";

export type UserPatch = Partial<Omit<UserEntry, "updatedAt">>;

/**
 * Everything the owner adds on top of the catalogue: watched, rating, note.
 * The UI only talks to this interface; swap the adapter for a backend later.
 */
export interface UserDataStore {
  get(id: string): UserEntry;
  set(id: string, patch: UserPatch): Promise<void>;
  all(): Promise<Record<string, UserEntry>>;
  exportJson(): string;
  /** Throws Error("Invalid user data file") on bad shape; merges by newer updatedAt. */
  importJson(json: string): Promise<void>;
  subscribe(cb: () => void): () => void;
}

const EMPTY: UserEntry = { watched: false, rating: null, note: "", updatedAt: "" };
const INVALID = "Invalid user data file";

function isValidRating(r: unknown): r is number | null {
  return r === null || (typeof r === "number" && r >= 0.5 && r <= 5 && (r * 2) % 1 === 0);
}

function isEntry(v: unknown): v is UserEntry {
  if (!v || typeof v !== "object") return false;
  const e = v as Record<string, unknown>;
  return (
    typeof e.watched === "boolean" &&
    isValidRating(e.rating) &&
    typeof e.note === "string" &&
    typeof e.updatedAt === "string"
  );
}

export class LocalStorageUserData implements UserDataStore {
  private entries: Record<string, UserEntry>;
  private listeners = new Set<() => void>();
  private storage: Pick<Storage, "getItem" | "setItem">;
  private now: () => Date;

  constructor(storage: Pick<Storage, "getItem" | "setItem">, now: () => Date = () => new Date()) {
    this.storage = storage;
    this.now = now;
    this.entries = this.load();
  }

  private load(): Record<string, UserEntry> {
    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return {};
      return Object.fromEntries(
        Object.entries(parsed as Record<string, unknown>).filter(([, v]) => isEntry(v)),
      ) as Record<string, UserEntry>;
    } catch {
      return {};
    }
  }

  private persist() {
    this.storage.setItem(STORAGE_KEY, JSON.stringify(this.entries));
    for (const cb of this.listeners) cb();
  }

  get(id: string): UserEntry {
    return this.entries[id] ?? { ...EMPTY };
  }

  async set(id: string, patch: UserPatch): Promise<void> {
    if ("rating" in patch && !isValidRating(patch.rating)) {
      throw new Error("Rating must be null or 0.5–5 in half steps");
    }
    this.entries[id] = { ...this.get(id), ...patch, updatedAt: this.now().toISOString() };
    this.persist();
  }

  async all(): Promise<Record<string, UserEntry>> {
    return { ...this.entries };
  }

  exportJson(): string {
    return JSON.stringify({ version: 1, entries: this.entries }, null, 2);
  }

  async importJson(json: string): Promise<void> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      throw new Error(INVALID);
    }
    const file = parsed as { version?: unknown; entries?: unknown } | null;
    if (!file || file.version !== 1 || !file.entries || typeof file.entries !== "object") {
      throw new Error(INVALID);
    }
    const incoming = file.entries as Record<string, unknown>;
    for (const v of Object.values(incoming)) if (!isEntry(v)) throw new Error(INVALID);
    for (const [id, entry] of Object.entries(incoming as Record<string, UserEntry>)) {
      const current = this.entries[id];
      if (!current || entry.updatedAt > current.updatedAt) this.entries[id] = entry;
    }
    this.persist();
  }

  subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => void this.listeners.delete(cb);
  }
}
