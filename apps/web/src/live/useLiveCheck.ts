import { useEffect, useRef, useState, type MutableRefObject } from "react";
import type { LiveProblem } from "./analyze";
import type { ConceptInfo } from "./concepts";
import type { Insights } from "./insights";
import { LIVE_DEBOUNCE_MS, LIVE_LANGUAGES } from "./support";
import type { CheckRequest, CheckResponse, ConceptRequest, ConceptResponse, InsightsResponse } from "./worker";

export interface LiveStats {
  /** Worker-side time to parse and analyse, in ms. */
  checkP50: number | null;
  checkP95: number | null;
  /** Last keystroke -> problems on screen, including the pause, in ms. */
  latencyP50: number | null;
  latencyP95: number | null;
  samples: number;
  /** Time to download and compile the grammar the first time. */
  grammarLoadMs: number | null;
}

export interface LiveState {
  status: "unsupported" | "loading" | "checking" | "ready" | "error";
  problems: LiveProblem[];
  /** The exact text the problems were computed for. */
  text: string | null;
  stats: LiveStats;
  error?: string;
  /** The concept at the cursor, from the last checked text (null until known or when unsupported). */
  concept: ConceptInfo | null;
  /** Typos, tips, symbols and metrics, and the exact text they were computed for. */
  insights: (Insights & { text: string; ms: number }) | null;
}

/** Which insights to compute (from the Typo Guard and Saarthi Tips extensions). */
export interface InsightOptions {
  typos: boolean;
  tips: boolean;
}

const EMPTY_STATS: LiveStats = {
  checkP50: null,
  checkP95: null,
  latencyP50: null,
  latencyP95: null,
  samples: 0,
  grammarLoadMs: null,
};
const MAX_SAMPLES = 200;
/** Pause after the cursor stops before asking which concept it is on. */
const CONCEPT_DEBOUNCE_MS = 120;

declare global {
  interface Window {
    /** Measurements for the end-to-end test (read-only, local to this tab). */
    __kairoLive?: { latencies: number[]; checks: number[]; loads: Record<string, number>; total: number };
  }
}

export function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
}

/**
 * Checks the editor text with Tree-sitter in a Web Worker, 150 ms after the
 * last change. Each request carries a generation number; answers for older
 * generations (or another language) are dropped, so problems never belong to
 * text that is no longer in the editor. The same worker answers which
 * concept the cursor is on, from the last checked syntax tree.
 */
export function useLiveCheck(
  languageId: string,
  text: string,
  editedAt: MutableRefObject<number>,
  cursor?: { line: number; column: number },
  insightOptions: InsightOptions = { typos: true, tips: true },
): LiveState {
  const supported = LIVE_LANGUAGES.has(languageId);
  const [state, setState] = useState<LiveState>({
    status: supported ? "loading" : "unsupported",
    problems: [],
    text: null,
    stats: EMPTY_STATS,
    concept: null,
    insights: null,
  });
  const wantTypos = insightOptions.typos;
  const wantTips = insightOptions.tips;
  const worker = useRef<Worker | null>(null);
  const generation = useRef(0);
  const conceptGeneration = useRef(0);
  const sent = useRef(new Map<number, { text: string; editedAt: number }>());
  const samples = useRef<{ latencies: number[]; checks: number[]; total: number }>({ latencies: [], checks: [], total: 0 });
  const loads = useRef<Record<string, number>>({});
  /** The text of each check still waiting for its insights. */
  const insightTexts = useRef(new Map<number, string>());

  // One worker for the page, created on first use; one message handler.
  const ensureWorker = () => {
    if (worker.current) return worker.current;
    const w = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
    w.onmessage = (event: MessageEvent<CheckResponse | ConceptResponse | InsightsResponse>) => {
      const answer = event.data;
      if (answer.kind === "concept") {
        if (answer.generation !== conceptGeneration.current) return;
        setState((s) => ({ ...s, concept: answer.ok ? answer.concept : null }));
        return;
      }
      if (answer.kind === "insights") {
        const checked = insightTexts.current.get(answer.generation);
        insightTexts.current.delete(answer.generation);
        if (answer.generation !== generation.current || checked === undefined || !answer.ok) return;
        setState((s) => ({ ...s, insights: { ...answer.insights, text: checked, ms: answer.ms } }));
        return;
      }
      const request = sent.current.get(answer.generation);
      sent.current.delete(answer.generation);
      // Drop answers for text that has changed since, or another language.
      if (answer.generation !== generation.current || !request) return;
      if (!answer.ok) {
        setState((s) => ({ ...s, status: "error", error: answer.error, problems: [], text: request.text }));
        return;
      }
      if (answer.loadMs !== null) loads.current[answer.languageId] = Math.round(answer.loadMs);
      setState((s) => ({ ...s, status: "ready", problems: answer.problems, text: request.text, error: undefined }));
      // Measure once the new problems are painted.
      requestAnimationFrame(() => {
        const latency = performance.now() - request.editedAt;
        const store = samples.current;
        if (answer.loadMs === null) {
          store.total += 1;
          store.latencies.push(latency);
          store.checks.push(answer.parseMs);
          if (store.latencies.length > MAX_SAMPLES) store.latencies.shift();
          if (store.checks.length > MAX_SAMPLES) store.checks.shift();
        }
        window.__kairoLive = {
          latencies: [...store.latencies],
          checks: [...store.checks],
          loads: { ...loads.current },
          total: store.total,
        };
        setState((s) => ({
          ...s,
          stats: {
            checkP50: percentile(store.checks, 50),
            checkP95: percentile(store.checks, 95),
            latencyP50: percentile(store.latencies, 50),
            latencyP95: percentile(store.latencies, 95),
            samples: store.latencies.length,
            grammarLoadMs: loads.current[answer.languageId] ?? null,
          },
        }));
      });
    };
    worker.current = w;
    return w;
  };

  useEffect(() => {
    return () => {
      worker.current?.terminate();
      worker.current = null;
    };
  }, []);

  useEffect(() => {
    if (!supported) {
      setState((s) => ({ ...s, status: "unsupported", problems: [], text: null, concept: null, insights: null }));
      return;
    }
    const current = ++generation.current;
    // Same status: keep the same state object, so a keystroke does not re-render the console twice.
    setState((s) => {
      const status = s.status === "loading" || loads.current[languageId] === undefined ? "loading" : "checking";
      return s.status === status ? s : { ...s, status };
    });
    const timer = window.setTimeout(() => {
      const w = ensureWorker();
      sent.current.set(current, { text, editedAt: editedAt.current || performance.now() });
      insightTexts.current.clear();
      insightTexts.current.set(current, text);
      const request: CheckRequest = { kind: "check", generation: current, languageId, text, insights: { typos: wantTypos, tips: wantTips } };
      w.postMessage(request);
    }, LIVE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [supported, languageId, text, editedAt, wantTypos, wantTips]); // ensureWorker only reads refs

  // The concept at the cursor: asked after the cursor rests, and again when
  // a new check has produced a fresh tree.
  const hasCursor = cursor !== undefined;
  const line = cursor?.line ?? 1;
  const column = cursor?.column ?? 1;
  const checkedText = state.text;
  useEffect(() => {
    if (!supported || checkedText === null || !hasCursor) return;
    const current = ++conceptGeneration.current;
    const timer = window.setTimeout(() => {
      const request: ConceptRequest = { kind: "concept", generation: current, languageId, row: line - 1, column: Math.max(0, column - 1) };
      ensureWorker().postMessage(request);
    }, CONCEPT_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [supported, languageId, line, column, checkedText, hasCursor]);

  return state;
}
