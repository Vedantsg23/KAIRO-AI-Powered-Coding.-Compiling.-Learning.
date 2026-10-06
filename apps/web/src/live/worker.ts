/// <reference lib="webworker" />
/**
 * Live syntax check, off the main thread.
 *
 * The worker keeps one Tree-sitter parser per language (grammars are
 * bundled .wasm files, loaded the first time a language is checked) and
 * answers each request with the problems in the text and how long the parse
 * took. It never touches the network beyond fetching those bundled files from
 * the app's own origin: typing is never sent to a server or an AI.
 */
import { Language, Parser } from "web-tree-sitter";
import runtimeWasm from "web-tree-sitter/web-tree-sitter.wasm?url";
import bashWasm from "tree-sitter-bash/tree-sitter-bash.wasm?url";
import cWasm from "tree-sitter-c/tree-sitter-c.wasm?url";
import csharpWasm from "tree-sitter-c-sharp/tree-sitter-c_sharp.wasm?url";
import cppWasm from "tree-sitter-cpp/tree-sitter-cpp.wasm?url";
import goWasm from "tree-sitter-go/tree-sitter-go.wasm?url";
import javaWasm from "tree-sitter-java/tree-sitter-java.wasm?url";
import javascriptWasm from "tree-sitter-javascript/tree-sitter-javascript.wasm?url";
import kotlinWasm from "@tree-sitter-grammars/tree-sitter-kotlin/tree-sitter-kotlin.wasm?url";
import luaWasm from "@tree-sitter-grammars/tree-sitter-lua/tree-sitter-lua.wasm?url";
import phpWasm from "tree-sitter-php/tree-sitter-php.wasm?url";
import pythonWasm from "tree-sitter-python/tree-sitter-python.wasm?url";
import rubyWasm from "tree-sitter-ruby/tree-sitter-ruby.wasm?url";
import rustWasm from "tree-sitter-rust/tree-sitter-rust.wasm?url";
import typescriptWasm from "tree-sitter-typescript/tree-sitter-typescript.wasm?url";
import type { Tree } from "web-tree-sitter";
import { findProblems, type LiveProblem, type SyntaxNode } from "./analyze";
import { conceptAt, conceptsInFile, type ConceptInfo, type ConceptNode } from "./concepts";
import { analyzeInsights, type InsightCursor, type Insights, type TipNode } from "./insights";

const GRAMMARS: Record<string, string> = {
  bash: bashWasm,
  c: cWasm,
  cpp: cppWasm,
  csharp: csharpWasm,
  go: goWasm,
  java: javaWasm,
  javascript: javascriptWasm,
  kotlin: kotlinWasm,
  lua: luaWasm,
  php: phpWasm,
  python: pythonWasm,
  ruby: rubyWasm,
  rust: rustWasm,
  typescript: typescriptWasm,
};

/** Languages whose statements end with ';' (used to phrase hints). */
const SEMICOLONS = new Set(["c", "cpp", "java", "csharp", "javascript", "typescript", "php", "rust"]);

export interface CheckRequest {
  kind: "check";
  generation: number;
  languageId: string;
  text: string;
  /** Which insights to compute after the syntax check (Typo Guard and Saarthi tips can be switched off). */
  insights?: { typos: boolean; tips: boolean };
}

/** Which concept the code at a position is about (answered from the last checked tree). */
export interface ConceptRequest {
  kind: "concept";
  generation: number;
  languageId: string;
  row: number;
  column: number;
}

export type CheckResponse =
  | { kind: "check"; generation: number; languageId: string; ok: true; problems: LiveProblem[]; parseMs: number; loadMs: number | null }
  | { kind: "check"; generation: number; languageId: string; ok: false; error: string };

export type ConceptResponse =
  | { kind: "concept"; generation: number; languageId: string; ok: true; concept: ConceptInfo }
  | { kind: "concept"; generation: number; languageId: string; ok: false };

/**
 * Typos, tips, symbols and metrics for the text of a check, sent shortly
 * after the check's answer (so the syntax result is never delayed by them).
 */
