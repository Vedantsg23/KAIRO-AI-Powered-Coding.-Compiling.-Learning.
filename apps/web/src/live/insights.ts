/**
 * Real-time code insights, computed in the analyzer worker from the same
 * Tree-sitter tree as the syntax check (so they cost the editor nothing):
 *
 *  - Typo Guard: names that are not declared in the file and not part of the
 *    language, but are one or two keystrokes away from a name that is
 *    ("pritnf" -> "printf", "Sytem" -> "System", "retrun" -> "return").
 *    Each comes with a one-click fix. Conservative on purpose: short names,
 *    names used three or more times and receivers KAIRO knows nothing about
 *    are left alone, and the message says "possible typo".
 *  - Saarthi tips: classic beginner slips that still compile (scanf without
 *    '&', a loop whose variable never changes, 1/2 == 0, a stray ';' after
 *    for/while/if, comparing Java strings with ==, reading a variable
 *    before it has a value...). Rule-based, deterministic, never AI.
 *  - Symbols declared in the file (for completions) and simple metrics:
 *    loops, nesting depth and recursion per function (Complexity Lens),
 *    whether the program reads input or prints output.
 *
 * Positions are 1-based lines and columns in UTF-16 code units, like the
 * editor's.
 */
import { knownNames, specFor, type KnownNames } from "../editor/intellisense/index";
import type { TextEdit } from "../lib/edits";
import type { LiveProblem } from "./analyze";

/** The subset of web-tree-sitter's TreeCursor this module uses. */
export interface InsightCursor {
  nodeType: string;
  nodeIsNamed: boolean;
  currentFieldName: string | null;
  startIndex: number;
  endIndex: number;
  startPosition: { row: number; column: number };
  endPosition: { row: number; column: number };
  gotoFirstChild(): boolean;
  gotoNextSibling(): boolean;
  gotoParent(): boolean;
}

export type SymbolKind = "function" | "class" | "variable" | "parameter" | "field" | "constant" | "type" | "module";

export interface CodeSymbol {
  name: string;
  kind: SymbolKind;
  line: number;
}

export interface FunctionMetrics {
  name: string;
  line: number;
  /** Deepest nesting of loops inside the function (comprehensions count). */
  loopDepth: number;
  loops: number;
  /** How many times the function calls itself. */
  selfCalls: number;
  /** A rough time-complexity estimate, e.g. "O(n²)" — labelled as an estimate in the UI. */
  estimate: string;
  reason: string;
}

export interface CodeMetrics {
  lines: number;
  functions: FunctionMetrics[];
  loops: number;
  maxLoopDepth: number;
  conditionals: number;
  readsInput: boolean;
  printsOutput: boolean;
}

export interface Insights {
  typos: LiveProblem[];
  tips: LiveProblem[];
  symbols: CodeSymbol[];
  metrics: CodeMetrics;
}

// ----------------------------------------------------------------- tables

const IDENT = new Set([
  "identifier",
  "type_identifier",
  "field_identifier",
  "property_identifier",
  "simple_identifier",
  "namespace_identifier",
  "package_identifier",
  "constant",
  "name",
  "variable_name",
  "command_name",
  "shorthand_property_identifier",
]);

/** Parents whose `name` field declares something. */
const NAME_DECLARES = new Set([
  "function_definition", "function_declaration", "function_item", "method_declaration", "method_definition",
  "method", "singleton_method", "class_declaration", "class_definition", "class_specifier", "struct_specifier",
  "enum_specifier", "union_specifier", "struct_item", "enum_item", "trait_item", "type_item", "union_item",
  "mod_item", "const_item", "static_item", "enum_variant", "interface_declaration", "enum_declaration",
  "record_declaration", "constructor_declaration", "variable_declarator", "formal_parameter",
  "catch_formal_parameter", "enhanced_for_statement", "parameter_declaration", "type_spec", "const_spec",
  "var_spec", "preproc_def", "preproc_function_def", "enumerator", "namespace_definition", "aliased_import",
  "import_specifier", "default_parameter", "typed_default_parameter", "function_signature", "method_signature",
  "abstract_method_signature", "local_function_statement", "parameter", "simple_parameter", "variable_list",
  "variable_assignment", "module", "class", "field_declaration", "type_alias_declaration", "type_parameter",
  "object_declaration", "property_signature", "public_field_definition", "field_definition", "struct_type",
  "named_expression", "keyword_parameter", "optional_parameter", "variadic_parameter", "enum_member_declaration",
  "delegate_declaration", "event_declaration", "property_declaration", "local_variable_declaration",
  "foreach_statement", "catch_declaration", "type_definition", "labeled_statement", "function_declarator",
  "import_statement", "import_from_statement", "future_import_statement",
]);

/** Fields that declare whatever is under them, whatever the parent. */
const DECL_FIELDS = new Set(["declarator", "pattern", "alias", "label", "parameters", "parameter", "variable"]);

/** Parents whose `left` field declares (for languages where assignment creates a variable). */
const LEFT_DECLARES = new Set([
  "assignment", "for_statement", "for_in_clause", "short_var_declaration", "range_clause", "for_in_statement",
  "assignment_expression", "assignment_statement", "operator_assignment", "pattern_list",
]);
/** `left` of these declares in every language (loops, :=). */
const LEFT_ALWAYS_DECLARES = new Set(["for_statement", "for_in_clause", "short_var_declaration", "range_clause", "for_in_statement"]);

/** Fields whose subtree is a use, never a declaration. */
const USE_FIELDS = new Set([
  "value", "size", "default_value", "right", "body", "condition", "consequence", "alternative", "arguments",
  "argument", "type", "return_type", "result", "superclass", "superclasses", "interfaces", "initializer", "init",
  "update", "index", "subscript", "object", "function", "operand", "path", "module_name", "trait", "bound",
  "expression", "receiver", "table", "iterable", "iterator", "right_hand_side", "scope",
]);

/** Member access: node type -> [object fields..., member field]. */
const MEMBER: Record<string, { object: string[]; member: string }> = {
  field_expression: { object: ["argument", "value"], member: "field" },
  attribute: { object: ["object"], member: "attribute" },
  field_access: { object: ["object"], member: "field" },
  method_invocation: { object: ["object"], member: "name" },
  member_expression: { object: ["object"], member: "property" },
  selector_expression: { object: ["operand"], member: "field" },
  qualified_identifier: { object: ["scope"], member: "name" },
  scoped_identifier: { object: ["path"], member: "name" },
  member_access_expression: { object: ["expression"], member: "name" },
  member_call_expression: { object: ["object"], member: "name" },
  member_access: { object: ["object"], member: "name" },
  call: { object: ["receiver"], member: "method" },
  dot_index_expression: { object: ["table"], member: "field" },
  method_index_expression: { object: ["table"], member: "method" },
  scoped_call_expression: { object: ["scope"], member: "name" },
};

