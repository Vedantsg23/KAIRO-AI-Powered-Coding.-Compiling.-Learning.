// localStorage can be unavailable (private mode, blocked storage); never let
// that break the editor. Only per-browser conveniences are stored here:
// drafts, input, theme, layout. Nothing is sent anywhere.

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function save(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/** Keys of the earlier "cc." prefix are copied once, so drafts survive the rename. */
export function migrateLegacyKeys(): void {
  try {
    for (const [from, to] of [
      ["cc.drafts", "cd.drafts"],
      ["cc.stdin", "cd.stdin"],
      ["cc.language", "cd.language"],
      ["cc.onboarded", "cd.onboarded"],
      ["cc.theme", "cd.theme"],
    ]) {
      const value = localStorage.getItem(from);
      if (value !== null && localStorage.getItem(to) === null) localStorage.setItem(to, value);
    }
  } catch {
    // storage unavailable: nothing to migrate
  }
}
