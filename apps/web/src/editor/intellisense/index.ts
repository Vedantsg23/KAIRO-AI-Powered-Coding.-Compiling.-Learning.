import { C, CPP } from "./data/c";
import { CSHARP, JAVA, KOTLIN } from "./data/jvm";
import { ADA, ASM, CLOJURE, COBOL, D, ELIXIR, ERLANG, FORTRAN, FSHARP, HASKELL, LEX, LISP, NIM, OCTAVE, PASCAL, PROLOG, SCHEME, VBNET, VERILOG } from "./data/more";
import { PYTHON } from "./data/python";
import { BASH, LUA, PERL, PHP, R, RUBY, SQL, TCL } from "./data/scripting";
import { GO, RUST, SWIFT } from "./data/systems";
import { CSS, HTML, JAVASCRIPT, REACT, TYPESCRIPT } from "./data/web";
import type { Entry, LanguageSpec } from "./spec";

export type { Entry, LanguageSpec, SnippetSpec } from "./spec";

const ALL: LanguageSpec[] = [
  C, CPP, JAVA, KOTLIN, CSHARP, PYTHON, GO, RUST, SWIFT, PHP, RUBY, LUA, BASH, SQL, PERL, R, TCL,
  JAVASCRIPT, TYPESCRIPT, REACT, HTML, CSS,
  ASM, FORTRAN, PASCAL, PROLOG, COBOL, LEX, VERILOG, ELIXIR, ERLANG, LISP, SCHEME, CLOJURE, HASKELL, D, ADA, NIM,
  OCTAVE, VBNET, FSHARP,
];

export const SPECS: Record<string, LanguageSpec> = Object.fromEntries(ALL.map((s) => [s.id, s]));

/** The IntelliSense knowledge for a KAIRO language id (null when there is none). */
export function specFor(languageId: string): LanguageSpec | null {
  return SPECS[languageId] ?? null;
}

/** Every entry of a spec, with the receiver it belongs to ("" for globals). */
export function allEntries(spec: LanguageSpec): { receiver: string; entry: Entry }[] {
  const out: { receiver: string; entry: Entry }[] = spec.builtins.map((entry) => ({ receiver: "", entry }));
  for (const [receiver, list] of Object.entries(spec.modules)) for (const entry of list) out.push({ receiver, entry });
  for (const entry of spec.members) out.push({ receiver: "*", entry });
  return out;
}

const knownCache = new Map<string, KnownNames>();

export interface KnownNames {
  /** Names valid anywhere (keywords, types, builtins, modules, extra known names). */
  global: Set<string>;
  /** Member names valid after a separator, per receiver ("*" = any receiver). */
  members: Map<string, Set<string>>;
  /** Every member name of any receiver. */
  anyMember: Set<string>;
  /** Candidates for "did you mean" on global names, most useful first. */
  suggestions: string[];
  caseInsensitive: boolean;
}

/** Strip decorations that are not part of the identifier ("println!" -> "println"). */
const bare = (name: string) => name.replace(/[!?]$/, "");

/** Everything the Typo Guard treats as correctly spelled for a language. */
export function knownNames(languageId: string): KnownNames | null {
  const cached = knownCache.get(languageId);
  if (cached) return cached;
  const spec = specFor(languageId);
  if (!spec) return null;
  const norm = (s: string) => (spec.caseInsensitive ? s.toLowerCase() : s);
  const global = new Set<string>();
  const suggestions: string[] = [];
  const add = (name: string, suggest = true) => {
    const n = norm(bare(name));
    if (!n || global.has(n)) return;
    global.add(n);
    if (suggest && n.length >= 3) suggestions.push(bare(name));
  };
  // Order matters for suggestions: library functions first, then types, keywords.
  spec.builtins.forEach((e) => add(e.name));
  spec.types.forEach((t) => add(t));
  spec.keywords.forEach((k) => add(k));
  Object.keys(spec.modules).forEach((m) => m.split(/\.|::/).forEach((part) => add(part)));
  spec.known.forEach((k) => add(k));
  const members = new Map<string, Set<string>>();
  const anyMember = new Set<string>();
  for (const [receiver, list] of Object.entries(spec.modules)) {
    const set = new Set(list.map((e) => norm(bare(e.name))));
    members.set(receiver, set);
    set.forEach((n) => anyMember.add(n));
  }
  const star = new Set(spec.members.map((e) => norm(bare(e.name))));
  members.set("*", star);
  star.forEach((n) => anyMember.add(n));
  const result: KnownNames = { global, members, anyMember, suggestions, caseInsensitive: !!spec.caseInsensitive };
  knownCache.set(languageId, result);
  return result;
}