const LOOPS = new Set([
  "for_statement", "while_statement", "do_statement", "for_in_statement", "enhanced_for_statement",
  "for_range_loop", "foreach_statement", "for_expression", "while_expression", "loop_expression",
  "while", "until", "for", "repeat_statement", "c_style_for_statement", "until_statement", "do_while_statement",
  "list_comprehension", "generator_expression", "dictionary_comprehension", "set_comprehension", "for_numeric_statement",
  "for_generic_statement",
]);

const CONDITIONALS = new Set([
  "if_statement", "if_expression", "switch_statement", "switch_expression", "match_statement", "match_expression",
  "conditional_expression", "ternary_expression", "case_statement", "when_expression", "if", "unless", "case",
  "elif_clause", "else_if_clause",
]);

const FUNCTIONS = new Set([
  "function_definition", "function_declaration", "function_item", "method_declaration", "method_definition",
  "constructor_declaration", "method", "singleton_method", "local_function_statement",
]);

const CALLS: Record<string, string> = {
  call_expression: "function",
  call: "function",
  invocation_expression: "function",
  function_call: "name",
  function_call_expression: "function",
  macro_invocation: "macro",
  method_invocation: "name",
  command: "name",
};

const INPUT = new Set([
  "scanf", "getchar", "fgets", "gets", "getline", "cin", "input", "Scanner", "nextInt", "nextLine", "nextDouble",
  "next", "readLine", "readln", "ReadLine", "read_line", "stdin", "Scan", "Scanln", "NewScanner", "NewReader",
  "read", "readlines", "io.read", "STDIN", "fscanf", "BufferedReader", "readLn", "getLine", "getContents",
]);
const OUTPUT = new Set([
  "printf", "puts", "putchar", "cout", "print", "println", "Println", "Printf", "Print", "WriteLine", "Write",
  "echo", "console", "log", "write", "fprintf", "printfn", "say", "display", "disp", "cat", "writeln",
]);

/** Languages whose assignment `x = 1` creates x (so it declares). */
const ASSIGN_DECLARES = new Set(["python", "ruby", "php", "lua", "bash", "javascript", "typescript", "r", "perl"]);

/** Languages the Typo Guard runs for (JavaScript/TypeScript get it from the TypeScript service). */
const TYPO_LANGUAGES = new Set(["c", "cpp", "java", "python", "go", "rust", "csharp", "kotlin", "php", "ruby", "lua", "bash"]);

// ------------------------------------------------------------ edit distance

/** Optimal string alignment distance (Damerau-Levenshtein with adjacent transpositions), capped at max+1. */
export function editDistance(a: string, b: string, max = 2): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  if (a === b) return 0;
  const n = a.length;
  const m = b.length;
  let prev2 = new Array<number>(m + 1).fill(0);
  let prev = Array.from({ length: m + 1 }, (_, j) => j);
  let cur = new Array<number>(m + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    cur[0] = i;
    let rowMin = cur[0];
    for (let j = 1; j <= m; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    [prev2, prev, cur] = [prev, cur, prev2];
  }
  return prev[m];
}

/** How far a name may be from the intended one: 1 edit up to 5 letters, 2 from 6 letters on. */
export function allowedDistance(name: string): number {
  if (name.length <= 2) return 0;
  return name.length <= 5 ? 1 : 2;
}

/** The closest candidate within the allowed distance, preferring earlier candidates on ties. */
export function closest(name: string, candidates: Iterable<string>, caseInsensitive = false): { word: string; distance: number } | null {
  const max = allowedDistance(name);
  if (max === 0) return null;
  const key = caseInsensitive ? name.toLowerCase() : name;
  const lower = name.toLowerCase();
  let best: { word: string; distance: number } | null = null;
  for (const word of candidates) {
    if (word === name) return null;
    if (word.length < 3) continue;
    // Only capitalisation differs: always a typo ("system" -> "System", "Printf" -> "printf").
    if (!caseInsensitive && word.toLowerCase() === lower) return { word, distance: 1 };
    const d = editDistance(key, caseInsensitive ? word.toLowerCase() : word, max);
    if (d === 0) return null;
    if (d <= max && (!best || d < best.distance)) best = { word, distance: d };
  }
  return best;
}

// ------------------------------------------------------------------ walk

interface Frame {
  type: string;
  field: string | null;
  /** This node (and what it contains) declares names. */
  decl: boolean;
  loopDepth: number;
  start: number;
  end: number;
  /** For member-access nodes: the receiver's text. */
  receiver: string | null;
}

interface Ident {
  name: string;
  type: string;
  parent: string;
  field: string | null;
  decl: boolean;
  row: number;
  column: number;
  endRow: number;
  endColumn: number;
  /** For members: the receiver text ("System.out", "std", "math", "nums"...). */
  receiver: string | null;
  inError: boolean;
  inImport: boolean;
  callee: boolean;
}

interface FunctionState {
  name: string;
  line: number;
  loopDepth: number;
  loops: number;
  selfCalls: number;
  baseDepth: number;
}

const edit = (row: number, column: number, endRow: number, endColumn: number, text: string): TextEdit => ({
  startLine: row + 1,
  startColumn: column + 1,
  endLine: endRow + 1,
  endColumn: endColumn + 1,
  text,
});

function problem(
  kind: "typo" | "tip",
  row: number,
  column: number,
  endRow: number,
  endColumn: number,
  message: string,
  fix?: { label: string; edits: TextEdit[]; confidence?: "high" | "medium" },
  severity: "warning" | "info" = kind === "typo" ? "warning" : "info",
): LiveProblem {
  return {
    kind,
    severity,
    message,
    startLine: row + 1,
    startColumn: column + 1,
    endLine: endRow + 1,
    endColumn: endColumn + 1,
    topic: kind === "typo" ? "typo" : "tip",
    fix: fix ? { label: fix.label, edits: fix.edits, confidence: fix.confidence ?? "high" } : undefined,
  };
}

