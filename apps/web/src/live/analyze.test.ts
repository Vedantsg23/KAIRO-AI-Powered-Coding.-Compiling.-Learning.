// Runs the real Tree-sitter grammars (the same .wasm files the browser loads)
// in Node, so the live check is tested without a browser.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { beforeAll, describe, expect, it } from "vitest";
import { Language, Parser } from "web-tree-sitter";
import { applyTextEdits } from "../lib/edits";
import { findProblems, type LiveProblem, type SyntaxNode } from "./analyze";
import { LIVE_LANGUAGES } from "./support";

const require = createRequire(import.meta.url);

const WASM: Record<string, string> = {
  c: "tree-sitter-c/tree-sitter-c.wasm",
  cpp: "tree-sitter-cpp/tree-sitter-cpp.wasm",
  java: "tree-sitter-java/tree-sitter-java.wasm",
  python: "tree-sitter-python/tree-sitter-python.wasm",
  javascript: "tree-sitter-javascript/tree-sitter-javascript.wasm",
  typescript: "tree-sitter-typescript/tree-sitter-typescript.wasm",
  go: "tree-sitter-go/tree-sitter-go.wasm",
  rust: "tree-sitter-rust/tree-sitter-rust.wasm",
  csharp: "tree-sitter-c-sharp/tree-sitter-c_sharp.wasm",
  kotlin: "@tree-sitter-grammars/tree-sitter-kotlin/tree-sitter-kotlin.wasm",
  php: "tree-sitter-php/tree-sitter-php.wasm",
  ruby: "tree-sitter-ruby/tree-sitter-ruby.wasm",
  lua: "@tree-sitter-grammars/tree-sitter-lua/tree-sitter-lua.wasm",
  bash: "tree-sitter-bash/tree-sitter-bash.wasm",
};

// [valid program, broken program, line of the first problem]
const CASES: Record<string, [string, string, number]> = {
  c: ['#include <stdio.h>\nint main(void) {\n    printf("hi\\n");\n}\n', "int main(void) {\n    int x = 1\n    return x;\n}\n", 2],
  cpp: ["#include <iostream>\nint main() { std::cout << 1; }\n", "int main() {\n    std::cout << 1\n}\n", 2],
  java: ["public class Main {\n    public static void main(String[] a) { }\n}\n", "public class Main {\n    void f() { int x = 1 }\n}\n", 2],
  python: ["def f(x):\n    return x * 2\n", "def f(x)\n    return x\n", 1],
  javascript: ["const a = [1, 2].map((x) => x * 2);\n", "const a = 1;\nconst b = (a + ;\n", 2],
  typescript: ["let n: number = 5;\n", "let n: number = 5;\nlet m: number = ;\n", 2],
  go: ['package main\n\nimport "fmt"\n\nfunc main() { fmt.Println(1) }\n', "package main\n\nfunc main() {\n\tx := \n}\n", 4],
  rust: ["fn main() { let v = vec![1]; println!(\"{:?}\", v); }\n", "fn main() {\n    let x = ;\n}\n", 2],
  csharp: ['using System;\nConsole.WriteLine("hi");\n', "using System;\nint x = 1\nConsole.WriteLine(x);\n", 2],
  kotlin: ['fun main() {\n    println("hi")\n}\n', "fun main() {\n    val x = \n}\n", 2],
  php: ['<?php\necho "hi";\n', "<?php\n$x = 1\necho $x;\n", 2],
  ruby: ['puts "hi"\n', "def f(x\n  x\nend\n", 1],
  lua: ['print("hi")\n', "local x = 1\nif x > 0\n  print(x)\nend\n", 2],
  bash: ['echo "hi"\n', "if [ 1 -eq 1 ]\n  echo yes\nfi\n", 1],
};

const parsers = new Map<string, Parser>();

beforeAll(async () => {
  await Parser.init();
  for (const [id, path] of Object.entries(WASM)) {
    const parser = new Parser();
    parser.setLanguage(await Language.load(readFileSync(require.resolve(path))));
    parsers.set(id, parser);
  }
});

const SEMICOLONS = new Set(["c", "cpp", "java", "csharp", "javascript", "typescript", "php", "rust"]);

