/**
 * Fuzzy matching for the command palette: every character of the query must
 * appear in the text in order (case-insensitive). Consecutive matches, matches
 * at word starts and matches near the beginning score higher. Returns null
 * when the text does not match.
 */
export function fuzzyScore(query: string, text: string): number | null {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  const t = text.toLowerCase();
  let score = 0;
  let ti = 0;
  let streak = 0;
  for (const ch of q) {
    if (ch === " ") {
      streak = 0;
      continue;
    }
    const found = t.indexOf(ch, ti);
    if (found < 0) return null;
    const wordStart = found === 0 || /[\s:/(\-_.]/.test(t[found - 1]);
    streak = found === ti ? streak + 1 : 1;
    score += 1 + streak * 2 + (wordStart ? 6 : 0) - Math.min(found - ti, 8) * 0.25;
    ti = found + 1;
  }
  // Whole-substring matches and short texts rank first.
  if (t.includes(q)) score += 12 + (t.startsWith(q) ? 8 : 0);
  return score - t.length * 0.02;
}

/**
 * Items that match `query`, best first (stable for equal scores). For
 * queries of three characters or more, scattered matches far weaker than the
 * best one are dropped ("fold" should not list "Factorial ... load").
 */
export function fuzzyFilter<T>(items: T[], query: string, text: (item: T) => string): T[] {
  if (!query.trim()) return items;
  const scored = items
    .map((item, index) => ({ item, index, score: fuzzyScore(query, text(item)) }))
    .filter((r): r is { item: T; index: number; score: number } => r.score !== null);
  const best = Math.max(...scored.map((r) => r.score));
  const floor = query.replace(/\s/g, "").length >= 3 ? best * 0.35 : -Infinity;
  return scored
    .filter((r) => r.score >= floor)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((r) => r.item);
}
