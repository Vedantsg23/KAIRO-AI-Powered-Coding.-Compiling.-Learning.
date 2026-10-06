/**
 * Language knowledge for KAIRO's IntelliSense: keywords, types, the standard
 * library names students use most, members of well-known modules/objects,
 * include/import targets and snippets.
 *
 * The same tables feed three features:
 *  - completions while typing (editor/intellisense/providers.ts),
 *  - hover and parameter hints for library functions,
 *  - the Typo Guard in the live analyzer worker (live/insights.ts), which
 *    compares unknown names against everything listed here.
 *
 * Everything here is hand-written reference text, not AI output. Entries are
 * written compactly, one per line:
 *
 *   F printf(const char *format, ...) :: Print formatted text to standard output.
 *
 * The first letter is the kind (see KIND_CODES); the name is the text before
 * "(" (or the whole signature); "::" starts the documentation.
 */

export type EntryKind =
  | "function"
  | "method"
  | "class"
  | "struct"
  | "interface"
  | "module"
  | "constant"
  | "variable"
  | "type"
  | "property"
  | "macro"
  | "field"
  | "enum"
  | "keyword";

export interface Entry {
  name: string;
  kind: EntryKind;
  /** Signature or type, e.g. "printf(const char *format, ...)". */
  sig?: string;
  doc?: string;
}

export interface SnippetSpec {
  /** What the student types to find it (e.g. "for", "main"). */
  prefix: string;
  label: string;
  /** Monaco snippet syntax: ${1:name} placeholders, $0 final cursor. */
  body: string;
  doc?: string;
}

export interface LanguageSpec {
  id: string;
  keywords: string[];
  /** Built-in / primitive type names. */
  types: string[];
  /** Global functions, classes and constants (no receiver needed). */
  builtins: Entry[];
  /**
   * Members of well-known receivers: modules, namespaces, classes and objects,
   * keyed by how they are written before the separator ("Math", "System.out",
   * "std", "fmt", "math"...).
   */
  modules: Record<string, Entry[]>;
  /** Methods that exist on everyday values (strings, lists...), offered after "." on unknown receivers. */
  members: Entry[];
  /** #include / import targets. */
  imports: string[];
  snippets: SnippetSpec[];
  /** Other names that are never typos (main, self, argv...). */
  known: string[];
  /** Characters that separate a receiver from its member (".", "::", "->"...). */
  separators: string[];
  /** Whether names are case-insensitive (Pascal, Fortran, COBOL, SQL...). */
  caseInsensitive?: boolean;
}

const KIND_CODES: Record<string, EntryKind> = {
  F: "function",
  M: "method",
  C: "constant",
  T: "class",
  S: "struct",
  I: "interface",
  N: "module",
  V: "variable",
  Y: "type",
  P: "property",
  D: "macro",
  E: "enum",
  K: "keyword",
};

/** Parse the compact one-entry-per-line format. */
export function entries(text: string): Entry[] {
  const out: Entry[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const kind = KIND_CODES[line[0]];
    if (!kind || line[1] !== " ") throw new Error(`bad entry: ${line}`);
    const body = line.slice(2);
    const split = body.indexOf(" :: ");
    const sig = (split >= 0 ? body.slice(0, split) : body).trim();
    const doc = split >= 0 ? body.slice(split + 4).trim() : undefined;
    const paren = sig.search(/[(<\s:=]/);
    const name = paren > 0 ? sig.slice(0, paren) : sig;
    out.push({ name, kind, sig: sig !== name ? sig : undefined, doc });
  }
  return out;
}

/** Split a space-separated word list. */
export const words = (text: string): string[] => text.split(/\s+/).filter(Boolean);

/**
 * Parse snippets written as blocks:
 *
 *   @for | for loop | Count from 0 to n
 *   for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {
 *   \t$0
 *   }
 *
 * The body runs until the next "@" line. "\t" in the text is a real tab in
 * the snippet (Monaco turns it into the editor's indentation).
 */
export function snippets(text: string): SnippetSpec[] {
  const out: SnippetSpec[] = [];
  let current: SnippetSpec | null = null;
  const body: string[] = [];
  const flush = () => {
    if (current) out.push({ ...current, body: body.join("\n").replace(/\s+$/, "") });
    body.length = 0;
  };
  for (const line of text.replace(/^\n/, "").split("\n")) {
    // A header is "@prefix | label[ | doc]"; code lines that happen to start
    // with "@" (CSS @media, Java annotations...) never contain " | " there.
    if (/^@[^\s|]+ \| /.test(line.trimStart()) && !/^\t/.test(line)) {
      flush();
      const [prefix, label, doc] = line.trimStart().slice(1).split(" | ").map((s) => s.trim());
      current = { prefix, label: label ?? prefix, body: "", doc };
    } else if (current) {
      body.push(line.replace(/\\t/g, "\t"));
    }
  }
  flush();
  return out;
}

export interface SpecInput {
  id: string;
  keywords: string;
  types?: string;
  builtins?: string;
  modules?: Record<string, string>;
  members?: string;
  imports?: string;
  snippets?: string;
  known?: string;
  separators?: string[];
  caseInsensitive?: boolean;
}

export function spec(input: SpecInput): LanguageSpec {
  const modules: Record<string, Entry[]> = {};
  for (const [receiver, text] of Object.entries(input.modules ?? {})) modules[receiver] = entries(text);
  return {
    id: input.id,
    keywords: words(input.keywords),
    types: words(input.types ?? ""),
    builtins: entries(input.builtins ?? ""),
    modules,
    members: entries(input.members ?? ""),
    imports: words(input.imports ?? ""),
    snippets: snippets(input.snippets ?? ""),
    known: words(input.known ?? ""),
    separators: input.separators ?? ["."],
    caseInsensitive: input.caseInsensitive,
  };
}

/** A copy of `base` with extra entries (used for C -> C++, Java -> Kotlin...). */
export function extend(base: LanguageSpec, extra: SpecInput): LanguageSpec {
  const more = spec(extra);
  const modules = { ...base.modules };
  for (const [k, v] of Object.entries(more.modules)) modules[k] = [...(modules[k] ?? []), ...v];
  return {
    id: more.id,
    keywords: [...new Set([...base.keywords, ...more.keywords])],
    types: [...new Set([...base.types, ...more.types])],
    builtins: [...base.builtins, ...more.builtins],
    modules,
    members: [...base.members, ...more.members],
    imports: [...new Set([...base.imports, ...more.imports])],
    snippets: [...more.snippets, ...base.snippets.filter((s) => !more.snippets.some((m) => m.prefix === s.prefix))],
    known: [...new Set([...base.known, ...more.known])],
    separators: extra.separators ?? base.separators,
    caseInsensitive: extra.caseInsensitive ?? base.caseInsensitive,
  };
}