function check(id: string, text: string): LiveProblem[] {
  const tree = parsers.get(id)!.parse(text)!;
  const problems = findProblems(tree.rootNode as unknown as SyntaxNode, text, {
    semicolons: SEMICOLONS.has(id),
    python: id === "python",
    language: id,
  });
  tree.delete();
  return problems;
}

/** "line:column message" for each problem, for compact assertions. */
function describe_(id: string, text: string): string[] {
  return check(id, text).map((p) => `${p.startLine}:${p.startColumn} ${p.message}`);
}

describe("live syntax check", () => {
  it("covers every language that claims live support", () => {
    expect(new Set(Object.keys(WASM))).toEqual(LIVE_LANGUAGES);
  });

  for (const [id, [valid, broken, line]] of Object.entries(CASES)) {
    it(`${id}: valid code has no problems, broken code is found near line ${line}`, () => {
      expect(check(id, valid)).toEqual([]);
      const problems = check(id, broken);
      expect(problems.length).toBeGreaterThan(0);
      expect(Math.abs(problems[0].startLine - line)).toBeLessThanOrEqual(1);
      for (const p of problems) {
        expect(p.startColumn).toBeGreaterThanOrEqual(1);
        expect(p.endColumn).toBeGreaterThan(p.startColumn);
      }
    });
  }

  it("names the missing token and underlines the end of the line", () => {
    const [problem] = check("c", "int main(void) {\n    int x = 1\n    return x;\n}\n");
    expect(problem.kind).toBe("missing");
    expect(problem.message).toBe("Missing ';' (end of statement)");
    expect(problem).toMatchObject({ startLine: 2, startColumn: 13, endColumn: 14 });
  });

  it("points a lone token at the end of a line to the missing ';'", () => {
    const [problem] = check("c", 'int main(void) {\n    int apples = 5\n    printf("%d", apples);\n}\n');
    expect(problem.startLine).toBe(2);
    expect(problem.message).toContain("';' missing at the end of this line");
    const [cs] = check("csharp", "using System;\nint x = 1\nConsole.WriteLine(x);\n");
    expect(cs.message).toContain("does the line before end with ';'");
  });

  it("counts columns in UTF-16 code units, like the editor", () => {
    const text = 'const s = "é😀"; let a = ;\n';
    const [problem] = check("javascript", text);
    // '=' is at JavaScript string index 23 -> column 24
    expect(problem.startColumn).toBe(text.indexOf("= ;") + 1);
  });

  it("explains common slips in plain words, at the right place", () => {
    // [language, code, expected first problem]
    const slips: [string, string, string][] = [
      ["python", "def area(w, h)\n    return w * h\n", "1:14 Missing ':' at the end of this 'def' line"],
      ["python", "x = 5\nif x > 3\n    print(x)\n", "2:8 Missing ':' at the end of this 'if' line"],
      ["python", "if x:\n    pass\nelse if y:\n    pass\n", "3:1 In Python, 'else if' is written 'elif'"],
      ["python", "if x = 5:\n    pass\n", "1:6 To compare two values use '==' (a single '=' stores a value)"],
      ["python", "print('hi'\n", "1:6 This '(' is never closed (add ')')"],
      ["python", "x = [1, 2, 3\nprint(x)\n", "1:5 This '[' is never closed (add ']')"],
      ["python", "x = 1 +\ny = 2\n", "1:7 Incomplete: something is missing after '+' at the end of line 1"],
      ["javascript", "function f(x) {\n  return x +\n}\n", "2:12 Incomplete: something is missing after '+'"],
      ["javascript", "function f(x) {\n  return x +\n}\nconsole.log(f(1));\n", "2:12 Incomplete: something is missing after '+' at the end of line 2"],
      ["c", "int main(void) {\n    int x = 3 +\n    return x;\n}\n", "2:15 Incomplete: something is missing after '+' at the end of line 2"],
      ["go", "package main\n\nfunc main() {\n\tx := 1\n\tif x = 5 {\n\t}\n}\n", "5:7 To compare two values use '==' (a single '=' stores a value)"],
      ["ruby", "def grade(score)\n  if score >= 50\n    \"pass\"\n  else\n    \"fail\"\nend\n\nputs grade(72)\n", "2:3 This 'if' is never closed (add 'end')"],
      ["lua", "local score = 72\nif score >= 50\n  print(\"pass\")\nend\n", "2:14 Missing 'then' after this 'if' condition (add 'then')"],
      ["bash", "score=72\nif [ \"$score\" -ge 50 ]\n  echo \"pass\"\nfi\n", "2:22 Missing 'then' after this 'if' condition (add '; then')"],
      ["bash", "for i in 1 2 3\n  echo $i\ndone\n", "1:14 Missing 'do' after this 'for' condition (add '; do')"],
    ];
    for (const [id, code, expected] of slips) {
      expect(describe_(id, code)[0], `${id}: ${JSON.stringify(code)}`).toBe(expected);
    }
  });

  it("does not repeat a missing ':' as an indentation problem on the next line", () => {
    expect(describe_("python", "for i in range(3)\n    print(i)\n")).toEqual(["1:17 Missing ':' at the end of this 'for' line"]);
  });

  it("applies Python 3 rules the grammar does not: indentation, empty blocks, print statements", () => {
    expect(describe_("python", "x = 1\n    y = 2\n")).toEqual([
      "2:5 Unexpected indent: this line is indented, but the line before does not end with ':'",
    ]);
    expect(describe_("python", "if x:\n    y = 1\n  z = 2\n")).toEqual([
      "3:3 This line's indentation does not match any block above it: line it up with the lines it belongs with",
    ]);
    expect(describe_("python", "def f():\n\tif x:\n\t\treturn 1\n        return 2\n")).toEqual([
      "4:9 Tabs and spaces are mixed in this indentation: use spaces only (4 per level)",
    ]);
    expect(describe_("python", "def f(x):\nreturn x\n")).toEqual([
      "1:1 Expected an indented block after this 'def' line: indent the lines that belong to it",
    ]);
    expect(describe_("python", 'print "hi"\n')).toEqual(["1:1 In Python 3, print is a function: write print(...) with parentheses"]);
  });

  it("accepts valid Python that stretches the indentation rules", () => {
    const valid = [
      "import os",
      "",
      "@staticmethod",
      "async def f(a: int,",
      "            b: int = 2) -> int:",
      '    """Docstring',
      "  with odd indentation inside the string",
      '    """',
      "    total = (a +",
      "             b)",
      "    x = 1 + \\",
      "        2",
      "    if total: return total",
      "    d = {'k': 1,",
      "         'v': [i for i in range(3) if i]}",
      "# a comment at column 0 inside a block",
      "        # and one indented oddly",
      "    match x:",
      "        case 1:",
      "            pass",
      "        case _:",
      "            y = lambda: 0",
      "    while (n := len(d)) > 5:",
      "        break",
      "    else:",
      "        pass",
      '    return f"{x!r:>10}"',
      "",
      "class A: pass",
      "",
    ].join("\n");
    expect(check("python", valid)).toEqual([]);
  });

  it("stops after a few problems so a broken file stays readable", () => {
    const text = Array.from({ length: 40 }, (_, i) => `int f${i}(void) { return ${i} }`).join("\n");
    expect(check("c", text).length).toBeLessThanOrEqual(8);
  });

  it("checks a 500-line file in well under the time budget", () => {
    const body = Array.from({ length: 498 }, (_, i) => `    total += values[${i % 7}] * ${i};`).join("\n");
    const text = `int main(void) {\n${body}\n}\n`;
    expect(text.split("\n").length).toBeGreaterThanOrEqual(500);
    check("c", text); // warm up
    const times: number[] = [];
    for (let i = 0; i < 20; i++) {
      const started = performance.now();
      check("c", text);
      times.push(performance.now() - started);
    }
    times.sort((a, b) => a - b);
    const p95 = times[Math.ceil(0.95 * times.length) - 1];
    console.log(`500-line C file: parse+analyse p50 ${times[9].toFixed(2)} ms, p95 ${p95.toFixed(2)} ms (Node)`);
    expect(p95).toBeLessThan(100);
  });
});