function superscript(n: number): string {
  const digits = "⁰¹²³⁴⁵⁶⁷⁸⁹";
  return String(n)
    .split("")
    .map((d) => digits[Number(d)])
    .join("");
}

function estimate(loopDepth: number, selfCalls: number): { estimate: string; reason: string } {
  if (selfCalls >= 2) return { estimate: "O(2ⁿ)", reason: `calls itself ${selfCalls} times per call` };
  if (selfCalls === 1 && loopDepth === 0) return { estimate: "O(n)", reason: "one recursive call per step" };
  if (selfCalls === 1) return { estimate: `O(n${superscript(loopDepth + 1)})`, reason: "a loop in each recursive step" };
  if (loopDepth === 0) return { estimate: "O(1)", reason: "no loops" };
  if (loopDepth === 1) return { estimate: "O(n)", reason: "one loop" };
  return { estimate: `O(n${superscript(loopDepth)})`, reason: `${loopDepth} nested loops` };
}

/**
 * Walk the tree once, collecting identifiers with their context, symbols
 * and metrics; then run the typo check. Tips need a few node-level looks and
 * are computed by `findTips` from the recorded spots.
 */
export function analyzeInsights(cursor: InsightCursor, source: string, languageId: string, options: { tips?: TipNode | null } = {}): Insights {
  const lines = source.split("\n");
  const idents: Ident[] = [];
  const counts = new Map<string, number>();
  const declared = new Map<string, SymbolKind>();
  const symbols: CodeSymbol[] = [];
  const functions: FunctionMetrics[] = [];
  const fnStack: FunctionState[] = [];
  const stack: Frame[] = [];
  const assignDeclares = ASSIGN_DECLARES.has(languageId);
  let loops = 0;
  let maxLoopDepth = 0;
  let conditionals = 0;
  let readsInput = false;
  let printsOutput = false;
  let errorDepth = 0;
  /** Inside an import/using/package declaration: names there are checked separately (or not at all). */
  let importDepth = 0;
  const importTypos: LiveProblem[] = [];

  const text = (start: number, end: number) => source.slice(start, end);

  const kindFor = (frame: Frame | undefined, grand: Frame | undefined): SymbolKind => {
    const t = frame?.type ?? "";
    const g = grand?.type ?? "";
    if (FUNCTIONS.has(t) || t === "function_declarator" || t === "function_signature" || t === "method_signature" || FUNCTIONS.has(g)) {
      return frame?.field === "parameters" || t.includes("parameter") ? "parameter" : "function";
    }
    if (/class|struct|enum|union|interface|record|trait|type_spec|type_item|type_definition|type_alias/.test(t)) return "class";
    if (t.includes("parameter") || g.includes("parameter")) return "parameter";
    if (t === "field_declaration" || t === "public_field_definition" || t === "field_definition") return "field";
    if (t === "preproc_def" || t === "const_item" || t === "const_spec" || t === "enumerator") return "constant";
    if (t === "aliased_import" || t === "import_specifier") return "module";
    return "variable";
  };

  const enter = (): boolean => {
    const type = cursor.nodeType;
    const field = cursor.currentFieldName;
    const parent = stack[stack.length - 1];
    let decl = false;
    if (parent) {
      if (field && USE_FIELDS.has(field)) decl = false;
      else if (field === "name" && NAME_DECLARES.has(parent.type)) decl = true;
      else if (field && DECL_FIELDS.has(field)) decl = true;
      else if (field === "left" && (LEFT_ALWAYS_DECLARES.has(parent.type) || (assignDeclares && LEFT_DECLARES.has(parent.type)))) decl = true;
      else decl = parent.decl;
    }
    // Keyword tokens share their text with some node types ("for", "if"...): count named nodes only.
    const named = cursor.nodeIsNamed;
    const isLoop = named && LOOPS.has(type);
    const loopDepth = (parent?.loopDepth ?? 0) + (isLoop ? 1 : 0);
    if (isLoop) {
      loops++;
      maxLoopDepth = Math.max(maxLoopDepth, loopDepth);
      const fn = fnStack[fnStack.length - 1];
      if (fn) {
        fn.loops++;
        fn.loopDepth = Math.max(fn.loopDepth, loopDepth - fn.baseDepth);
      }
    }
    if (named && CONDITIONALS.has(type)) conditionals++;
    if (type === "ERROR") errorDepth++;
    if (named && IMPORTS.has(type)) {
      importDepth++;
      if (TYPO_LANGUAGES.has(languageId)) {
        const found = importTypo(type, source.slice(cursor.startIndex, cursor.endIndex), cursor.startPosition.row, cursor.startPosition.column, languageId);
        if (found) importTypos.push(found);
      }
    }
    // Member access: remember the receiver's text for the member identifier below.
    const memberInfo = MEMBER[type];
    const frame: Frame = {
      type,
      field,
      decl,
      loopDepth,
      start: cursor.startIndex,
      end: cursor.endIndex,
      receiver: memberInfo ? receiverOf(cursor, memberInfo.object, source) : null,
    };

    if (IDENT.has(type) && parent) {
      const name = text(cursor.startIndex, cursor.endIndex);
      if (name && name.length < 80 && !/\s/.test(name)) {
        const grand = stack[stack.length - 2];
        let receiver: string | null = null;
        const member = MEMBER[parent.type];
        if (member && field === member.member) receiver = parent.receiver;
        const callField = CALLS[parent.type];
        const callee = !!callField && field === callField;
        idents.push({
          name,
          type,
          parent: parent.type,
          field,
          decl,
          row: cursor.startPosition.row,
          column: cursor.startPosition.column,
          endRow: cursor.endPosition.row,
          endColumn: cursor.endPosition.column,
          receiver,
          inError: errorDepth > 0,
          inImport: importDepth > 0,
          callee,
        });
        if (!decl) counts.set(name, (counts.get(name) ?? 0) + 1);
        if (decl && !declared.has(name)) {
          const kind = kindFor(parent, grand);
          declared.set(name, kind);
          symbols.push({ name, kind, line: cursor.startPosition.row + 1 });
          // A function's name: start tracking its metrics.
          if (kind === "function" && pendingFunction && !pendingFunction.name) {
            pendingFunction.name = name;
            pendingFunction.line = cursor.startPosition.row + 1;
          }
        }
        if (!decl && (INPUT.has(name) || (receiver && INPUT.has(`${receiver}.${name}`)))) readsInput = true;
        if (!decl && OUTPUT.has(name)) printsOutput = true;
        const fn = fnStack[fnStack.length - 1];
        if (fn && callee && fn.name === name) fn.selfCalls++;
        if (fn && member && receiver && field === member.member && fn.name === name && /^(self|this)$/.test(receiver)) fn.selfCalls++;
      }
    }

    if (named && FUNCTIONS.has(type)) {
      pendingFunction = { name: "", line: cursor.startPosition.row + 1, loopDepth: 0, loops: 0, selfCalls: 0, baseDepth: loopDepth };
      fnStack.push(pendingFunction);
      frameFunctions.set(stack.length, pendingFunction);
    }
    stack.push(frame);
    // Do not descend into string/comment contents.
    return !/^(string_content|comment|line_comment|block_comment|escape_sequence|string_fragment|raw_string_literal)$/.test(type);
  };

  const exit = () => {
    const frame = stack.pop();
    if (!frame) return;
    if (frame.type === "ERROR") errorDepth--;
    if (IMPORTS.has(frame.type)) importDepth--;
    const fn = frameFunctions.get(stack.length);
    if (fn) {
      frameFunctions.delete(stack.length);
      fnStack.pop();
      if (fn.name) {
        const e = estimate(fn.loopDepth, fn.selfCalls);
        functions.push({ name: fn.name, line: fn.line, loopDepth: fn.loopDepth, loops: fn.loops, selfCalls: fn.selfCalls, ...e });
      }
      pendingFunction = fnStack[fnStack.length - 1] ?? null;
    }
  };

  const frameFunctions = new Map<number, FunctionState>();
  let pendingFunction: FunctionState | null = null;

  let descend = enter();
  for (;;) {
    if (descend && cursor.gotoFirstChild()) {
      descend = enter();
      continue;
    }
    exit();
    let moved = false;
    while (!(moved = cursor.gotoNextSibling())) {
      if (!cursor.gotoParent()) break;
      exit();
    }
    if (!moved) break;
    descend = enter();
  }

  functions.sort((a, b) => a.line - b.line);
  const metrics: CodeMetrics = { lines: lines.length, functions, loops, maxLoopDepth, conditionals, readsInput, printsOutput };
  const typos = TYPO_LANGUAGES.has(languageId) ? [...importTypos, ...findTypos(idents, counts, declared, languageId, source)].slice(0, 6) : [];
  const tips = options.tips ? findTips(options.tips, source, languageId, declared) : [];
  return { typos, tips, symbols, metrics };
}

