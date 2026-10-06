/**
 * KAIRO IntelliSense for every language: completions (the file's own names,
 * library functions with their signatures, keywords, snippets, members after
 * "." / "::" / "->", headers and modules after #include / import), hovers
 * with documentation, parameter hints and quick fixes (Ctrl+.) for the live
 * analyzer's problems.
 *
 * JavaScript, TypeScript, React, HTML and CSS get their completions from
 * Monaco's own language services; KAIRO adds its snippets there.
 */
import type { LiveProblem } from "../../live/analyze";
import type { CodeSymbol } from "../../live/insights";
import { monaco } from "../monaco";
import { completer, inOrder } from "./completer";
import { specFor, type Entry, type LanguageSpec } from "./index";

type M = typeof monaco;
type Model = import("monaco-editor/editor/editor.api").editor.ITextModel;
type Position = import("monaco-editor/editor/editor.api").Position;

export interface IntelContext {
  /** KAIRO language id (c, cpp, python, react...). */
  languageId: string;
  /** Names declared in the file (from the live analyzer). */
  symbols: CodeSymbol[];
  /** Language pack on: completions, hovers and parameter hints. */
  completions: boolean;
  snippets: boolean;
  /** Live problems with fixes, offered as quick fixes (Ctrl+.). */
  problems: LiveProblem[];
  /** Complexity Lens: one line per function (empty when the extension is off). */
  complexity: { line: number; text: string }[];
  /** AI autocomplete extension on and Saarthi's model reachable: ghost text after a pause in typing. */
  aiComplete: boolean;
}

const ctx: IntelContext = { languageId: "c", symbols: [], completions: true, snippets: true, problems: [], complexity: [], aiComplete: false };

export { setCompleter } from "./completer";

/** The pause after the last keystroke before ghost text is requested. */
export const AI_COMPLETE_DELAY_MS = 450;
const lensChanged = new Set<() => void>();

export function setIntelContext(next: Partial<IntelContext>) {
  const lensBefore = ctx.complexity;
  Object.assign(ctx, next);
  if (next.complexity && next.complexity !== lensBefore) lensChanged.forEach((fire) => fire());
}

/**
 * Notebook cells are Python editors of their own (models with this URI
 * scheme). They get Python completions with the names defined in any of the
 * notebook's cells, and none of the main editor's quick fixes or lenses.
 */
export const NOTEBOOK_SCHEME = "kairo-notebook";
let notebookSymbols: CodeSymbol[] = [];
export function setNotebookSymbols(symbols: CodeSymbol[]) {
  notebookSymbols = symbols;
}

function contextFor(model: Model): IntelContext {
  if (model.uri.scheme !== NOTEBOOK_SCHEME) return ctx;
  return { ...ctx, languageId: "python", symbols: notebookSymbols, problems: [], complexity: [] };
}

/** Languages whose function calls are written without parentheses. */
const NO_PARENS = new Set(["bash", "haskell", "lisp", "scheme", "clojure", "tcl", "ruby", "perl", "cobol", "fsharp", "asm", "sql"]);

/** Languages whose completions come from a Monaco language service (KAIRO only adds snippets). */
const SERVICE = new Set(["javascript", "typescript", "react", "html", "css"]);

const LINE_COMMENT: Record<string, string[]> = {
  python: ["#"], ruby: ["#"], bash: ["#"], perl: ["#"], r: ["#"], nim: ["#"], elixir: ["#"], tcl: ["#"],
  lua: ["--"], sql: ["--"], haskell: ["--"], ada: ["--"], vhdl: ["--"],
  asm: [";"], lisp: [";"], scheme: [";"], clojure: [";"],
  prolog: ["%"], erlang: ["%"], octave: ["%", "#"],
  fortran: ["!"], cobol: ["*>"], vbnet: ["'"],
};

/** A rough check that the cursor is inside a comment or a string (then only word completions make sense). */
function inCommentOrString(before: string, languageId: string): boolean {
  let quote: string | null = null;
  for (let i = 0; i < before.length; i++) {
    const ch = before[i];
    if (quote) {
      if (ch === "\\") i++;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || (ch === "'" && languageId !== "vbnet" && languageId !== "lisp" && languageId !== "clojure" && languageId !== "scheme") || ch === "`") {
      quote = ch;
      continue;
    }
    const markers = LINE_COMMENT[languageId] ?? ["//"];
    if (markers.some((m) => before.startsWith(m, i))) return true;
  }
  return quote !== null;
}

