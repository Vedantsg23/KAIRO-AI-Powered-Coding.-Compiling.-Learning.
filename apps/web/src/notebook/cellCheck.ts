import type { LiveProblem } from "../live/analyze";
import type { CodeSymbol } from "../live/insights";
import { mergeLiveProblems } from "../live/merge";
import type { CheckRequest, CheckResponse, InsightsResponse } from "../live/worker";

/**
 * The live check for notebook cells, in a Tree-sitter worker of its own (the
 * main editor's checks never wait for it).
 *
 * Python parses every cell on its own, so syntax errors come from the edited
 * cell alone. Typos and tips need the names the cells before it define, so a
 * second check runs over those cells and the edited one together, and only
 * its findings inside the edited cell are kept (moved to the cell's own lines).
 *
 * The worker computes typos for its latest check only, so cells are checked
 * one at a time (the cell being typed in first); answers for text that has
 * changed since are dropped.
 */
export interface CellCheckResult {
  cellId: string;
  /** The exact cell text the problems belong to. */
  text: string;
  problems: LiveProblem[];
  /** Names defined in the cells up to this one (for completions). */
  symbols: CodeSymbol[];
}

interface Job {
  cellId: string;
  text: string;
  before: string[];
}

interface InFlight {
  cellId: string;
  text: string;
  /** Lines before the cell in the combined text. */
  offset: number;
  syntaxGen: number;
  namesGen: number;
  syntax: LiveProblem[] | null;
  typos: LiveProblem[];
  tips: LiveProblem[];
  symbols: CodeSymbol[] | null;
}

/** Give up on an answer after this long and check the next cell. */
const WATCHDOG_MS = 2000;

const shift = (p: LiveProblem, by: number): LiveProblem => ({
  ...p,
  startLine: p.startLine - by,
  endLine: p.endLine - by,
  fix: p.fix && { ...p.fix, edits: p.fix.edits.map((e) => ({ ...e, startLine: e.startLine - by, endLine: e.endLine - by })) },
});

export class CellChecker {
  private worker: Worker | null = null;
  private generation = 0;
  private queue: Job[] = [];
  private current: InFlight | null = null;
  private watchdog: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private onResult: (result: CellCheckResult) => void,
    private options: { typos: boolean; tips: boolean } = { typos: true, tips: true },
  ) {}

  setOptions(options: { typos: boolean; tips: boolean }) {
    this.options = options;
  }

  private ensure(): Worker | null {
    if (this.worker) return this.worker;
    try {
      this.worker = new Worker(new URL("../live/worker.ts", import.meta.url), { type: "module" });
    } catch {
      return null; // no workers: cells simply have no live check
    }
    this.worker.onmessage = (event: MessageEvent<CheckResponse | InsightsResponse | { kind: "concept" }>) => this.receive(event.data);
    return this.worker;
  }

  /**
   * Check `text` (the cell `cellId`) after the code of the cells before it.
   * `urgent`: the student is typing there, so it goes before queued cells.
   */
  check(cellId: string, text: string, before: string[], urgent = false) {
    this.queue = this.queue.filter((job) => job.cellId !== cellId);
    if (urgent) this.queue.unshift({ cellId, text, before });
    else this.queue.push({ cellId, text, before });
    this.pump();
  }

  private pump() {
    if (this.current || this.queue.length === 0) return;
    const worker = this.ensure();
    if (!worker) return;
    const job = this.queue.shift()!;
    const prefix = job.before.filter((t) => t.trim()).join("\n");
    const offset = prefix ? prefix.split("\n").length : 0;
    this.current = {
      cellId: job.cellId,
      text: job.text,
      offset,
      syntaxGen: ++this.generation,
      namesGen: ++this.generation,
      syntax: null,
      typos: [],
      tips: [],
      symbols: null,
    };
    const { syntaxGen, namesGen } = this.current;
    worker.postMessage({ kind: "check", generation: syntaxGen, languageId: "python", text: job.text, insights: { typos: false, tips: false } } satisfies CheckRequest);
    worker.postMessage({
      kind: "check",
      generation: namesGen,
      languageId: "python",
      text: prefix ? `${prefix}\n${job.text}` : job.text,
      insights: { typos: this.options.typos, tips: this.options.tips },
    } satisfies CheckRequest);
    this.watchdog = setTimeout(() => this.finish(), WATCHDOG_MS);
  }

  private receive(answer: CheckResponse | InsightsResponse | { kind: "concept" }) {
    const job = this.current;
    if (answer.kind === "concept" || !job) return;
    if (answer.generation === job.syntaxGen) {
      if (answer.kind === "check") {
        job.syntax = answer.ok ? answer.problems : [];
        this.report(job);
      }
      return;
    }
    if (answer.generation !== job.namesGen) return; // an answer for an earlier job
    if (answer.kind === "check") {
      if (!answer.ok) this.finish(); // no insights will follow
      return;
    }
    if (answer.ok) {
      const lines = job.text.split("\n").length;
      const inCell = (p: LiveProblem) => p.startLine > job.offset && p.startLine <= job.offset + lines;
      job.typos = answer.insights.typos.filter(inCell).map((p) => shift(p, job.offset));
      job.tips = answer.insights.tips.filter(inCell).map((p) => shift(p, job.offset));
      job.symbols = answer.insights.symbols;
    }
    this.finish();
  }

  private report(job: InFlight) {
    if (job.syntax === null) return;
    this.onResult({
      cellId: job.cellId,
      text: job.text,
      problems: mergeLiveProblems(job.syntax, job.typos, job.tips),
      symbols: job.symbols ?? [],
    });
  }

  /** The current job is done (or given up on): report it and check the next cell. */
  private finish() {
    if (this.watchdog !== null) clearTimeout(this.watchdog);
    this.watchdog = null;
    const job = this.current;
    this.current = null;
    if (job) {
      job.syntax ??= [];
      this.report(job);
    }
    this.pump();
  }

  dispose() {
    if (this.watchdog !== null) clearTimeout(this.watchdog);
    this.worker?.terminate();
    this.worker = null;
    this.queue = [];
    this.current = null;
  }
}