/** The receiver of a member access, as text (only short, simple receivers). */
function receiverOf(cursor: InsightCursor, fields: string[], source: string): string | null {
  // The object comes first among the children: walk them to find it.
  if (!cursor.gotoFirstChild()) return null;
  let found: string | null = null;
  do {
    const f = cursor.currentFieldName;
    if (f && fields.includes(f)) {
      const t = source.slice(cursor.startIndex, cursor.endIndex);
      if (t.length <= 40 && /^[A-Za-z_$@][\w$.:]*$/.test(t.replace(/::/g, ".").replace(/->/g, "."))) found = t.replace(/->/g, ".");
      break;
    }
  } while (cursor.gotoNextSibling());
  cursor.gotoParent();
  return found;
}

// ------------------------------------------------------------------ typos

/** Declarations that name modules, packages or headers. */
const IMPORTS = new Set([
  "preproc_include", "using_directive", "import_declaration", "package_declaration", "namespace_declaration",
  "file_scoped_namespace_declaration", "import_statement", "import_from_statement", "use_declaration",
  "import_header", "package_header", "namespace_use_declaration", "import_spec", "package_clause",
  "future_import_statement", "import_list",
]);

/** Well-known third-party Python modules: never typos, and good suggestions. */
const PY_MODULES = ["numpy", "pandas", "matplotlib", "scipy", "sklearn", "requests", "flask", "django", "tkinter", "turtle", "pygame", "seaborn", "sympy", "PIL"];

/** A misspelt header (#include <stdoi.h>), Python module (import maths) or Java class (import java.util.Scaner). */
function importTypo(type: string, text: string, row: number, column: number, languageId: string): LiveProblem | null {
  const spec = knownNames(languageId);
  if (!spec) return null;
  const at = (offset: number, length: number, replacement: string, what: string, wrong: string) => {
    // Position of `offset` inside `text`, which starts at (row, column).
    const before = text.slice(0, offset);
    const nl = before.lastIndexOf("\n");
    const r = row + (before.match(/\n/g)?.length ?? 0);
    const c = nl >= 0 ? offset - nl - 1 : column + offset;
    return problem("typo", r, c, r, c + length, `Possible typo: there is no ${what} "${wrong}". Did you mean "${replacement}"?`, {
      label: `Change to ${replacement}`,
      edits: [edit(r, c, r, c + length, replacement)],
    });
  };
  if (type === "preproc_include" && (languageId === "c" || languageId === "cpp")) {
    const m = /#\s*include\s*[<"]([^>"]+)[>"]/.exec(text);
    if (!m) return null;
    const header = m[1];
    const imports = importsFor(languageId);
    if (imports.includes(header) || header.includes("/") && !header.startsWith("bits/")) return null;
    if (header === "conio.h") return null; // reported as a tip instead
    const best = closest(header, imports);
    return best ? at(m.index + m[0].indexOf(header), header.length, best.word, "standard header", header) : null;
  }
  if (languageId === "python" && (type === "import_statement" || type === "import_from_statement")) {
    const m = type === "import_statement" ? /^import\s+([A-Za-z_]\w*)/.exec(text) : /^from\s+([A-Za-z_]\w*)/.exec(text);
    if (!m) return null;
    const module = m[1];
    const imports = [...importsFor("python"), ...PY_MODULES];
    if (imports.includes(module)) return null;
    const best = closest(module, imports);
    return best ? at(text.indexOf(module, m.index + m[0].length - module.length), module.length, best.word, "module", module) : null;
  }
  if (languageId === "java" && type === "import_declaration") {
    const m = /^import\s+(?:static\s+)?([\w.]+)\s*;/.exec(text);
    if (!m) return null;
    const parts = m[1].split(".");
    const last = parts[parts.length - 1];
    if (!/^[A-Z]/.test(last) || spec.global.has(last)) return null;
    const best = closest(last, TYPES_OF(languageId));
    return best ? at(text.indexOf(last, m.index + m[0].length - last.length - 1), last.length, best.word, "class", last) : null;
  }
  return null;
}

