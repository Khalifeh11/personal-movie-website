import { createContext, useContext, useEffect, useState } from "react";
import type { UserEntry } from "../lib/types";
import type { UserDataStore } from "../lib/userData";

export const UserDataContext = createContext<UserDataStore | null>(null);

/** The active store plus a snapshot of every entry that re-renders on change. */
export function useUserData(): { store: UserDataStore; entries: Record<string, UserEntry> } {
  const store = useContext(UserDataContext);
  if (!store) throw new Error("useUserData needs a UserDataContext provider");
  const [entries, setEntries] = useState<Record<string, UserEntry>>({});
  useEffect(() => {
    let live = true;
    const refresh = () => store.all().then((e) => live && setEntries(e));
    refresh();
    const off = store.subscribe(refresh);
    return () => {
      live = false;
      off();
    };
  }, [store]);
  return { store, entries };
}