function kindOf(m: M, kind: Entry["kind"] | CodeSymbol["kind"] | "snippet"): number {
  const K = m.languages.CompletionItemKind;
  switch (kind) {
    case "function":
    case "macro":
      return K.Function;
    case "method":
      return K.Method;
    case "class":
      return K.Class;
    case "struct":
      return K.Struct;
    case "interface":
      return K.Interface;
    case "module":
      return K.Module;
    case "constant":
      return K.Constant;
    case "type":
      return K.TypeParameter;
    case "property":
      return K.Property;
    case "field":
      return K.Field;
    case "enum":
      return K.Enum;
    case "keyword":
      return K.Keyword;
    case "parameter":
      return K.Variable;
    case "snippet":
      return K.Snippet;
    default:
      return K.Variable;
  }
}

function docOf(entry: Entry, spec: LanguageSpec) {
  const lang = spec.id === "cpp" ? "cpp" : spec.id;
  const parts: string[] = [];
  if (entry.sig) parts.push("```" + lang + "\n" + entry.sig + "\n```");
  if (entry.doc) parts.push(entry.doc);
  return parts.length ? { value: parts.join("\n\n") } : undefined;
}

/** The receiver's members, trying "System.out", then "out", "std::io" then "io"... */
function membersOf(spec: LanguageSpec, receiver: string): Entry[] | null {
  const key = receiver.replace(/->/g, ".");
  if (spec.modules[key]) return spec.modules[key];
  const parts = key.split(/\.|::/);
  for (let i = 1; i < parts.length; i++) {
    const tail = parts.slice(i).join(".");
    if (spec.modules[tail]) return spec.modules[tail];
    const tail2 = parts.slice(i).join("::");
    if (spec.modules[tail2]) return spec.modules[tail2];
  }
  return null;
}

