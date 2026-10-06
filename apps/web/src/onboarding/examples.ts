/**
 * Starter programs and ready-made examples for every language.
 *
 * The programs are real files in ./examples/<language>/ and their cards are
 * described in ./examples/manifest.json. Each example declares what happens
 * when it runs; tests/integration/test_examples.py runs every one of them in
 * the sandbox and checks exactly that, so a card never promises something
 * the platform does not do.
 */
import manifest from "./examples/manifest.json";

export type Outcome = "runs" | "compile-error" | "runtime-error" | "time-limit";

export interface Example {
  id: string;
  title: string;
  description: string;
  outcome: Outcome;
  concepts: string[];
  source: string;
  stdin?: string;
}

interface ManifestEntry {
  id: string;
  file: string;
  title: string;
  description: string;
  outcome: string;
  concepts: string[];
  stdin?: string;
}

const FILES = import.meta.glob("./examples/*/*", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const MANIFEST = manifest as Record<string, { starter: string; examples: ManifestEntry[] }>;

function file(language: string, name: string): string {
  return FILES[`./examples/${language}/${name}`] ?? "";
}

/** How many ready-made examples these languages have. */
export function exampleCount(languages: string[]): number {
  return languages.reduce((total, id) => total + (MANIFEST[id]?.examples.length ?? 0), 0);
}

export function starterFor(language: string): string {
  const entry = MANIFEST[language];
  return entry ? file(language, entry.starter) : "";
}

export function examplesFor(language: string): Example[] {
  return (MANIFEST[language]?.examples ?? []).map((e) => ({
    id: e.id,
    title: e.title,
    description: e.description,
    outcome: e.outcome as Outcome,
    concepts: e.concepts,
    stdin: e.stdin,
    source: file(language, e.file),
  }));
}

/** Label for an outcome; "compile error" reads as "syntax error" for checked-only languages. */
export function outcomeLabel(outcome: Outcome, compileLabel = "Compile"): string {
  switch (outcome) {
    case "runs":
      return "Runs";
    case "compile-error":
      return compileLabel === "Compile" ? "Compile error" : "Syntax error";
    case "runtime-error":
      return "Runtime error";
    case "time-limit":
      return "Time limit";
  }
}
