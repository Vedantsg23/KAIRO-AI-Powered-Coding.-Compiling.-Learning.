/**
 * Turn a Tree-sitter syntax tree into a short list of live syntax problems.
 *
 * Tree-sitter recovers from errors by inserting MISSING nodes (a token it
 * expected, e.g. ';') or wrapping text it could not fit into ERROR nodes.
 * This finds the outermost ERROR nodes and the MISSING nodes outside them,
 * in source order, and describes each in plain words. Positions are 1-based;
 * columns count UTF-16 code units (Tree-sitter's JavaScript binding already
 * reports them that way), which is what the editor uses.
 *
 * For Python it adds what the grammar accepts but Python 3 rejects: block
 * headers without ':', blocks without an indented body, CPython's
 * indentation rules and Python 2 statements such as print "x".
 *
 * This is a syntax check only: it cannot see types, undeclared names or
 * anything else a compiler checks. The UI labels it accordingly.
 */

/** The subset of web-tree-sitter's Node API this module needs (keeps it testable). */
export interface SyntaxNode {
  type: string;
  isError: boolean;
  isMissing: boolean;
  hasError: boolean;
  text: string;
  startPosition: { row: number; column: number };
  endPosition: { row: number; column: number };
  childCount: number;
  child(index: number): SyntaxNode | null;
  parent: SyntaxNode | null;
  descendantsOfType(types: string | string[]): SyntaxNode[];
}

/**
 * What a problem is about, so the UI can explain why it matters and which
 * concept it belongs to (fixed, human-written texts in live/topics.ts).
 */
export type LiveTopic =
  | "semicolon"
  | "colon"
  | "bracket"
  | "comparison"
  | "elif"
  | "indent"
  | "block"
  | "incomplete"
  | "print"
  | "missing"
  | "syntax"
  /** A name one or two keystrokes away from a known one (live/insights.ts). */
  | "typo"
  /** A beginner slip that still compiles (live/insights.ts). */
  | "tip";

/**
 * A deterministic quick fix: a rule-based text change for slips whose repair
 * is unambiguous (a missing ';', ':' or ')', '=' in a condition, 'else if'
 * in Python...). Never applied without the student's click.
 */
export interface LiveFix {
  label: string;
  edits: TextEdit[];
  /** "high": the edit is exactly what the rule describes; "medium": a likely spot (e.g. where to close a bracket). */
  confidence: "high" | "medium";
}

export interface LiveProblem {
  /** missing/unexpected: syntax errors; typo: Typo Guard; tip: Saarthi tips (both from live/insights.ts). */
  kind: "missing" | "unexpected" | "typo" | "tip";
  /** Syntax problems are errors; typos warnings; tips warnings or info. Missing means "error". */
  severity?: "error" | "warning" | "info";
  message: string;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
  topic?: LiveTopic;
  fix?: LiveFix;
  /** "service": reported by a Monaco language service (TypeScript, HTML, CSS); already a marker in the editor. */
  origin?: "service";
}

import type { TextEdit } from "../lib/edits";

export const MAX_PROBLEMS = 8;

/** An edit that inserts `text` before the 0-based (row, column). */
function insertAt(row: number, column: number, text: string): TextEdit {
  return { startLine: row + 1, startColumn: column + 1, endLine: row + 1, endColumn: column + 1, text };
}

function withTopic(problem: LiveProblem, topic: LiveTopic, fix?: LiveFix): LiveProblem {
  return fix ? { ...problem, topic, fix } : { ...problem, topic };
}

export interface AnalyzeOptions {
  /** The language ends statements with ';' (C, Java, C#, JavaScript, PHP, Rust...). */
  semicolons?: boolean;
  /**
   * Python rules on top of the grammar: block headers end with ':', a block
   * needs an indented body, and Python 2 statements (print "x") are errors
   * in the Python 3 the sandbox runs, although the grammar accepts them.
   */
  python?: boolean;
  /** Language id, for the keyword-block rules of Ruby, Lua and Bash (then/do/end/fi/done). */
  language?: string;
  max?: number;
}