const importsFor = (languageId: string): string[] => specFor(languageId)?.imports ?? [];
const TYPES_OF = (languageId: string): string[] => specFor(languageId)?.types ?? [];

const SKIP_PARENTS = new Set([
  "keyword_argument", "pair", "field_designator", "labeled_statement", "statement_identifier", "goto_statement",
  "decorator", "attribute_item", "annotation", "marker_annotation", "preproc_arg", "preproc_call", "heredoc_body",
  "string", "interpreted_string_literal", "shorthand_property_identifier_pattern", "named_argument",
  "value_argument", "argument_list_named",
]);

function findTypos(idents: Ident[], counts: Map<string, number>, declared: Map<string, SymbolKind>, languageId: string, source: string): LiveProblem[] {
  const known = knownNames(languageId);
  if (!known) return [];
  const norm = (s: string) => (known.caseInsensitive ? s.toLowerCase() : s);
  const declaredNames = [...declared.keys()];
  const out: LiveProblem[] = [];
  const seen = new Set<string>();
  for (const id of idents) {
    if (id.decl || id.inImport || SKIP_PARENTS.has(id.parent)) continue;
    // Ruby method names may end with ! or ? (sort_by!, empty?).
    const name = id.name.replace(/[!?]$/, "");
    if (name.length < 3 || /^[_$]/.test(name) || /^\d/.test(name)) continue;
    if ((counts.get(name) ?? 0) > 2) continue;
    if (declared.has(name)) continue;
    const key = `${id.row}:${id.column}`;
    if (seen.has(key)) continue;

    let suggestion: { word: string; distance: number } | null = null;
    let what = "";
    if (id.receiver !== null) {
      // A member: check against what KAIRO knows about the receiver.
      const set = memberSet(known, id.receiver);
      if (!set) {
        // Unknown receiver: only everyday methods (append, length...) and the file's own fields.
        if (known.anyMember.has(norm(name)) || known.global.has(norm(name))) continue;
        const star = known.members.get("*");
        if (!star || star.size === 0) continue;
        suggestion = closest(name, [...declaredNames, ...star], known.caseInsensitive);
        what = "method or field";
      } else {
        if (set.has(norm(name))) continue;
        suggestion = closest(name, set, known.caseInsensitive);
        what = `member of ${id.receiver}`;
      }
    } else {
      if (known.global.has(norm(name)) || known.anyMember.has(norm(name))) continue;
      suggestion = closest(name, [...declaredNames, ...known.suggestions], known.caseInsensitive);
      what = declared.has(suggestion?.word ?? "") ? "name in this file" : "name";
    }
    if (!suggestion) continue;
    // "the" -> "then" style near-misses on common short words are too noisy: for three-letter
    // names outside a known receiver, only same-length suggestions count.
    if (name.length === 3 && suggestion.word.length !== 3 && !(id.receiver !== null && memberSet(known, id.receiver))) continue;
    seen.add(key);
    const fixText = matchCase(name, suggestion.word, known.caseInsensitive);
    out.push(
      problem(
        "typo",
        id.row,
        id.column,
        id.endRow,
        id.endColumn,
        `Possible typo: "${id.name}" is not defined. Did you mean "${fixText}"? (a ${what})`,
        { label: `Change to ${fixText}`, edits: [edit(id.row, id.column, id.endRow, id.endColumn, fixText)] },
      ),
    );
    if (out.length >= 6) break;
  }
  void source;
  return out;
}

function memberSet(known: KnownNames, receiver: string): Set<string> | null {
  const direct = known.members.get(receiver);
  if (direct && receiver !== "*") return direct;
  // "java.lang.System.out" / "self.items": try the last one or two parts.
  const parts = receiver.split(/\.|::/);
  for (let i = 1; i < parts.length; i++) {
    const tail = parts.slice(i).join(".");
    const set = known.members.get(tail);
    if (set) return set;
  }
  return null;
}

/** Keep the student's style for case-insensitive languages (WRITELN -> WRITELN). */
function matchCase(original: string, word: string, caseInsensitive: boolean): string {
  if (!caseInsensitive) return word;
  if (original === original.toUpperCase()) return word.toUpperCase();
  if (original === original.toLowerCase()) return word.toLowerCase();
  return word;
}

// ------------------------------------------------------------------- tips

/** The subset of web-tree-sitter's Node API the tips use. */
export interface TipNode {
  type: string;
  text: string;
  startIndex: number;
  endIndex: number;
  startPosition: { row: number; column: number };
  endPosition: { row: number; column: number };
  childCount: number;
  namedChildCount: number;
  child(i: number): TipNode | null;
  namedChild(i: number): TipNode | null;
  childForFieldName(name: string): TipNode | null;
  descendantsOfType(types: string | string[]): (TipNode | null)[];
  parent: TipNode | null;
}

const C_LIKE = new Set(["c", "cpp", "java", "csharp", "javascript", "typescript", "php", "kotlin"]);
const INT_DIVISION = new Set(["c", "cpp", "java", "csharp", "go", "rust", "kotlin"]);

function nodesOf(root: TipNode, types: string[]): TipNode[] {
  return root.descendantsOfType(types).filter((n): n is TipNode => n !== null);
}

const at = (n: TipNode) => [n.startPosition.row, n.startPosition.column, n.endPosition.row, n.endPosition.column] as const;

/** Beginner slips that still compile, as info-level tips with a fix where the repair is unambiguous. */
export function findTips(root: TipNode, source: string, languageId: string, declared: Map<string, SymbolKind> = new Map()): LiveProblem[] {
  const tips: LiveProblem[] = [];
  // One tip per spot: the first rule that fires there explains it best (e.g. scanf without &
  // before "used before it has a value", which is its consequence).
  const push = (p: LiveProblem) => {
    if (tips.length < 8 && !tips.some((t) => (t.startLine === p.startLine && t.startColumn === p.startColumn) || (t.startLine === p.startLine && t.message === p.message))) tips.push(p);
  };
  if (C_LIKE.has(languageId) || languageId === "go" || languageId === "rust") strayBody(root, push);
  if (C_LIKE.has(languageId)) assignmentInCondition(root, push);
  if (INT_DIVISION.has(languageId)) integerDivision(root, push);
  if (languageId === "c" || languageId === "cpp") {
    scanfAddress(root, source, push);
    arrayBounds(root, push);
    usedBeforeSet(root, push);
    getsCall(root, push);
    turboC(root, push);
  }
  if (languageId === "java") javaStringCompare(root, push, declared);
  if (languageId === "python") pythonInputArithmetic(root, push);
  loopNeverChanges(root, languageId, push);
  return tips.sort((a, b) => a.startLine - b.startLine || a.startColumn - b.startColumn);
}

