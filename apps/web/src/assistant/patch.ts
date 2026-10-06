import type { FixProposal } from "../api/types";

export interface DiffLine {
  kind: "context" | "removed" | "added" | "gap";
  /** Line number in the original (removed/context) or in the patched text (added). */
  number: number | null;
  text: string;
}

/**
 * A unified-diff view of Saarthi's whole-line edits against the source they
 * were made for: one line of context around each edit.
 */
export function diffLines(source: string, edits: FixProposal["edits"], context = 1): DiffLine[] {
  const original = source.replace(/\r\n/g, "\n").split("\n");
  if (original.length && original[original.length - 1] === "") original.pop();
  const out: DiffLine[] = [];
  let shift = 0; // how far patched line numbers have moved from the original ones
  let lastShown = 0;
  for (const edit of [...edits].sort((a, b) => a.startLine - b.startLine)) {
    const from = Math.max(1, edit.startLine - context);
    if (lastShown && from > lastShown + 1) out.push({ kind: "gap", number: null, text: "" });
    for (let n = Math.max(from, lastShown + 1); n < edit.startLine; n++) {
      out.push({ kind: "context", number: n, text: original[n - 1] ?? "" });
    }
    for (let n = edit.startLine; n <= edit.endLine; n++) {
      out.push({ kind: "removed", number: n, text: original[n - 1] ?? "" });
    }
    const added = edit.replacement === "" ? [] : edit.replacement.replace(/\r\n/g, "\n").split("\n");
    added.forEach((text, i) => out.push({ kind: "added", number: edit.startLine + shift + i, text }));
    shift += added.length - (edit.endLine - edit.startLine + 1);
    const to = Math.min(original.length, edit.endLine + context);
    for (let n = edit.endLine + 1; n <= to; n++) out.push({ kind: "context", number: n, text: original[n - 1] ?? "" });
    lastShown = to;
  }
  return out;
}