export function findProblems(root: SyntaxNode, source: string, options: AnalyzeOptions = {}): LiveProblem[] {
  const max = options.max ?? MAX_PROBLEMS;
  const lines = source.split("\n");
  const problems: LiveProblem[] = [];
  const visit = (node: SyntaxNode) => {
    if (problems.length >= max) return;
    if (node.isMissing) {
      problems.push(missingProblem(node, lines, options));
      return;
    }
    if (node.isError) {
      problems.push(errorProblem(node, lines, options));
      return; // nested errors inside are usually echoes of this one
    }
    if (!node.hasError) return;
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child) visit(child);
    }
  };
  if (root.hasError) visit(root);
  if (options.python) {
    // Extra Python checks, unless the grammar already flagged that line.
    const flagged = new Set(problems.map((p) => p.startLine));
    for (const extra of [...pythonProblems(root, lines), ...pythonIndentation(lines)]) {
      if (!flagged.has(extra.startLine)) {
        problems.push(extra);
        flagged.add(extra.startLine);
      }
    }
  }
  problems.sort((a, b) => a.startLine - b.startLine || a.startColumn - b.startColumn);
  return problems.slice(0, max);
}

// ------------------------------------------------------------------ Python

const PY_BLOCK_KEYWORDS = new Set(["if", "elif", "else", "for", "while", "def", "class", "try", "except", "finally", "with"]);

const PY2_STATEMENTS: Record<string, string> = {
  print_statement: "In Python 3, print is a function: write print(...) with parentheses",
  exec_statement: "In Python 3, exec is a function: write exec(...) with parentheses",
};

interface LogicalLine {
  row: number;
  /** Indentation with tabs to the next multiple of 8, and with a tab counted as 1 (CPython compares both). */
  col: number;
  alt: number;
  /** Length of the indentation in characters. */
  indent: number;
  /** The line (or its last continuation line) ends with ':' outside strings and comments. */
  opensBlock: boolean;
}

/**
 * Python's indentation rules, which the Tree-sitter grammar does not
 * enforce: "unexpected indent", "unindent does not match any outer
 * indentation level" and mixed tabs and spaces. Follows CPython's tokenizer:
 * only lines that start a statement count (not blank or comment-only lines,
 * not lines inside brackets, strings or after a backslash).
 */
function pythonIndentation(lines: string[]): LiveProblem[] {
  const problems: LiveProblem[] = [];
  const stack = [{ col: 0, alt: 0 }];
  let expectIndent = false;
  for (const line of logicalLines(lines)) {
    const text = (lines[line.row] ?? "").replace(/\r$/, "");
    const word = /^\S+/.exec(text.slice(line.indent))?.[0].length ?? 1;
    const problem = (message: string): LiveProblem => ({
      kind: "unexpected",
      message,
      startLine: line.row + 1,
      startColumn: line.indent + 1,
      endLine: line.row + 1,
      endColumn: line.indent + 1 + word,
      topic: "indent",
    });
    const top = stack[stack.length - 1];
    if (line.col > top.col) {
      if (line.alt <= top.alt) problems.push(problem(MIXED_INDENT));
      else if (!expectIndent) problems.push(problem("Unexpected indent: this line is indented, but the line before does not end with ':'"));
      stack.push({ col: line.col, alt: line.alt });
    } else {
      while (stack.length > 1 && line.col < stack[stack.length - 1].col) stack.pop();
      const outer = stack[stack.length - 1];
      if (line.col !== outer.col) {
        problems.push(problem("This line's indentation does not match any block above it: line it up with the lines it belongs with"));
        stack.push({ col: line.col, alt: line.alt }); // continue from here instead of repeating the error
      } else if (line.alt !== outer.alt) {
        problems.push(problem(MIXED_INDENT));
      }
    }
    expectIndent = line.opensBlock;
  }
  return problems;
}

const MIXED_INDENT = "Tabs and spaces are mixed in this indentation: use spaces only (4 per level)";

