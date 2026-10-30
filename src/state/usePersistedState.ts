import { useEffect, useState } from "react";

export function readStored<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/** useState mirrored to localStorage as JSON. Storage failures are ignored. */
export function usePersistedState<T>(key: string, initial: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => readStored<T>(key) ?? initial);
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* private mode / quota — keep in memory only */
    }
  }, [key, value]);
  return [value, setValue];
}
