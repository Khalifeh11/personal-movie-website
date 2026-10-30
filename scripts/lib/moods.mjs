const MAX = 3;

/**
 * Merges hand-curated tags ({ id: [slug] }) into titles as `moods`, in vocabulary order.
 * Throws on an unknown slug, an empty list or more than MAX tags.
 */
export function applyMoods(titles, tags, vocab) {
  const order = new Map(vocab.map((m, i) => [m.slug, i]));
  const ids = new Set(titles.map((t) => t.id));
  for (const [id, slugs] of Object.entries(tags)) {
    if (!ids.has(id)) continue;
    const bad = slugs.filter((s) => !order.has(s));
    if (bad.length || slugs.length === 0 || slugs.length > MAX) {
      throw new Error(`Bad mood tags for ${id}: ${JSON.stringify(slugs)} (1–${MAX} known moods)`);
    }
  }
  return {
    titles: titles.map((t) => ({
      ...t,
      moods: [...new Set(tags[t.id] ?? [])].sort((a, b) => order.get(a) - order.get(b)),
    })),
    untagged: titles.filter((t) => !tags[t.id]).map((t) => t.id),
    stray: Object.keys(tags).filter((id) => !ids.has(id)),
  };
}
