import type { Category, Diagnostic, Severity } from "../api/types";

/**
 * Split a trailing tag off a message, e.g. GCC's option name
 * "unused variable 'x' [-Wunused-variable]" or a compiler code such as
 * "... [TS2322]", "... [CS1002]", "... [E0308]".
 */
export function splitMessage(message: string): { text: string; flag: string | null } {
  const match = /^(.*?)\s*\[((?:-W[\w=+-]+)|(?:[A-Z]{1,4}\d{3,5}))\]$/.exec(message);
  return match ? { text: match[1], flag: match[2] } : { text: message, flag: null };
}

export const CATEGORY_LABEL: Record<Category, string> = {
  syntax: "syntax",
  name: "name",
  type: "type",
  build: "build",
  runtime: "runtime",
  timeout: "time limit",
  memory: "memory",
  other: "other",
};

export const SEVERITY_LABEL: Record<Severity, string> = { error: "Error", warning: "Warning", info: "Info" };

const SEVERITY_RANK: Record<Severity, number> = { error: 0, warning: 1, info: 2 };

/** Errors first, then warnings, then info; within a group by line. */
export function sortDiagnostics(diagnostics: Diagnostic[]): Diagnostic[] {
  return [...diagnostics].sort(
    (a, b) =>
      SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
      (a.range?.startLine ?? Number.MAX_SAFE_INTEGER) - (b.range?.startLine ?? Number.MAX_SAFE_INTEGER),
  );
}

export function countBySeverity(diagnostics: Diagnostic[]): Record<Severity, number> {
  const counts: Record<Severity, number> = { error: 0, warning: 0, info: 0 };
  for (const d of diagnostics) counts[d.severity] += 1;
  return counts;
}

export function locationLabel(d: Diagnostic): string | null {
  if (!d.range) return null;
  return `${d.file ?? "?"}:${d.range.startLine}:${d.range.startColumn}`;
}

/** Who reported it, in words a student understands. */
export function sourceLabel(d: Diagnostic, compileLabel: string, toolName: string): string {
  if (d.source === "compiler") return compileLabel === "Compile" ? `${toolName} compiler` : `${compileLabel} (${toolName})`;
  if (d.source === "runtime") return "while running";
  if (d.source === "local") return "live check";
  return d.source;
}
