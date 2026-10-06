import { describe, expect, it } from "vitest";
import { SPECS, knownNames, specFor } from "./index";
import { entries, snippets } from "./spec";

describe("IntelliSense tables", () => {
  it("parses the compact entry format", () => {
    const [printf, eof, vec] = entries(`
      F printf(const char *format, ...) :: Print formatted text.
      C EOF :: End of file.
      T vector<T> :: A growable array.
    `);
    expect(printf).toEqual({ name: "printf", kind: "function", sig: "printf(const char *format, ...)", doc: "Print formatted text." });
    expect(eof).toEqual({ name: "EOF", kind: "constant", sig: undefined, doc: "End of file." });
    expect(vec.name).toBe("vector");
  });

  it("parses snippet blocks and keeps code lines that start with @", () => {
    const list = snippets(`
@media | media query
@media (max-width: 600px) {
\t$0
}
@main | main
int main(void) {}
`);
    expect(list.map((s) => s.prefix)).toEqual(["media", "main"]);
    expect(list[0].body).toBe("@media (max-width: 600px) {\n\t$0\n}");
  });

  it("every language has keywords or snippets, and ids match", () => {
    for (const [id, spec] of Object.entries(SPECS)) {
      expect(spec.id).toBe(id);
      expect(spec.keywords.length + spec.snippets.length).toBeGreaterThan(0);
    }
  });

  it("snippet bodies only use valid Monaco syntax for $", () => {
    // A literal $ must be written \$; otherwise $ starts a tab stop ($1, ${1:x}) or the final cursor ($0).
    for (const spec of Object.values(SPECS)) {
      for (const s of spec.snippets) {
        const stripped = s.body.replace(/\\\$/g, "");
        const bad = stripped.match(/\$(?![0-9{])/);
        expect(bad, `${spec.id} snippet "${s.prefix}": ${s.body}`).toBeNull();
      }
    }
  });

  it("snippet prefixes are unique per language", () => {
    for (const spec of Object.values(SPECS)) {
      const prefixes = spec.snippets.map((s) => s.prefix);
      expect(new Set(prefixes).size, spec.id).toBe(prefixes.length);
    }
  });

  it("known names cover keywords, library names and module members", () => {
    const c = knownNames("c")!;
    expect(c.global.has("printf")).toBe(true);
    expect(c.global.has("while")).toBe(true);
    expect(c.global.has("NULL")).toBe(true);
    const cpp = knownNames("cpp")!;
    expect(cpp.members.get("std")?.has("cout")).toBe(true);
    const java = knownNames("java")!;
    expect(java.members.get("System.out")?.has("println")).toBe(true);
    expect(java.global.has("System")).toBe(true);
    const rust = knownNames("rust")!;
    expect(rust.global.has("println")).toBe(true); // "println!" is known without the "!"
    const pascal = knownNames("pascal")!;
    expect(pascal.caseInsensitive).toBe(true);
    expect(pascal.global.has("writeln")).toBe(true);
    expect(specFor("nope")).toBeNull();
  });
});
