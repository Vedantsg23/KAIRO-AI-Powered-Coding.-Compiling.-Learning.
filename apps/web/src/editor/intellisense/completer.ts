/**
 * How AI ghost text is fetched. Set by the app (the API call lives outside the
 * editor code), read by the inline-completion provider. Kept apart from the
 * providers so that setting it does not load the editor (Monaco is a chunk of
 * its own, loaded after the page).
 */
export type CompleteFn = (
  body: { languageId: string; prefix: string; suffix: string; maxLines: number },
  signal: AbortSignal,
) => Promise<{ completion: string }>;

let completeFn: CompleteFn | null = null;

export function setCompleter(fn: CompleteFn | null) {
  completeFn = fn;
}

export function completer(): CompleteFn | null {
  return completeFn;
}

/**
 * Whether every character of `part` appears in `text`, in the same order.
 * Used to let a ghost-text suggestion replace the characters already after the
 * cursor (an auto-closed ")") when it types them too, instead of doubling them.
 */
export function inOrder(text: string, part: string): boolean {
  let i = 0;
  for (const ch of text) if (i < part.length && ch === part[i]) i++;
  return i === part.length;
}
