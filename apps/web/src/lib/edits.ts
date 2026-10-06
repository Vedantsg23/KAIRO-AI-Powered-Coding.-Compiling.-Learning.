/**
 * Text edits with 1-based line and column positions (columns in UTF-16 code
 * units, end exclusive), the way the editor and the live check count them.
 */
export interface TextEdit {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
  text: string;
}

/** Offset of a 1-based (line, column) position in `text`, clamped to the text. */
export function offsetAt(text: string, line: number, column: number): number {
  let offset = 0;
  for (let l = 1; l < line; l++) {
    const next = text.indexOf("\n", offset);
    if (next < 0) return text.length;
    offset = next + 1;
  }
  const lineEnd = text.indexOf("\n", offset);
  const max = lineEnd < 0 ? text.length : lineEnd;
  return Math.min(offset + Math.max(0, column - 1), max);
}

/**
 * Apply edits to a text. Edits must not overlap; they are applied from the
 * end of the text backwards so earlier positions stay valid.
 */
export function applyTextEdits(text: string, edits: TextEdit[]): string {
  const sorted = [...edits].sort((a, b) => b.startLine - a.startLine || b.startColumn - a.startColumn);
  let result = text;
  for (const e of sorted) {
    const start = offsetAt(result, e.startLine, e.startColumn);
    const end = Math.max(start, offsetAt(result, e.endLine, e.endColumn));
    result = result.slice(0, start) + e.text + result.slice(end);
  }
  return result;
}

/** The lines an edit touches, before and after (for a small preview). */
export function previewEdits(text: string, edits: TextEdit[]): { line: number; before: string[]; after: string[] } | null {
  if (edits.length === 0) return null;
  const first = Math.min(...edits.map((e) => e.startLine));
  const last = Math.max(...edits.map((e) => e.endLine));
  const before = text.split("\n").slice(first - 1, last);
  const added = edits.reduce((n, e) => n + (e.text.match(/\n/g)?.length ?? 0), 0);
  const after = applyTextEdits(text, edits)
    .split("\n")
    .slice(first - 1, last + added);
  return { line: first, before, after };
}
