import type { Diagnostic } from "../api/types";
import type { LiveProblem } from "../live/analyze";

/** Editor-agnostic marker; converted to Monaco markers in CodeEditor. */
export interface MarkerSpec {
  severity: "error" | "warning" | "info" | "hint";
  message: string;
  code?: string;
  source?: string;
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
}

/** Monaco's MarkerSeverity values (kept here so this module has no Monaco import). */
export const MONACO_SEVERITY = { hint: 1, info: 2, warning: 4, error: 8 } as const;

/**
 * Diagnostics that belong to `file` and have a range become squiggles.
 * Related locations (compiler notes, deterministic hints) become subtle
 * "hint" markers so the related line is visible too.
 */
export function diagnosticsToMarkers(diagnostics: Diagnostic[], file: string, toolName: string): MarkerSpec[] {
  const markers: MarkerSpec[] = [];
  for (const d of diagnostics) {
    if (d.file !== file || !d.range) continue;
    markers.push({
      severity: d.severity,
      message: d.message,
      code: d.code,
      source: d.source === "compiler" ? toolName : d.source,
      startLineNumber: d.range.startLine,
      startColumn: d.range.startColumn,
      endLineNumber: d.range.endLine,
      endColumn: d.range.endColumn,
    });
    for (const related of d.relatedLocations ?? []) {
      if (related.file !== file || !related.range) continue;
      markers.push({
        severity: "hint",
        message: related.message,
        code: d.code,
        source: "note",
        startLineNumber: related.range.startLine,
        startColumn: related.range.startColumn,
        endLineNumber: related.range.endLine,
        endColumn: related.range.endColumn,
      });
    }
  }
  return markers;
}

const LIVE_NOTE: Record<LiveProblem["kind"], string> = {
  missing: "Live syntax check while you type; press Run for the compiler's full check.",
  unexpected: "Live syntax check while you type; press Run for the compiler's full check.",
  typo: "Typo Guard (live, while you type). The quick fix (Ctrl+.) corrects it.",
  tip: "Saarthi tip (live, while you type). Valid code, but probably not what you meant.",
};

const LIVE_CODE: Record<LiveProblem["kind"], string> = {
  missing: "LIVE_MISSING",
  unexpected: "LIVE_SYNTAX",
  typo: "LIVE_TYPO",
  tip: "LIVE_TIP",
};

/** Live problems (syntax errors, typos, tips) become squiggles labelled as such. */
export function liveProblemsToMarkers(problems: LiveProblem[]): MarkerSpec[] {
  return problems.map((p) => ({
    severity: p.severity ?? "error",
    message: `${p.message}\n${LIVE_NOTE[p.kind]}`,
    code: p.topic === "typo" && (p.kind === "missing" || p.kind === "unexpected") ? "LIVE_TYPO" : LIVE_CODE[p.kind],
    source: p.kind === "typo" ? "typo guard" : p.kind === "tip" ? "saarthi tip" : "live check",
    startLineNumber: p.startLine,
    startColumn: p.startColumn,
    endLineNumber: p.endLine,
    endColumn: p.endColumn,
  }));
}
