import { readFileSync } from "node:fs";
import { parse } from "csv-parse/sync";

/** IMDb export rows as objects keyed by the CSV header. */
export function readWatchlist(path) {
  return parse(readFileSync(path, "utf8"), { columns: true, skip_empty_lines: true, bom: true });
}