type Push = (p: LiveProblem) => void;

/** `for (...);` / `while (...);` / `if (...);` — the ';' is the whole body. */
function strayBody(root: TipNode, push: Push) {
  for (const n of nodesOf(root, ["for_statement", "while_statement", "if_statement"])) {
    const body = n.childForFieldName("body") ?? n.childForFieldName("consequence");
    if (!body) continue;
    const empty = body.type === "empty_statement" || (body.type === "expression_statement" && body.text.trim() === ";");
    if (!empty) continue;
    const [r, c, er, ec] = at(body);
    const kind = n.type === "if_statement" ? "if" : n.type === "for_statement" ? "for" : "while";
    push(
      problem(
        "tip",
        r,
        c,
        er,
        ec,
        kind === "if"
          ? "This ';' right after if (...) is the whole if-body, so the block below always runs."
          : `This ';' right after ${kind} (...) is the whole loop body, so the block below runs only once, after the loop.`,
        { label: "Remove the ';'", edits: [edit(r, c, er, ec, "")] },
        "warning",
      ),
    );
  }
}

/** `if (x = 5)` — an assignment where a comparison was probably meant. */
function assignmentInCondition(root: TipNode, push: Push) {
  for (const n of nodesOf(root, ["if_statement", "while_statement"])) {
    let cond = n.childForFieldName("condition");
    if (!cond) continue;
    if (cond.type === "parenthesized_expression" || cond.type === "condition_clause") cond = cond.namedChild(0) ?? cond;
    if (cond.type !== "assignment_expression") continue;
    const left = cond.childForFieldName("left");
    const right = cond.childForFieldName("right");
    if (!left || !right) continue;
    // Find the '=' between them.
    const [r, c] = [left.endPosition.row, left.endPosition.column];
    const opStart = cond.text.indexOf("=", left.endIndex - cond.startIndex);
    if (opStart < 0) continue;
    const eqRow = cond.startPosition.row + (cond.text.slice(0, opStart).match(/\n/g)?.length ?? 0);
    const lastNl = cond.text.lastIndexOf("\n", opStart);
    const eqCol = lastNl >= 0 ? opStart - lastNl - 1 : cond.startPosition.column + opStart;
    void r;
    void c;
    push(
      problem(
        "tip",
        eqRow,
        eqCol,
        eqRow,
        eqCol + 1,
        `"${left.text} = ${right.text}" assigns inside the condition. To compare, write "==".`,
        { label: "Use == to compare", edits: [edit(eqRow, eqCol, eqRow, eqCol + 1, "==")] },
        "warning",
      ),
    );
  }
}

/** `1 / 2` with two integer literals is integer division (0). */
function integerDivision(root: TipNode, push: Push) {
  for (const n of nodesOf(root, ["binary_expression"])) {
    const op = n.childForFieldName("operator");
    if (op?.text !== "/") continue;
    const left = n.childForFieldName("left");
    const right = n.childForFieldName("right");
    if (!left || !right) continue;
    const isInt = (x: TipNode) => /^(number_literal|integer_literal|decimal_integer_literal|int_literal|integer)$/.test(x.type) && /^\d+$/.test(x.text);
    if (!isInt(left) || !isInt(right)) continue;
    const a = Number(left.text);
    const b = Number(right.text);
    if (b === 0) {
      const [r, c, er, ec] = at(n);
      push(problem("tip", r, c, er, ec, `Division by zero: ${n.text} stops the program (or gives an error) when it runs.`, undefined, "warning"));
      continue;
    }
    if (a % b === 0) continue;
    const [r, c, er, ec] = at(left);
    push(
      problem(
        "tip",
        r,
        c,
        er,
        ec,
        `${left.text} / ${right.text} divides two whole numbers, so the result is ${Math.trunc(a / b)}, not ${a / b}. Write ${left.text}.0 / ${right.text} for a decimal result.`,
        { label: `Write ${left.text}.0`, edits: [edit(r, c, er, ec, `${left.text}.0`)] },
      ),
    );
  }
}

/** scanf("%d", x) without '&' on a plain variable. */
function scanfAddress(root: TipNode, source: string, push: Push) {
  const declarations = new Map<string, string>(); // name -> declarator type
  for (const d of nodesOf(root, ["declaration", "parameter_declaration"])) {
    for (let i = 0; i < d.namedChildCount; i++) {
      let child = d.namedChild(i);
      if (!child) continue;
      if (child.type === "init_declarator") child = child.childForFieldName("declarator") ?? child;
      const name = child.type === "identifier" ? child.text : child.childForFieldName("declarator")?.text;
      if (name && /^[A-Za-z_]\w*$/.test(name)) declarations.set(name, child.type);
    }
  }
  for (const call of nodesOf(root, ["call_expression"])) {
    const fn = call.childForFieldName("function")?.text;
    if (fn !== "scanf" && fn !== "fscanf" && fn !== "sscanf") continue;
    const args = call.childForFieldName("arguments");
    if (!args) continue;
    const list: TipNode[] = [];
    for (let i = 0; i < args.namedChildCount; i++) {
      const a = args.namedChild(i);
      if (a && a.type !== "comment") list.push(a);
    }
    const first = fn === "scanf" ? 1 : 2;
    const format = list[first - 1]?.text ?? "";
    for (const arg of list.slice(first)) {
      if (arg.type !== "identifier") continue;
      const declType = declarations.get(arg.text);
      // Arrays and pointers are already addresses; %s with a char array needs no '&'.
      if (!declType || declType !== "identifier") continue;
      if (/%s/.test(format) && list.length === first + 1) continue;
      const [r, c] = at(arg);
      push(
        problem(
          "tip",
          r,
          c,
          r,
          c + arg.text.length,
          `${fn} needs the address of "${arg.text}" to store the value there: write &${arg.text}. Without it the program usually crashes.`,
          { label: `Add & before ${arg.text}`, edits: [edit(r, c, r, c, "&")] },
          "warning",
        ),
      );
    }
  }
  void source;
}

