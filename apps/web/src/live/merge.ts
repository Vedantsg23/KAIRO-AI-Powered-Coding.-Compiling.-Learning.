import type { LiveProblem } from "./analyze";

/**
 * One list of live problems for the editor, the diagnostics list and Saarthi:
 * syntax errors first-class, then typos and tips.
 *
 * When a typo sits inside a syntax error ("retrun x" in Python is both), the
 * two are one problem: the syntax error keeps its place and severity but
 * takes the typo's clearer message and fix.
 */
export function mergeLiveProblems(syntax: LiveProblem[], typos: LiveProblem[], tips: LiveProblem[]): LiveProblem[] {
  if (typos.length === 0 && tips.length === 0) return syntax;
  const used = new Set<LiveProblem>();
  const merged = syntax.map((p) => {
    const typo = typos.find(
      (t) => !used.has(t) && t.startLine >= p.startLine - 0 && t.startLine <= p.endLine && (t.startLine !== p.startLine || t.endColumn >= p.startColumn - 1 || p.kind === "missing"),
    );
    if (!typo || p.fix) return p;
    used.add(typo);
    return { ...p, message: typo.message, topic: "typo" as const, fix: typo.fix };
  });
  const rest = typos.filter((t) => !used.has(t));
  // A tip on the same spot as an error or typo would only repeat it.
  const busy = new Set([...merged, ...rest].map((p) => `${p.startLine}:${p.startColumn}`));
  const freshTips = tips.filter((t) => !busy.has(`${t.startLine}:${t.startColumn}`));
  return [...merged, ...rest, ...freshTips].sort((a, b) => a.startLine - b.startLine || a.startColumn - b.startColumn);
}

/** Rank for choosing what Saarthi talks about: errors, then typos, then tips. */
export function liveRank(p: LiveProblem): number {
  if (p.kind === "missing" || p.kind === "unexpected") return 0;
  if (p.kind === "typo") return 1;
  return p.severity === "warning" ? 2 : 3;
}

/** The problem Saarthi looks at: the most important one on the cursor's line, else the most important overall. */
export function focusProblem(problems: LiveProblem[], line: number): LiveProblem | null {
  const best = (list: LiveProblem[]) => list.reduce<LiveProblem | null>((a, p) => (!a || liveRank(p) < liveRank(a) ? p : a), null);
  return best(problems.filter((p) => p.startLine === line)) ?? best(problems);
}

/** A marker from one of Monaco's language services (see editor/CodeEditor.tsx). */
export interface ServiceMarkerLike {
  owner: string;
  severity: "error" | "warning" | "info" | "hint";
  message: string;
  code?: string;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

/**
 * TypeScript/HTML/CSS problems as live problems for the diagnostics list and
 * Saarthi. "Did you mean 'x'?" becomes a typo with a one-click fix; errors
 * already reported by the syntax check on the same line are left out.
 */
export function serviceProblems(markers: ServiceMarkerLike[], syntax: LiveProblem[] = []): LiveProblem[] {
  const out: LiveProblem[] = [];
  const syntaxLines = new Set(syntax.map((p) => p.startLine));
  for (const m of markers) {
    if (m.severity !== "error" && m.severity !== "warning") continue;
    const suggestion = /Did you mean '([^']+)'\?/.exec(m.message);
    if (!suggestion && syntaxLines.has(m.startLine)) continue;
    const owner = m.owner === "typescript" || m.owner === "javascript" ? "TypeScript" : m.owner.toUpperCase();
    out.push({
      kind: suggestion ? "typo" : "unexpected",
      severity: m.severity,
      message: `${m.message.split("\n")[0]}${owner ? ` (${owner} checker)` : ""}`,
      startLine: m.startLine,
      startColumn: m.startColumn,
      endLine: m.endLine,
      endColumn: m.endColumn,
      topic: suggestion ? "typo" : "syntax",
      origin: "service",
      fix: suggestion
        ? {
            label: `Change to ${suggestion[1]}`,
            confidence: "high",
            edits: [{ startLine: m.startLine, startColumn: m.startColumn, endLine: m.endLine, endColumn: m.endColumn, text: suggestion[1] }],
          }
        : undefined,
    });
    if (out.length >= 8) break;
  }
  return out;
}