export type InsightsResponse =
  | { kind: "insights"; generation: number; languageId: string; ok: true; insights: Insights; ms: number }
  | { kind: "insights"; generation: number; languageId: string; ok: false };

/** Pause after a check before computing insights; a newer check cancels them. */
const INSIGHTS_DELAY_MS = 25;
let insightsTimer: ReturnType<typeof setTimeout> | null = null;

let ready: Promise<void> | null = null;
const parsers = new Map<string, Promise<Parser>>();
/** The last checked tree per language, kept for concept questions (the previous one is freed). */
const lastTrees = new Map<string, { tree: Tree; inFile: string[] | null }>();

function parserFor(languageId: string): Promise<Parser> {
  let parser = parsers.get(languageId);
  if (!parser) {
    const url = GRAMMARS[languageId];
    if (!url) return Promise.reject(new Error(`no grammar for ${languageId}`));
    parser = (async () => {
      ready ??= Parser.init({ locateFile: () => runtimeWasm });
      await ready;
      const language = await Language.load(url);
      const p = new Parser();
      p.setLanguage(language);
      return p;
    })();
    parsers.set(languageId, parser);
    parser.catch(() => parsers.delete(languageId)); // allow a retry later
  }
  return parser;
}

function concept(request: ConceptRequest): ConceptResponse {
  const { generation, languageId, row, column } = request;
  const entry = lastTrees.get(languageId);
  if (!entry) return { kind: "concept", generation, languageId, ok: false };
  const root = entry.tree.rootNode as unknown as ConceptNode;
  entry.inFile ??= conceptsInFile(root);
  return { kind: "concept", generation, languageId, ok: true, concept: { ...conceptAt(root, row, column), inFile: entry.inFile } };
}

self.onmessage = async (event: MessageEvent<CheckRequest | ConceptRequest>) => {
  const post = (message: CheckResponse | ConceptResponse | InsightsResponse) => (self as DedicatedWorkerGlobalScope).postMessage(message);
  if (event.data.kind === "concept") {
    try {
      post(concept(event.data));
    } catch {
      post({ kind: "concept", generation: event.data.generation, languageId: event.data.languageId, ok: false });
    }
    return;
  }
  const { generation, languageId, text } = event.data;
  const wanted = event.data.insights ?? { typos: true, tips: true };
  if (insightsTimer !== null) {
    clearTimeout(insightsTimer);
    insightsTimer = null;
  }
  try {
    const loading = !parsers.has(languageId);
    const loadStarted = performance.now();
    const parser = await parserFor(languageId);
    const loadMs = loading ? performance.now() - loadStarted : null;
    const started = performance.now();
    const tree = parser.parse(text);
    if (!tree) throw new Error("parse failed");
    const problems = findProblems(tree.rootNode as unknown as SyntaxNode, text, {
      semicolons: SEMICOLONS.has(languageId),
      python: languageId === "python",
      language: languageId,
    });
    const parseMs = performance.now() - started;
    lastTrees.get(languageId)?.tree.delete();
    lastTrees.set(languageId, { tree, inFile: null });
    post({ kind: "check", generation, languageId, ok: true, problems, parseMs, loadMs });
    // Insights a moment later, on the same tree, unless a newer check arrives first.
    insightsTimer = setTimeout(() => {
      insightsTimer = null;
      const entry = lastTrees.get(languageId);
      if (!entry || entry.tree !== tree) return;
      try {
        const started = performance.now();
        const cursor = tree.walk();
        let insights: Insights;
        try {
          insights = analyzeInsights(cursor as unknown as InsightCursor, text, languageId, {
            tips: wanted.tips ? (tree.rootNode as unknown as TipNode) : null,
          });
        } finally {
          cursor.delete();
        }
        if (!wanted.typos) insights.typos = [];
        post({ kind: "insights", generation, languageId, ok: true, insights, ms: performance.now() - started });
      } catch {
        post({ kind: "insights", generation, languageId, ok: false });
      }
    }, INSIGHTS_DELAY_MS);
  } catch (error) {
    post({ kind: "check", generation, languageId, ok: false, error: error instanceof Error ? error.message : String(error) });
  }
};