function callable(entry: Entry): boolean {
  return (entry.kind === "function" || entry.kind === "method" || entry.kind === "macro") && !!entry.sig && /\(/.test(entry.sig);
}

function completionItems(m: M, model: Model, position: Position) {
  const ctx = contextFor(model);
  const spec = specFor(ctx.languageId);
  const line = model.getLineContent(position.lineNumber);
  const before = line.slice(0, position.column - 1);
  const after = line.slice(position.column - 1);
  const word = model.getWordUntilPosition(position);
  const range = new m.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn);
  const suggestions: import("monaco-editor/editor/editor.api").languages.CompletionItem[] = [];
  if (!spec) return suggestions;
  const service = SERVICE.has(ctx.languageId);
  const snippetRule = m.languages.CompletionItemInsertTextRule.InsertAsSnippet;

  // #include <...> / import ...
  const include = /^\s*#\s*include\s*<([\w./+-]*)$/.exec(before);
  const importLine = /^\s*(?:import|from)\s+([\w.]*)$/.exec(before);
  if ((include && (spec.id === "c" || spec.id === "cpp")) || (importLine && !service && spec.imports.length > 0)) {
    const typed = (include ?? importLine)![1];
    const start = position.column - typed.length;
    const r = new m.Range(position.lineNumber, start, position.lineNumber, position.column);
    for (const target of spec.imports) {
      suggestions.push({
        label: target,
        kind: m.languages.CompletionItemKind.Module,
        insertText: include && !after.startsWith(">") ? `${target}>` : target,
        range: r,
        detail: include ? "standard header" : "module",
        sortText: `0${target}`,
      });
    }
    return suggestions;
  }

  if (inCommentOrString(before, ctx.languageId)) return suggestions;

  // Members after "." "::" "->"
  const member = /([A-Za-z_$][\w$]*(?:(?:\.|::|->)[A-Za-z_$][\w$]*)*)(\.|::|->)([A-Za-z_$][\w$]*)?$/.exec(before);
  if (member && spec.separators.includes(member[2]) && !service) {
    const receiver = member[1];
    const known = membersOf(spec, receiver);
    const list = known ?? spec.members;
    for (const entry of list) {
      const needsParens = callable(entry) && !NO_PARENS.has(spec.id) && !after.startsWith("(");
      suggestions.push({
        label: { label: entry.name, detail: entry.sig && entry.sig !== entry.name ? entry.sig.slice(entry.name.length) : undefined },
        kind: kindOf(m, entry.kind),
        insertText: needsParens ? `${entry.name}($0)` : entry.name,
        insertTextRules: needsParens ? snippetRule : undefined,
        documentation: docOf(entry, spec),
        range,
        sortText: `${known ? "0" : "2"}${entry.name}`,
        command: needsParens ? { id: "editor.action.triggerParameterHints", title: "" } : undefined,
      });
    }
    // The file's own fields and methods (struct members, self.x...).
    if (!known) {
      for (const s of ctx.symbols) {
        if (s.kind !== "field" && s.kind !== "function" && s.kind !== "variable") continue;
        suggestions.push({ label: s.name, kind: kindOf(m, s.kind === "variable" ? "field" : s.kind), insertText: s.name, range, sortText: `1${s.name}`, detail: `from this file (line ${s.line})` });
      }
    }
    return suggestions;
  }

  if (ctx.completions && !service) {
    const seen = new Set<string>();
    // 1. Names declared in this file.
    for (const s of ctx.symbols) {
      if (seen.has(s.name)) continue;
      seen.add(s.name);
      suggestions.push({
        label: s.name,
        kind: kindOf(m, s.kind),
        insertText: s.name,
        range,
        detail: `${s.kind} · line ${s.line}`,
        sortText: `0${s.name}`,
      });
    }
    // 2. Library functions, classes and constants.
    for (const entry of spec.builtins) {
      if (seen.has(entry.name)) continue;
      seen.add(entry.name);
      const needsParens = callable(entry) && !NO_PARENS.has(spec.id) && !after.startsWith("(");
      const bang = entry.name.endsWith("!");
      suggestions.push({
        label: { label: entry.name, detail: entry.sig && entry.sig !== entry.name ? entry.sig.slice(entry.name.length) : undefined, description: "library" },
        kind: kindOf(m, entry.kind),
        insertText: needsParens ? `${entry.name}${bang ? "" : ""}($0)` : entry.name,
        insertTextRules: needsParens ? snippetRule : undefined,
        documentation: docOf(entry, spec),
        range,
        sortText: `1${entry.name}`,
        command: needsParens ? { id: "editor.action.triggerParameterHints", title: "" } : undefined,
      });
    }
    // Modules / namespaces (math, System, std...).
    for (const receiver of Object.keys(spec.modules)) {
      const head = receiver.split(/\.|::/)[0];
      if (seen.has(head)) continue;
      seen.add(head);
      suggestions.push({ label: head, kind: m.languages.CompletionItemKind.Module, insertText: head, range, sortText: `1${head}`, detail: "module" });
    }
    // 3. Types and keywords.
    for (const t of spec.types) {
      if (seen.has(t)) continue;
      seen.add(t);
      suggestions.push({ label: t, kind: m.languages.CompletionItemKind.TypeParameter, insertText: t, range, sortText: `2${t}`, detail: "type" });
    }
    for (const k of spec.keywords) {
      if (seen.has(k) || !/^[\w#%$-]+[!?]?$/.test(k)) continue;
      seen.add(k);
      suggestions.push({ label: k, kind: m.languages.CompletionItemKind.Keyword, insertText: k, range, sortText: `2${k}` });
    }
  }
  // 4. Snippets (for, while, main, class...).
  if (ctx.snippets) {
    for (const s of spec.snippets) {
      suggestions.push({
        label: { label: s.prefix, description: s.label },
        kind: m.languages.CompletionItemKind.Snippet,
        insertText: s.body,
        insertTextRules: snippetRule,
        documentation: { value: `${s.doc ? s.doc + "\n\n" : ""}\`\`\`\n${s.body.replace(/\$\{\d+:([^}]*)\}/g, "$1").replace(/\$\d/g, "").replace(/\\\$/g, "$")}\n\`\`\`` },
        range,
        sortText: `3${s.prefix}`,
        detail: "KAIRO snippet",
      });
    }
  }
  return suggestions;
}

/** The function being called at the cursor: its name, receiver and which argument the cursor is in. */
function callAt(before: string): { name: string; receiver: string | null; argument: number } | null {
  let depth = 0;
  let commas = 0;
  for (let i = before.length - 1; i >= 0; i--) {
    const ch = before[i];
    if (ch === ")" || ch === "]" || ch === "}") depth++;
    else if (ch === "(" || ch === "[" || ch === "{") {
      if (depth === 0) {
        if (ch !== "(") return null;
        const head = /([A-Za-z_$][\w$]*(?:(?:\.|::|->)[A-Za-z_$][\w$]*)*)!?\s*$/.exec(before.slice(0, i));
        if (!head) return null;
        const parts = head[1].split(/(\.|::|->)/);
        const name = parts[parts.length - 1];
        const receiver = parts.length > 1 ? parts.slice(0, -2).join("") : null;
        return { name, receiver, argument: commas };
      }
      depth--;
    } else if (ch === "," && depth === 0) commas++;
    else if (ch === '"' || ch === "'") {
      // Skip back over a string literal.
      const q = ch;
      i--;
      while (i >= 0 && !(before[i] === q && before[i - 1] !== "\\")) i--;
    }
  }
  return null;
}

function findEntry(spec: LanguageSpec, name: string, receiver: string | null): Entry | null {
  if (receiver) {
    const list = membersOf(spec, receiver);
    const hit = list?.find((e) => e.name === name) ?? spec.members.find((e) => e.name === name);
    if (hit) return hit;
  }
  return spec.builtins.find((e) => e.name === name || e.name === `${name}!`) ?? null;
}

/** Split "f(a, b(c, d), e)" parameters into [start, end) offsets inside the signature. */
function parameterOffsets(sig: string): [number, number][] {
  const open = sig.indexOf("(");
  if (open < 0) return [];
  const out: [number, number][] = [];
  let depth = 0;
  let start = open + 1;
  for (let i = open + 1; i < sig.length; i++) {
    const ch = sig[i];
    if (ch === "(" || ch === "<" || ch === "[") depth++;
    else if (ch === ")" || ch === ">" || ch === "]") {
      if (depth === 0) {
        if (sig.slice(start, i).trim()) out.push([start + (sig.slice(start, i).length - sig.slice(start, i).trimStart().length), i]);
        break;
      }
      depth--;
    } else if (ch === "," && depth === 0) {
      out.push([start + (sig.slice(start, i).length - sig.slice(start, i).trimStart().length), i]);
      start = i + 1;
    }
  }
  return out;
}

let registered = false;

/** Register KAIRO's providers once, for every editor mode KAIRO uses. */
export function registerIntellisense(m: M = monaco) {
  if (registered) return;
  registered = true;
  const modes = [
    "c", "cpp", "java", "kotlin", "csharp", "python", "go", "rust", "swift", "php", "ruby", "lua", "shell", "sql",
    "perl", "r", "tcl", "javascript", "typescript", "html", "css", "nasm", "fortran", "pascal", "prolog", "cobol",
    "lex", "verilog", "systemverilog", "elixir", "erlang", "lisp", "scheme", "clojure", "haskell", "d", "ada", "nim",
    "octave", "vb", "fsharp", "vhdl",
  ];

  m.languages.registerCompletionItemProvider(modes, {
    triggerCharacters: [".", ":", ">", "<", "#"],
    provideCompletionItems(model, position) {
      return { suggestions: completionItems(m, model, position) };
    },
  });

  m.languages.registerHoverProvider(modes, {
    provideHover(model, position) {
      const ctx = contextFor(model);
      if (!ctx.completions || SERVICE.has(ctx.languageId)) return null;
      const spec = specFor(ctx.languageId);
      const word = model.getWordAtPosition(position);
      if (!spec || !word) return null;
      const before = model.getLineContent(position.lineNumber).slice(0, word.startColumn - 1);
      const recv = /([A-Za-z_$][\w$]*(?:(?:\.|::|->)[A-Za-z_$][\w$]*)*)(?:\.|::|->)$/.exec(before);
      const entry = findEntry(spec, word.word, recv ? recv[1] : null);
      if (entry) {
        const doc = docOf(entry, spec);
        if (!doc) return null;
        return {
          range: new m.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn),
          contents: [doc, { value: "_KAIRO reference_" }],
        };
      }
      const symbol = ctx.symbols.find((s) => s.name === word.word);
      if (symbol) {
        return {
          range: new m.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn),
          contents: [{ value: `**${symbol.name}** — ${symbol.kind} declared on line ${symbol.line}` }],
        };
      }
      return null;
    },
  });

  m.languages.registerSignatureHelpProvider(modes, {
    signatureHelpTriggerCharacters: ["(", ","],
    signatureHelpRetriggerCharacters: [","],
    provideSignatureHelp(model, position) {
      const ctx = contextFor(model);
      if (!ctx.completions || SERVICE.has(ctx.languageId)) return null;
      const spec = specFor(ctx.languageId);
      if (!spec) return null;
      const before = model.getLineContent(position.lineNumber).slice(0, position.column - 1);
      const call = callAt(before);
      if (!call) return null;
      const entry = findEntry(spec, call.name, call.receiver);
      if (!entry?.sig || !entry.sig.includes("(")) return null;
      const params = parameterOffsets(entry.sig);
      return {
        value: {
          signatures: [
            {
              label: entry.sig,
              documentation: entry.doc,
              parameters: params.map((p) => ({ label: p })),
            },
          ],
          activeSignature: 0,
          activeParameter: Math.min(call.argument, Math.max(0, params.length - 1)),
        },
        dispose() {},
      };
    },
  });

  // Complexity Lens: "≈ O(n²) · 2 nested loops" above each function.
  type LensProvider = import("monaco-editor/editor/editor.api").languages.CodeLensProvider;
  const lensEmitter = new m.Emitter<LensProvider>();
  const lensProvider: LensProvider = {
    onDidChange: lensEmitter.event,
    provideCodeLenses(model) {
      return {
        lenses: contextFor(model).complexity.map((c, i) => ({
          range: new m.Range(c.line, 1, c.line, 1),
          id: `complexity-${i}`,
          command: { id: "", title: c.text },
        })),
        dispose() {},
      };
    },
    resolveCodeLens(_model, lens) {
      return lens;
    },
  };
  lensChanged.add(() => lensEmitter.fire(lensProvider));
  m.languages.registerCodeLensProvider(modes, lensProvider);

  // AI autocomplete: ghost text from Saarthi's model after a pause in typing (Tab accepts, Esc dismisses).
  m.languages.registerInlineCompletionsProvider(modes, {
    async provideInlineCompletions(model, position, context, token) {
      const ctx = contextFor(model);
      const completeFn = completer();
      if (!ctx.aiComplete || !completeFn) return { items: [] };
      // Typing triggers this at once: wait for a pause. The editor's own trigger comes after one.
      if (context.triggerKind !== m.languages.InlineCompletionTriggerKind.Explicit) await new Promise((resolve) => setTimeout(resolve, AI_COMPLETE_DELAY_MS));
      if (token.isCancellationRequested) return { items: [] };
      const line = model.getLineContent(position.lineNumber);
      const before = line.slice(0, position.column - 1);
      const after = line.slice(position.column - 1);
      // Not in the middle of a word, and not on an empty file.
      if (/\w$/.test(before) && /^\w/.test(after)) return { items: [] };
      const offset = model.getOffsetAt(position);
      const text = model.getValue();
      if (!text.trim()) return { items: [] };
      const controller = new AbortController();
      const cancel = token.onCancellationRequested(() => controller.abort());
      try {
        const answer = await completeFn(
          { languageId: ctx.languageId, prefix: text.slice(Math.max(0, offset - 4000), offset), suffix: text.slice(offset, offset + 1500), maxLines: 4 },
          controller.signal,
        );
        if (token.isCancellationRequested || !answer.completion) return { items: [] };
        // What follows the cursor on the line (often an auto-closed ")" or "]"): when the
        // suggestion types those characters too, it replaces them instead of doubling them.
        const rest = after.trimEnd();
        const replaces = rest.length > 0 && inOrder(answer.completion.split("\n")[0], rest);
        const end = replaces ? position.column + rest.length : position.column;
        return {
          items: [{ insertText: answer.completion, range: new m.Range(position.lineNumber, position.column, position.lineNumber, end) }],
        };
      } catch {
        return { items: [] }; // offline, rate-limited or cancelled: no ghost text, nothing else changes
      } finally {
        cancel.dispose();
      }
    },
    disposeInlineCompletions() {},
  });

  m.languages.registerCodeActionProvider(modes, {
    provideCodeActions(model, range) {
      const actions: import("monaco-editor/editor/editor.api").languages.CodeAction[] = [];
      for (const p of contextFor(model).problems) {
        if (!p.fix) continue;
        if (p.endLine < range.startLineNumber || p.startLine > range.endLineNumber) continue;
        actions.push({
          title: p.fix.label,
          kind: "quickfix",
          isPreferred: p.fix.confidence === "high",
          edit: {
            edits: p.fix.edits.map((e) => ({
              resource: model.uri,
              versionId: undefined,
              textEdit: { range: new m.Range(e.startLine, e.startColumn, e.endLine, e.endColumn), text: e.text },
            })),
          },
        });
      }
      return { actions, dispose() {} };
    },
  });
}