/** The lines that start a Python statement, found with a small tokenizer (strings, comments, brackets, '\'). */
function logicalLines(lines: string[]): LogicalLine[] {
  const result: LogicalLine[] = [];
  let depth = 0;
  let quote: string | null = null;
  let continued = false;
  let current: LogicalLine | null = null;
  let header = false; // the current statement starts with a block keyword
  let colon = false; // ...and has a ':' outside brackets so far
  for (let row = 0; row < lines.length; row++) {
    const text = (lines[row] ?? "").replace(/\r$/, "");
    let i = 0;
    if (quote === null && depth === 0 && !continued) {
      let col = 0;
      let alt = 0;
      for (; i < text.length; i++) {
        const ch = text[i];
        if (ch === " ") {
          col++;
          alt++;
        } else if (ch === "\t") {
          col = (Math.floor(col / 8) + 1) * 8;
          alt++;
        } else if (ch === "\f") {
          col = alt = 0;
        } else break;
      }
      const rest = text.slice(i);
      if (!rest || rest.startsWith("#")) continue; // blank or comment-only lines do not count
      current = { row, col, alt, indent: i, opensBlock: false };
      result.push(current);
      header = PY_HEADER.test(rest);
      colon = false;
    }
    continued = false;
    let last = "";
    while (i < text.length) {
      const ch = text[i];
      if (quote) {
        if (ch === "\\") i += 2;
        else if (text.startsWith(quote, i)) {
          i += quote.length;
          quote = null;
          last = "'";
        } else i++;
        continue;
      }
      if (ch === "#") break;
      if (ch === "'" || ch === '"') {
        quote = text.startsWith(ch.repeat(3), i) ? ch.repeat(3) : ch;
        i += quote.length;
        continue;
      }
      if (ch === "\\" && i === text.length - 1) {
        continued = true;
        break;
      }
      if (ch === "(" || ch === "[" || ch === "{") depth++;
      else if ((ch === ")" || ch === "]" || ch === "}") && depth > 0) depth--;
      else if (ch === ":" && depth === 0) colon = true;
      if (ch !== " " && ch !== "\t") last = ch;
      i++;
    }
    // A one-quote string ends at the end of the line unless the line ends with '\'.
    if (quote && quote.length === 1 && !text.endsWith("\\")) quote = null;
    if (current && quote === null && depth === 0 && !continued) {
      // A header that forgot its ':' still expects a block (the missing ':'
      // is reported on its own); "if x: pass" on one line does not.
      current.opensBlock = last === ":" || (header && !colon);
    }
  }
  return result;
}

/** A line that starts a compound statement. */
const PY_HEADER = /^(?:async\s+)?(?:if|elif|else|for|while|def|class|try|except|finally|with)\b/;

/** Problems the Python grammar accepts but Python 3 rejects. */
function pythonProblems(root: SyntaxNode, lines: string[]): LiveProblem[] {
  const problems: LiveProblem[] = [];
  for (const node of root.descendantsOfType(Object.keys(PY2_STATEMENTS))) {
    const problem = at(firstLeaf(node), lines, PY2_STATEMENTS[node.type], "unexpected");
    // print "hi" -> print("hi"), for a statement on one line.
    const keyword = node.type === "print_statement" ? "print" : "exec";
    const rest = node.text.slice(keyword.length).trim();
    const oneLine = node.startPosition.row === node.endPosition.row;
    const fix: LiveFix | undefined =
      oneLine && node.text.startsWith(keyword) && rest && !rest.startsWith(">>")
        ? {
            label: `Use ${keyword}(...)`,
            confidence: "high",
            edits: [
              {
                startLine: node.startPosition.row + 1,
                startColumn: node.startPosition.column + 1,
                endLine: node.endPosition.row + 1,
                endColumn: node.endPosition.column + 1,
                text: `${keyword}(${rest})`,
              },
            ],
          }
        : undefined;
    problems.push(withTopic(problem, "print", fix));
  }
  // An empty block: the line after "def f():" is not indented. (A block that
  // holds an error is already reported by the error itself.)
  for (const block of root.descendantsOfType("block")) {
    const header = block.parent;
    if (block.childCount > 0 || !header || header.hasError) continue;
    let keyword = firstLeaf(header);
    for (let i = 0; i < header.childCount; i++) {
      const child = header.child(i);
      if (child && PY_BLOCK_KEYWORDS.has(child.type)) {
        keyword = child;
        break;
      }
    }
    problems.push(
      withTopic(
        at(keyword, lines, `Expected an indented block after this ${quote(keyword.text)} line: indent the lines that belong to it`, "missing"),
        "indent",
      ),
    );
  }
  return problems;
}

/**
 * An ERROR that starts with a Python block keyword: "if x > 3" without the
 * ':' (the header runs to the first new line outside brackets), or "else if"
 * instead of "elif".
 */