/** int a[5]; ... a[5] or for (i = 0; i <= 5; i++) a[i] — one past the end. */
function arrayBounds(root: TipNode, push: Push) {
  const sizes = new Map<string, number>();
  for (const d of nodesOf(root, ["array_declarator"])) {
    const name = d.childForFieldName("declarator")?.text;
    const size = d.childForFieldName("size")?.text;
    if (name && size && /^\d+$/.test(size)) sizes.set(name, Number(size));
  }
  if (sizes.size === 0) return;
  for (const s of nodesOf(root, ["subscript_expression"])) {
    const name = s.childForFieldName("argument")?.text;
    const index = s.childForFieldName("index") ?? s.childForFieldName("indices")?.namedChild(0) ?? null;
    if (!name || !index || !sizes.has(name)) continue;
    const size = sizes.get(name)!;
    if (/^\d+$/.test(index.text) && Number(index.text) >= size) {
      const [r, c, er, ec] = at(index);
      push(problem("tip", r, c, er, ec, `${name} has ${size} elements (indexes 0 to ${size - 1}), so ${name}[${index.text}] is outside the array.`, undefined, "warning"));
    }
  }
  for (const loop of nodesOf(root, ["for_statement"])) {
    const cond = loop.childForFieldName("condition");
    if (!cond || cond.type !== "binary_expression") continue;
    const op = cond.childForFieldName("operator")?.text;
    const v = cond.childForFieldName("left")?.text;
    const limit = cond.childForFieldName("right")?.text;
    if (op !== "<=" || !v || !limit || !/^\d+$/.test(limit)) continue;
    const body = loop.childForFieldName("body");
    if (!body) continue;
    for (const s of nodesOf(body, ["subscript_expression"])) {
      const name = s.childForFieldName("argument")?.text;
      const index = s.childForFieldName("index") ?? s.childForFieldName("indices")?.namedChild(0) ?? null;
      if (!name || index?.text !== v || sizes.get(name) !== Number(limit)) continue;
      const opNode = cond.childForFieldName("operator")!;
      const [r, c, er, ec] = at(opNode);
      push(
        problem(
          "tip",
          r,
          c,
          er,
          ec,
          `The loop runs while ${v} <= ${limit}, so the last pass reads ${name}[${limit}], one past the end (${name} has ${limit} elements). Use < ${limit}.`,
          { label: "Use <", edits: [edit(r, c, er, ec, "<")] },
          "warning",
        ),
      );
      break;
    }
  }
}

/** int sum; sum += x; — read before it has a value. */
function usedBeforeSet(root: TipNode, push: Push) {
  for (const fn of nodesOf(root, ["function_definition"])) {
    const body = fn.childForFieldName("body");
    if (!body) continue;
    for (let i = 0; i < body.namedChildCount; i++) {
      const decl = body.namedChild(i);
      if (decl?.type !== "declaration") continue;
      const type = decl.childForFieldName("type")?.text ?? "";
      if (!/^(int|long|float|double|char|short|unsigned|long long)$/.test(type)) continue;
      for (let k = 0; k < decl.namedChildCount; k++) {
        const d = decl.namedChild(k);
        if (d?.type !== "identifier") continue; // has no initializer
        const name = d.text;
        // Look at the next statements in the same block for the first use.
        const first = firstUse(body, i + 1, name);
        if (first && first.kind === "read") {
          const [r, c, er, ec] = at(first.node);
          push(
            problem(
              "tip",
              r,
              c,
              er,
              ec,
              `"${name}" is used here before it has a value (it was declared without one), so it holds garbage. Give it a start value, e.g. ${type} ${name} = 0;`,
              { label: `Start ${name} at 0`, edits: [edit(d.startPosition.row, d.startPosition.column, d.endPosition.row, d.endPosition.column, `${name} = 0`)], confidence: "medium" },
              "warning",
            ),
          );
        }
      }
    }
  }
}

function firstUse(block: TipNode, from: number, name: string): { kind: "read" | "write"; node: TipNode } | null {
  for (let i = from; i < block.namedChildCount; i++) {
    const stmt = block.namedChild(i);
    if (!stmt) continue;
    // Any control flow (loops, ifs, calls with &name) makes this unclear: stop.
    if (!/^(expression_statement|declaration|return_statement)$/.test(stmt.type)) {
      if (stmt.text.includes(name)) return null;
      continue;
    }
    const ids = nodesOf(stmt, ["identifier"]).filter((n) => n.text === name);
    if (ids.length === 0) continue;
    const id = ids[0];
    const parent = id.parent;
    if (parent?.type === "assignment_expression" && parent.childForFieldName("left") === id) {
      const op = parent.childForFieldName("operator")?.text ?? "=";
      return op === "=" ? { kind: "write", node: id } : { kind: "read", node: id };
    }
    if (parent?.type === "assignment_expression" && parent.childForFieldName("left")?.startIndex === id.startIndex) {
      const op = parent.childForFieldName("operator")?.text ?? "=";
      return op === "=" ? { kind: "write", node: id } : { kind: "read", node: id };
    }
    if (parent?.type === "pointer_expression" || parent?.type === "update_expression") {
      return parent.type === "pointer_expression" ? { kind: "write", node: id } : { kind: "read", node: id };
    }
    return { kind: "read", node: id };
  }
  return null;
}

/** Turbo C habits that GCC rejects: <conio.h>, getch(), clrscr(), void main(). */
function turboC(root: TipNode, push: Push) {
  for (const inc of nodesOf(root, ["preproc_include"])) {
    const path = inc.childForFieldName("path");
    if (path?.text !== "<conio.h>") continue;
    const [r, c, er, ec] = at(path);
    push(
      problem(
        "tip",
        r,
        c,
        er,
        ec,
        "conio.h comes from Turbo C on Windows; GCC (which KAIRO uses) does not have it. Remove it, use getchar() instead of getch(), and drop clrscr().",
        { label: "Remove #include <conio.h>", edits: [edit(inc.startPosition.row, 0, inc.startPosition.row + 1, 0, "")], confidence: "medium" },
        "warning",
      ),
    );
  }
  for (const call of nodesOf(root, ["call_expression"])) {
    const fn = call.childForFieldName("function");
    if (fn?.text !== "getch" && fn?.text !== "clrscr" && fn?.text !== "getche") continue;
    const [r, c, er, ec] = at(fn);
    if (fn.text === "clrscr") {
      push(problem("tip", r, c, er, ec, "clrscr() is Turbo C only and does not exist with GCC. Remove this line (the output panel starts empty anyway).", undefined, "warning"));
    } else {
      push(
        problem("tip", r, c, er, ec, `${fn.text}() is Turbo C only. With GCC, use getchar() to read a character.`, {
          label: "Use getchar()",
          edits: [edit(r, c, er, ec, "getchar")],
        }, "warning"),
      );
    }
  }
  for (const fn of nodesOf(root, ["function_definition"])) {
    const type = fn.childForFieldName("type");
    const declarator = fn.childForFieldName("declarator");
    const name = declarator?.childForFieldName("declarator")?.text;
    if (name !== "main" || type?.text !== "void") continue;
    const [r, c, er, ec] = at(type);
    push(
      problem("tip", r, c, er, ec, "main should return int (the program's exit status): write int main(void) and end it with return 0;.", {
        label: "Make main return int",
        edits: [edit(r, c, er, ec, "int")],
      }, "warning"),
    );
  }
}