describe("quick fixes", () => {
  // [language, broken code, fix label, fixed code]
  const FIXES: [string, string, string, string][] = [
    ["c", "int main(void) {\n    int x = 1\n    return x;\n}\n", "Add ';'", "int main(void) {\n    int x = 1;\n    return x;\n}\n"],
    ["c", 'int main(void) {\n    int apples = 5\n    printf("%d", apples);\n}\n', "Add ';'", 'int main(void) {\n    int apples = 5;\n    printf("%d", apples);\n}\n'],
    ["cpp", "int main() {\n    int n = 3\n    return n;\n}\n", "Add ';'", "int main() {\n    int n = 3;\n    return n;\n}\n"],
    ["java", "public class Main {\n    void f() { int x = 1 }\n}\n", "Add ';'", "public class Main {\n    void f() { int x = 1; }\n}\n"],
    ["csharp", "using System;\nint x = 1\nConsole.WriteLine(x);\n", "Add ';' to line 2", "using System;\nint x = 1;\nConsole.WriteLine(x);\n"],
    ["python", "def area(w, h)\n    return w * h\n", "Add ':'", "def area(w, h):\n    return w * h\n"],
    ["python", "x = 5\nif x > 3\n    print(x)\n", "Add ':'", "x = 5\nif x > 3:\n    print(x)\n"],
    ["python", "if x:\n    pass\nelse if y:\n    pass\n", "Write 'elif'", "if x:\n    pass\nelif y:\n    pass\n"],
    ["python", "if x = 5:\n    pass\n", "Use '=='", "if x == 5:\n    pass\n"],
    ["python", "print('hi'\n", "Add ')'", "print('hi')\n"],
    ["python", "x = [1, 2, 3\nprint(x)\n", "Add ']'", "x = [1, 2, 3]\nprint(x)\n"],
    ["python", 'print "hi"\n', "Use print(...)", 'print("hi")\n'],
    ["go", "package main\n\nfunc main() {\n\tx := 1\n\tif x = 5 {\n\t}\n}\n", "Use '=='", "package main\n\nfunc main() {\n\tx := 1\n\tif x == 5 {\n\t}\n}\n"],
    ["lua", 'local score = 72\nif score >= 50\n  print("pass")\nend\n', "Add 'then'", 'local score = 72\nif score >= 50 then\n  print("pass")\nend\n'],
    ["bash", 'score=72\nif [ "$score" -ge 50 ]\n  echo "pass"\nfi\n', "Add 'then'", 'score=72\nif [ "$score" -ge 50 ]; then\n  echo "pass"\nfi\n'],
    ["bash", "for i in 1 2 3\n  echo $i\ndone\n", "Add 'do'", "for i in 1 2 3; do\n  echo $i\ndone\n"],
  ];
  for (const [id, broken, label, fixed] of FIXES) {
    it(`${id}: "${label}" repairs ${JSON.stringify(broken.length > 44 ? `${broken.slice(0, 44)}...` : broken)} and the code then checks clean`, () => {
      const [problem] = check(id, broken);
      expect(problem.fix, JSON.stringify(problem)).toBeDefined();
      expect(problem.fix!.label).toBe(label);
      const result = applyTextEdits(broken, problem.fix!.edits);
      expect(result).toBe(fixed);
      expect(check(id, result)).toEqual([]);
    });
  }

  it("gives every problem a topic, and offers no fix where the repair is ambiguous", () => {
    const cases: [string, string, string][] = [
      ["python", "x = 1\n    y = 2\n", "indent"],
      ["python", "def f(x):\nreturn x\n", "indent"],
      ["javascript", "function f(x) {\n  return x +\n}\n", "incomplete"],
      ["ruby", 'def grade(score)\n  if score >= 50\n    "pass"\n  else\n    "fail"\nend\n\nputs grade(72)\n', "block"],
    ];
    for (const [id, code, topic] of cases) {
      const [problem] = check(id, code);
      expect(problem.topic, `${id}: ${code}`).toBe(topic);
      expect(problem.fix, `${id}: ${code}`).toBeUndefined();
    }
  });

  it("never offers to insert a ';' inside a comment", () => {
    const problems = check("c", "int main(void) {\n    int x = 1 // the count\n    return x;\n}\n");
    expect(problems.length).toBeGreaterThan(0);
    for (const p of problems) expect(p.fix).toBeUndefined();
  });
});