function pythonHeaderProblem(node: SyntaxNode, lines: string[]): LiveProblem | null {
  const tokens = leaves(node);
  const start = tokens[0]?.type === "async" ? 1 : 0;
  const keyword = tokens[start];
  if (!keyword || !PY_BLOCK_KEYWORDS.has(keyword.type)) return null;
  const keywordLine = (lines[keyword.startPosition.row] ?? "").replace(/\r$/, "");
  const elseIf = keyword.type === "else" ? /^\s*if\b/.exec(keywordLine.slice(keyword.endPosition.column)) : null;
  if (elseIf) {
    const row = keyword.startPosition.row;
    return withTopic(at(keyword, lines, "In Python, 'else if' is written 'elif'"), "elif", {
      label: "Write 'elif'",
      confidence: "high",
      edits: [{ startLine: row + 1, startColumn: keyword.startPosition.column + 1, endLine: row + 1, endColumn: keyword.endPosition.column + elseIf[0].length + 1, text: "elif" }],
    });
  }
  let depth = 0;
  let last = keyword;
  for (let i = start + 1; i < tokens.length; i++) {
    const token = tokens[i];
    if (depth === 0 && token.startPosition.row > last.endPosition.row) break;
    if (token.type in CLOSERS) depth++;
    else if (OPENERS[token.type] && depth > 0) depth--;
    last = token;
  }
  if (last.type === ":" || OPERATOR.test(last.text)) return null;
  const lastLine = (lines[last.endPosition.row] ?? "").replace(/\r$/, "").replace(/#.*$/, "");
  if (lastLine.trimEnd().endsWith(":")) return null; // the ':' is there; the problem is something else
  return withTopic(after(last, lines, `Missing ':' at the end of this ${quote(keyword.text)} line`), "colon", {
    label: "Add ':'",
    confidence: "high",
    edits: [insertAt(last.endPosition.row, last.endPosition.column, ":")],
  });
}

/** Missing tokens that can be inserted where Tree-sitter expected them. */
const INSERTABLE: Record<string, { topic: LiveTopic; confidence: LiveFix["confidence"] }> = {
  ";": { topic: "semicolon", confidence: "high" },
  ":": { topic: "colon", confidence: "high" },
  ")": { topic: "bracket", confidence: "medium" },
  "]": { topic: "bracket", confidence: "medium" },
};

function missingProblem(node: SyntaxNode, lines: string[], options: AnalyzeOptions): LiveProblem {
  let { row, column } = node.startPosition;
  const expected = describeToken(node.type);
  // A missing token sits right after the previous one: underline that
  // character. On an empty line (e.g. a '}' missing at the end of the file),
  // move back to the end of the last line with code.
  let lineText = (lines[row] ?? "").replace(/\r$/, "");
  if (column === 0 || !lineText.trim()) {
    let r = column === 0 ? row - 1 : row;
    while (r > 0 && !(lines[r] ?? "").trim()) r--;
    if (r >= 0 && r !== row) {
      row = r;
      lineText = (lines[r] ?? "").replace(/\r$/, "");
      column = lineText.length;
    }
  }
  const at = Math.min(column, lineText.length);
  const start = at > 0 ? at : 1;
  const problem: LiveProblem = {
    kind: "missing",
    message: `Missing ${expected}`,
    startLine: row + 1,
    startColumn: start,
    endLine: row + 1,
    endColumn: start + 1,
  };
  const insert = INSERTABLE[node.type];
  // Only where the insertion point is plain code, not inside a line comment.
  const inComment = COMMENT.test(lineText.slice(0, at));
  if (insert && !inComment && (node.type !== ":" || options.python)) {
    return withTopic(problem, insert.topic, { label: `Add '${node.type}'`, confidence: insert.confidence, edits: [insertAt(row, at, node.type)] });
  }
  const topic: LiveTopic = node.type in CLOSERS || node.type in OPENERS ? "bracket" : ["end", "then", "do", "fi", "done"].includes(node.type) ? "block" : "missing";
  return withTopic(problem, topic);
}

function errorProblem(node: SyntaxNode, lines: string[], options: AnalyzeOptions): LiveProblem {
  // A few shapes of ERROR node cover most beginner mistakes:
  //  * one token that fits nowhere ('Console' after "int x = 1" without ';')
  //  * an expression that stops after an operator ("x = (a + ;")
  //  * a bracket that is opened and never closed ("print('hi'")
  //  * a statement whose keyword starts a construct that never completes
  //    ("if x > 0" without 'then', "def f(x)" without ':')
  const semicolons = options.semicolons ?? false;
  const first = firstLeaf(node);
  const last = lastLeaf(node);
  const firstText = snippet(first.text);
  const lastText = snippet(last.text);
  const header = options.python ? pythonHeaderProblem(node, lines) : null;
  if (header) return header;
  const tokens = leaves(node);
  // "if x = 5": an assignment where a comparison belongs.
  const assign = tokens.find(
    (t) => t.type === "=" && /^(?:\}\s*)?(?:if|elif|while|else\s+if)\b/.test((lines[t.startPosition.row] ?? "").trim()),
  );
  if (assign) {
    const { row, column } = assign.startPosition;
    return withTopic(at(assign, lines, "To compare two values use '==' (a single '=' stores a value)"), "comparison", {
      label: "Use '=='",
      confidence: "high",
      edits: [{ startLine: row + 1, startColumn: column + 1, endLine: row + 1, endColumn: column + 2, text: "==" }],
    });
  }
  if (options.python) {
    // "x = 1 +" then a new line: Python does not continue a line after an
    // operator unless it is inside brackets.
    let depth = 0;
    for (let i = 0; i + 1 < tokens.length; i++) {
      const token = tokens[i];
      if (token.type in CLOSERS) depth++;
      else if (token.type in OPENERS && depth > 0) depth--;
      const endsLine = tokens[i + 1].startPosition.row > token.endPosition.row;
      if (depth === 0 && endsLine && OPERATOR.test(token.text) && token.text !== ":" && token.text !== ",") {
        const row = token.endPosition.row;
        return withTopic(at(token, lines, `Incomplete: something is missing after ${quote(token.text)} at the end of line ${row + 1}`), "incomplete");
      }
    }
  }
  if (samePlace(first, last)) {
    // The ERROR covers exactly one token. A lone token at the end of a line
    // usually means the statement was not finished ("int x = 5" then a new
    // line); at the start of a line, that the previous line was not finished.
    const { row, column } = first.startPosition;
    const lineText = (lines[row] ?? "").replace(/\r$/, "");
    const rest = lineText.slice(first.endPosition.row === row ? first.endPosition.column : lineText.length).trim();
    const before = lineText.slice(0, column).trim();
    let previous = row - 1;
    while (previous >= 0 && !(lines[previous] ?? "").trim()) previous--;
    const previousText = previous >= 0 ? (lines[previous] ?? "").replace(/\r$/, "") : "";
    const dangling = trailingOperator(previousText);
    // Python never continues a line after an operator outside brackets, so
    // there the dangling operator is the cause whatever follows it.
    const outsideBrackets = count(previousText, /[([{]/g) <= count(previousText, /[)\]}]/g);
    if (dangling && ((options.python && outsideBrackets) || !before || STATEMENT_WORDS.test(before))) {
      // "return x +" then "}" (or "return y;") on the next line.
      const column0 = previousText.trimEnd().length - dangling.length;
      return {
        kind: "unexpected",
        message: `Incomplete: something is missing after ${quote(dangling)} at the end of line ${previous + 1}`,
        startLine: previous + 1,
        startColumn: column0 + 1,
        endLine: previous + 1,
        endColumn: column0 + 1 + dangling.length,
        topic: "incomplete",
      };
    }
    if (OPERATOR.test(firstText)) {
      return withTopic(at(first, lines, `Incomplete: something is missing after ${quote(firstText)}`), "incomplete");
    }
    if (firstText && !rest && before) {
      const problem = at(
        first,
        lines,
        semicolons
          ? `Something is missing after ${quote(firstText)}: is there a ';' missing at the end of this line?`
          : `Something is missing after ${quote(firstText)} at the end of this line`,
      );
      if (!semicolons) return withTopic(problem, "incomplete");
      const onRow = first.endPosition.row === row && !COMMENT.test(lineText.slice(0, first.endPosition.column));
      return withTopic(
        problem,
        "semicolon",
        onRow ? { label: "Add ';'", confidence: "high", edits: [insertAt(row, first.endPosition.column, ";")] } : undefined,
      );
    }
    if (firstText && !before && semicolons && previousText.trim() && !/[;{}(,:]$/.test(previousText.trim())) {
      const problem = at(first, lines, `Unexpected ${quote(firstText)}: does the line before end with ';'?`);
      const code = previousText.trimEnd();
      return withTopic(
        problem,
        "semicolon",
        COMMENT.test(code) ? undefined : { label: `Add ';' to line ${previous + 1}`, confidence: "high", edits: [insertAt(previous, code.length, ";")] },
      );
    }
    return withTopic(at(first, lines, firstText ? `Unexpected ${quote(firstText)} here` : "Unexpected text here"), "syntax");
  }
  if (lastText && OPERATOR.test(lastText)) {
    return withTopic(at(last, lines, `Incomplete: something is missing after ${quote(lastText)}`), "incomplete");
  }
  const open = unclosedBracket(node, tokens, lines);
  if (open) {
    const closer = CLOSERS[open.type];
    const problem = at(open, lines, `This ${quote(open.type)} is never closed (add ${quote(closer)})`);
    // Close it at the end of its own line, before a final ';', ':' or '{'.
    const row = open.startPosition.row;
    const code = (lines[row] ?? "").replace(/\r$/, "").trimEnd();
    const tail = /[;:{]$/.test(code) ? code.length - 1 : code.length;
    const fixable = open.type !== "{" && !COMMENT.test(code.slice(open.startPosition.column)) && tail > open.startPosition.column;
    return withTopic(problem, "bracket", fixable ? { label: `Add '${closer}'`, confidence: "medium", edits: [insertAt(row, tail, closer)] } : undefined);
  }
  const spec = options.language ? KEYWORD_BLOCKS[options.language] : undefined;
  if (spec) {
    const block = keywordBlockProblem(tokens, lines, spec);
    if (block) return block;
  }
  const keyword = keywordChild(node);
  if (keyword) {
    return withTopic(at(keyword, lines, `This ${quote(keyword.text)} statement is incomplete or has a typo (check the punctuation and keywords)`), "syntax");
  }
  if (/^[A-Za-z_]\w*$/.test(firstText)) {
    return withTopic(at(first, lines, `This ${quote(firstText)} statement is incomplete or has a typo (check the punctuation and keywords)`), "syntax");
  }
  return withTopic(at(first, lines, firstText ? `Unexpected ${quote(firstText)} here` : "The code here does not follow the language's grammar"), "syntax");
}

/** A line comment starts somewhere in this text ('//' or '#'). */
const COMMENT = /\/\/|#|\/\*/;

/** A problem underlining one token (to the end of its line at most). */
function at(leaf: SyntaxNode, lines: string[], message: string, kind: LiveProblem["kind"] = "unexpected"): LiveProblem {
  const { row, column } = leaf.startPosition;
  const lineText = (lines[row] ?? "").replace(/\r$/, "");
  const sameLineEnd = leaf.endPosition.row === row ? leaf.endPosition.column : lineText.length;
  const end = Math.max(column + 1, Math.min(sameLineEnd, lineText.length || column + 1));
  return { kind, message, startLine: row + 1, startColumn: column + 1, endLine: row + 1, endColumn: end + 1 };
}

/** A problem about something missing right after a token: underline its last character. */
function after(leaf: SyntaxNode, lines: string[], message: string): LiveProblem {
  const { row, column } = leaf.endPosition;
  const lineText = (lines[row] ?? "").replace(/\r$/, "");
  const start = Math.max(1, Math.min(column, lineText.length));
  return { kind: "missing", message, startLine: row + 1, startColumn: start, endLine: row + 1, endColumn: start + 1 };
}

/** One operator token such as '+', '=', '&&' or ','. */
const OPERATOR = /^[^\w\s()[\]{}"'`]{1,3}$/;

/** Words that start a statement: after a dangling operator, the expression was abandoned. */
const STATEMENT_WORDS =
  /^(?:return|if|else|elif|while|for|do|switch|case|break|continue|throw|yield|echo|print|puts|local|let|const|var|val|def|fn|func|fun|end|int|long|short|char|float|double|bool|boolean|void|auto|String)$/;

function count(text: string, pattern: RegExp): number {
  return text.match(pattern)?.length ?? 0;
}

/** The operator a line ends with ("total = a +"), ignoring '++', '--' and preprocessor lines. */
function trailingOperator(line: string): string | null {
  const code = line.trimEnd();
  if (!code || code.trimStart().startsWith("#") || /(?:\+\+|--)$/.test(code)) return null;
  const match = /(?:&&|\|\||=>|[=!<>+\-*/%&|^]=|[+\-*/%=&|^,?])$/.exec(code);
  return match ? match[0] : null;
}

/**
 * The innermost '(' '[' or '{' inside the ERROR that is not closed inside it
 * nor later on the line where the ERROR ends.
 */
function unclosedBracket(node: SyntaxNode, tokens: SyntaxNode[], lines: string[]): SyntaxNode | null {
  const stack: SyntaxNode[] = [];
  for (const token of tokens) {
    if (token.type in CLOSERS) stack.push(token);
    else if (token.type in OPENERS && stack.length && stack[stack.length - 1].type === OPENERS[token.type]) stack.pop();
  }
  const open = stack.pop();
  if (!open) return null;
  const { row, column } = node.endPosition;
  const restOfLine = (lines[row] ?? "").slice(column);
  return restOfLine.includes(CLOSERS[open.type]) ? null : open;
}

// ------------------------------------------------- then / do / end / fi / done

interface KeywordBlocks {
  /** Keyword that opens a block -> the word that closes it. */
  open: Record<string, string>;
  /** Keyword -> the word that must follow its condition ("if ... then"). */
  needs: Record<string, string>;
  /** How to write the missing word, e.g. "; then" in Bash. */
  spelled?: Record<string, string>;
  /** Keywords that open a block only as the first word on their line (Ruby's "x += 1 while x < 9"). */
  lineStartOnly?: Set<string>;
}

const KEYWORD_BLOCKS: Record<string, KeywordBlocks> = {
  ruby: {
    open: { def: "end", class: "end", module: "end", if: "end", unless: "end", while: "end", until: "end", case: "end", begin: "end", do: "end", for: "end" },
    needs: {},
    lineStartOnly: new Set(["if", "unless", "while", "until"]),
  },
  lua: {
    open: { function: "end", if: "end", while: "end", for: "end", do: "end", repeat: "until" },
    needs: { if: "then", elseif: "then", while: "do", for: "do" },
  },
  bash: {
    open: { if: "fi", case: "esac", for: "done", while: "done", until: "done", select: "done" },
    needs: { if: "then", elif: "then", for: "do", while: "do", until: "do", select: "do" },
    spelled: { then: "'; then'", do: "'; do'" },
  },
};

/** The keyword a token stands for: an anonymous keyword token, or a bare word the parser could not place ("fi"). */
function keywordOf(token: SyntaxNode): string | null {
  const text = token.text;
  if (!/^[a-z]+$/.test(text)) return null;
  if (token.type === text) return text;
  if (token.type === "identifier" || token.type === "word") {
    // In Bash, only a command's first word is a keyword ("echo if" is not).
    if (token.type === "word" && token.parent?.type !== "command_name") return null;
    return text;
  }
  return null;
}

/**
 * Ruby, Lua and Bash close blocks with words. Finds a condition without its
 * 'then'/'do', or a block whose 'end'/'fi'/'done' is missing. When the
 * closing words do not add up, indentation decides which block lost its
 * closer, as a person reading the code would.
 */
function keywordBlockProblem(tokens: SyntaxNode[], lines: string[], spec: KeywordBlocks): LiveProblem | null {
  const words = tokens.map(keywordOf);
  const closers = new Set(Object.values(spec.open));
  const firstOnLine = (i: number) => i === 0 || tokens[i - 1].endPosition.row < tokens[i].startPosition.row;
  // 1. "if x > 0" without 'then' (Lua, Bash), "while x" without 'do'.
  for (let i = 0; i < tokens.length; i++) {
    const needed = spec.needs[words[i] ?? ""];
    if (!needed) continue;
    let j = i + 1;
    while (j < tokens.length && words[j] !== needed && !closers.has(words[j] ?? "") && !spec.open[words[j] ?? ""]) j++;
    if (words[j] === needed) continue;
    // Underline the end of the condition: the last token on the keyword's line.
    let k = i;
    while (k + 1 < tokens.length && tokens[k + 1].startPosition.row === tokens[i].startPosition.row && k + 1 < j) k++;
    const how = spec.spelled?.[needed] ?? quote(needed);
    const insert = spec.spelled?.[needed] ? `; ${needed}` : ` ${needed}`;
    return withTopic(after(tokens[k], lines, `Missing ${quote(needed)} after this ${quote(words[i]!)} condition (add ${how})`), "block", {
      label: `Add '${needed}'`,
      confidence: "high",
      edits: [insertAt(tokens[k].endPosition.row, tokens[k].endPosition.column, insert)],
    });
  }
  // 2. A block that is never closed.
  const indent = (token: SyntaxNode) => /^\s*/.exec(lines[token.startPosition.row] ?? "")![0].length;
  const stack: { token: SyntaxNode; word: string; closer: string; indent: number }[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const word = words[i];
    if (!word) continue;
    const closer = spec.open[word];
    if (closer && (!spec.lineStartOnly?.has(word) || firstOnLine(i))) {
      // Lua's "while x do" and "for ... do" are one block, not two.
      const top = stack[stack.length - 1];
      if (word === "do" && top && (top.word === "while" || top.word === "for") && top.token.startPosition.row === tokens[i].startPosition.row) continue;
      stack.push({ token: tokens[i], word, closer, indent: indent(tokens[i]) });
      continue;
    }
    if (!closers.has(word)) continue;
    let k = stack.length - 1;
    while (k >= 0 && !(stack[k].closer === word && stack[k].indent === indent(tokens[i]))) k--;
    if (k < 0) {
      k = stack.length - 1;
      while (k >= 0 && stack[k].closer !== word) k--;
      if (k < 0) continue;
    }
    if (k < stack.length - 1) break; // a block opened inside this one was never closed
    stack.pop();
  }
  const unclosed = stack[stack.length - 1];
  if (!unclosed) return null;
  return withTopic(at(unclosed.token, lines, `This ${quote(unclosed.word)} is never closed (add ${quote(unclosed.closer)})`), "block");
}

/** The tokens of a node in source order (bounded, for very large ERROR nodes). */
function leaves(node: SyntaxNode, limit = 2000): SyntaxNode[] {
  const out: SyntaxNode[] = [];
  const stack: SyntaxNode[] = [node];
  while (stack.length && out.length < limit) {
    const current = stack.pop()!;
    if (current.childCount === 0) {
      if (current.text.trim()) out.push(current); // skip newline tokens and zero-width nodes
      continue;
    }
    for (let i = current.childCount - 1; i >= 0; i--) {
      const child = current.child(i);
      if (child) stack.push(child);
    }
  }
  return out;
}

const BLOCK_KEYWORDS = /^(?:if|elif|elsif|else|unless|for|foreach|while|until|do|def|class|function|fn|func|fun|case|switch|try|repeat|begin|module|struct|enum|interface)$/;

/** The first keyword that opens a statement among the ERROR node's own children. */
function keywordChild(node: SyntaxNode): SyntaxNode | null {
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child && child.childCount === 0 && BLOCK_KEYWORDS.test(child.type)) return child;
  }
  return null;
}

function samePlace(a: SyntaxNode, b: SyntaxNode): boolean {
  return (
    a.startPosition.row === b.startPosition.row &&
    a.startPosition.column === b.startPosition.column &&
    a.endPosition.row === b.endPosition.row &&
    a.endPosition.column === b.endPosition.column
  );
}

function firstLeaf(node: SyntaxNode): SyntaxNode {
  let current = node;
  while (current.childCount > 0) {
    const child = current.child(0);
    if (!child) break;
    current = child;
  }
  return current;
}

function lastLeaf(node: SyntaxNode): SyntaxNode {
  let current = node;
  while (current.childCount > 0) {
    const child = current.child(current.childCount - 1);
    if (!child) break;
    current = child;
  }
  return current;
}

const CLOSERS: Record<string, string> = { "(": ")", "[": "]", "{": "}" };
const OPENERS: Record<string, string> = { ")": "(", "]": "[", "}": "{" };

const TOKEN_NAMES: Record<string, string> = {
  ";": "';' (end of statement)",
  ")": "')' (closing parenthesis)",
  "(": "'(' (opening parenthesis)",
  "}": "'}' (closing brace)",
  "{": "'{' (opening brace)",
  "]": "']' (closing bracket)",
  ":": "':'",
  ",": "','",
  '"': "'\"' (end of the string)",
  "'": "\"'\" (end of the text)",
  end: "'end'",
  then: "'then'",
  do: "'do'",
  fi: "'fi'",
  done: "'done'",
};

function describeToken(type: string): string {
  if (TOKEN_NAMES[type]) return TOKEN_NAMES[type];
  if (/^[A-Za-z_]+$/.test(type) && type.includes("_")) return `a ${type.replace(/_/g, " ")}`;
  if (type === "identifier") return "a name or value";
  if (/^[a-z]+$/.test(type) && type.length > 3) return `a ${type}`;
  return `'${type}'`;
}

function snippet(text: string): string {
  const first = text.split("\n")[0].trim();
  return first.length > 24 ? `${first.slice(0, 24)}…` : first;
}

function quote(token: string): string {
  return token.includes("'") ? `"${token}"` : `'${token}'`;
}