function getsCall(root: TipNode, push: Push) {
  for (const call of nodesOf(root, ["call_expression"])) {
    const fn = call.childForFieldName("function");
    if (fn?.text !== "gets") continue;
    const [r, c, er, ec] = at(fn);
    push(problem("tip", r, c, er, ec, "gets() was removed from C because it can overflow the buffer. Use fgets(buffer, sizeof buffer, stdin).", undefined, "warning"));
  }
}

/** Java: comparing strings with == compares references, not text. */
function javaStringCompare(root: TipNode, push: Push, declared: Map<string, SymbolKind>) {
  const strings = new Set<string>();
  for (const d of nodesOf(root, ["local_variable_declaration", "field_declaration", "formal_parameter"])) {
    if (d.childForFieldName("type")?.text !== "String") continue;
    for (const v of nodesOf(d, ["variable_declarator"])) {
      const name = v.childForFieldName("name")?.text;
      if (name) strings.add(name);
    }
    const name = d.childForFieldName("name")?.text;
    if (name) strings.add(name);
  }
  for (const b of nodesOf(root, ["binary_expression"])) {
    const op = b.childForFieldName("operator")?.text;
    if (op !== "==" && op !== "!=") continue;
    const left = b.childForFieldName("left");
    const right = b.childForFieldName("right");
    if (!left || !right) continue;
    const isString = (n: TipNode) => n.type === "string_literal" || (n.type === "identifier" && strings.has(n.text));
    if (!isString(left) && !isString(right)) continue;
    if (left.type === "null_literal" || right.type === "null_literal") continue;
    const [r, c, er, ec] = at(b);
    const replacement = `${op === "!=" ? "!" : ""}${left.type === "string_literal" && right.type !== "string_literal" ? right.text : left.text}.equals(${left.type === "string_literal" && right.type !== "string_literal" ? left.text : right.text})`;
    push(
      problem(
        "tip",
        r,
        c,
        er,
        ec,
        `${op} on Strings checks whether both are the same object, not the same text. Use .equals(...) to compare the text.`,
        { label: "Use .equals()", edits: [edit(r, c, er, ec, replacement)] },
        "warning",
      ),
    );
  }
  void declared;
}

/** Python: x = input() then x + 1 — input() returns text. */
function pythonInputArithmetic(root: TipNode, push: Push) {
  const fromInput = new Map<string, TipNode>();
  for (const a of nodesOf(root, ["assignment"])) {
    const left = a.childForFieldName("left");
    const right = a.childForFieldName("right");
    if (left?.type !== "identifier" || right?.type !== "call") continue;
    if (right.childForFieldName("function")?.text === "input") fromInput.set(left.text, right);
    else fromInput.delete(left.text);
  }
  if (fromInput.size === 0) return;
  for (const b of nodesOf(root, ["binary_operator", "comparison_operator"])) {
    const left = b.childForFieldName("left") ?? b.namedChild(0);
    const right = b.childForFieldName("right") ?? b.namedChild(1);
    if (!left || !right) continue;
    const pairs: [TipNode, TipNode][] = [
      [left, right],
      [right, left],
    ];
    for (const [v, other] of pairs) {
      if (v.type !== "identifier" || !fromInput.has(v.text)) continue;
      if (!/^(integer|float)$/.test(other.type)) continue;
      const call = fromInput.get(v.text)!;
      const [r, c, er, ec] = at(call);
      push(
        problem(
          "tip",
          r,
          c,
          er,
          ec,
          `input() always gives text, so "${v.text}" is a str and ${b.text} will fail. Convert it: int(input()).`,
          { label: "Wrap in int(...)", edits: [edit(r, c, er, ec, `int(${call.text})`)] },
          "warning",
        ),
      );
      fromInput.delete(v.text);
      break;
    }
  }
}

/** while (i < n) { ... } where i never changes inside: may run forever. */
function loopNeverChanges(root: TipNode, languageId: string, push: Push) {
  for (const loop of nodesOf(root, ["while_statement"])) {
    let cond = loop.childForFieldName("condition");
    const body = loop.childForFieldName("body");
    if (!cond || !body) continue;
    if (cond.type === "parenthesized_expression") cond = cond.namedChild(0) ?? cond;
    if (!/^(binary_expression|comparison_operator)$/.test(cond.type)) continue;
    const vars = nodesOf(cond, ["identifier"]).map((n) => n.text);
    if (vars.length === 0 || vars.length !== new Set(vars).size || /\(|\[|\./.test(cond.text)) continue;
    const bodyText = body.text;
    if (/\b(break|return|exit|goto|throw|raise)\b/.test(bodyText)) continue;
    const changes = vars.some((v) => {
      const esc = v.replace(/[$]/g, "\\$");
      return new RegExp(`(\\b${esc}\\s*(=[^=]|\\+=|-=|\\*=|/=|%=|\\+\\+|--|<<=|>>=))|((\\+\\+|--)\\s*${esc}\\b)|&\\s*${esc}\\b|\\b${esc}\\s*=\\s*|\\bfor\\s+${esc}\\b|scanf|\\bcin\\b|input\\(|next\\w*\\(|read\\w*\\(`).test(bodyText);
    });
    if (changes) continue;
    const [r, c, er, ec] = at(cond);
    push(
      problem(
        "tip",
        r,
        c,
        er,
        ec,
        `Nothing inside this loop changes ${vars.map((v) => `"${v}"`).join(" or ")}, so if the condition is true once it stays true: the loop may run forever.`,
        undefined,
        "warning",
      ),
    );
  }
  void languageId;
}
