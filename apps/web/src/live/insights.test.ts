// The Typo Guard, Saarthi tips and code metrics on the real Tree-sitter
// grammars (the same .wasm files the browser loads), in Node.
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { Language, Parser } from "web-tree-sitter";
import { applyTextEdits } from "../lib/edits";
import manifest from "../onboarding/examples/manifest.json";
import { analyzeInsights, closest, editDistance, type Insights, type InsightCursor, type TipNode } from "./insights";

const require = createRequire(import.meta.url);

const WASM: Record<string, string> = {
  c: "tree-sitter-c/tree-sitter-c.wasm",
  cpp: "tree-sitter-cpp/tree-sitter-cpp.wasm",
  java: "tree-sitter-java/tree-sitter-java.wasm",
  python: "tree-sitter-python/tree-sitter-python.wasm",
  go: "tree-sitter-go/tree-sitter-go.wasm",
  rust: "tree-sitter-rust/tree-sitter-rust.wasm",
  csharp: "tree-sitter-c-sharp/tree-sitter-c_sharp.wasm",
  kotlin: "@tree-sitter-grammars/tree-sitter-kotlin/tree-sitter-kotlin.wasm",
  php: "tree-sitter-php/tree-sitter-php.wasm",
  ruby: "tree-sitter-ruby/tree-sitter-ruby.wasm",
  lua: "@tree-sitter-grammars/tree-sitter-lua/tree-sitter-lua.wasm",
  bash: "tree-sitter-bash/tree-sitter-bash.wasm",
  javascript: "tree-sitter-javascript/tree-sitter-javascript.wasm",
  typescript: "tree-sitter-typescript/tree-sitter-typescript.wasm",
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

function insights(lang: string, source: string): Insights {
  const tree = parsers.get(lang)!.parse(source)!;
  try {
    return analyzeInsights(tree.walk() as unknown as InsightCursor, source, lang, { tips: tree.rootNode as unknown as TipNode });
  } finally {
    tree.delete();
  }
}

/** [name flagged, suggestion] pairs. */
const typos = (lang: string, source: string) =>
  insights(lang, source).typos.map((t) => [t.message.match(/"([^"]+)" is not defined/)?.[1], t.fix?.edits[0].text]);

describe("edit distance", () => {
  it("counts insertions, deletions, substitutions and adjacent swaps as one edit", () => {
    expect(editDistance("pritnf", "printf")).toBe(1);
    expect(editDistance("retrun", "return")).toBe(1);
    expect(editDistance("prinf", "printf")).toBe(1);
    expect(editDistance("printff", "printf")).toBe(1);
    expect(editDistance("scnaf", "scanf")).toBe(1);
    expect(editDistance("abc", "xyz", 2)).toBe(3);
  });
  it("suggests the closest name and nothing for short or distant names", () => {
    expect(closest("pritnf", ["puts", "printf", "scanf"])?.word).toBe("printf");
    expect(closest("ab", ["abc"])).toBeNull();
    expect(closest("zzzzzz", ["printf"])).toBeNull();
    expect(closest("system", ["System"])?.word).toBe("System");
  });
});

describe("Typo Guard", () => {
  it("C: library names, keywords, types, members and the file's own names", () => {
    const src = `#include <stdio.h>
struct Node { int value; struct Node *next; };
int main(void) {
    int total = 0;
    itn count = 3;
    pritnf("%d\\n", totl);
    struct Node n;
    n.nxet = NULL;
    retrun 0;
}
`;
    expect(typos("c", src)).toEqual([
      ["itn", "int"],
      ["pritnf", "printf"],
      ["totl", "total"],
      ["nxet", "next"],
      ["retrun", "return"],
    ]);
  });

  it("C: the fix replaces exactly the misspelt name", () => {
    const src = "int main(void) {\n    pritnf(\"hi\");\n    return 0;\n}\n";
    const [t] = insights("c", src).typos;
    expect(applyTextEdits(src, t.fix!.edits)).toBe(src.replace("pritnf", "printf"));
    expect(t.severity).toBe("warning");
    expect(t.topic).toBe("typo");
  });

  it("C++: namespace members", () => {
    expect(typos("cpp", "#include <iostream>\nint main() {\n    std::cot << 1;\n}\n")).toEqual([["cot", "cout"]]);
  });

  it("Java: classes, System.out members, case slips and methods on values", () => {
    const src = `import java.util.Scanner;
public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextint();
        Stirng name = "Asha";
        Sytem.out.println(name);
        System.out.printn(n);
        System.out.println(name.lenght());
    }
}
`;
    expect(typos("java", src)).toEqual([
      ["nextint", "nextInt"],
      ["Stirng", "String"],
      ["Sytem", "System"],
      ["printn", "println"],
      ["lenght", "length"],
    ]);
  });

  it("Python: builtins, keywords, list methods and attributes", () => {
    const src = `class Box:
    def __init__(self, value):
        self.value = value

    def get(self):
        return self.valeu

nums = [1, 2]
nums.apend(3)
pirnt(len(nums))
`;
    expect(typos("python", src)).toEqual([
      ["valeu", "value"],
      ["apend", "append"],
      ["pirnt", "print"],
    ]);
  });

  it("Go, Rust and C#: package members and macros", () => {
    expect(typos("go", 'package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Prinln("hi")\n}\n')).toEqual([["Prinln", "Println"]]);
    expect(typos("rust", 'fn main() {\n    pritnln!("hi");\n}\n')).toEqual([["pritnln", "println"]]);
    expect(typos("csharp", 'using System;\nConsole.WriteLien("hi");\n')).toEqual([["WriteLien", "WriteLine"]]);
  });

  it("does not flag names used three or more times, short names or unknown libraries' members", () => {
    const src = "import numpy as np\nx = np.arange(10)\nprint(np.sum(x))\nfoo = 1\nfoo = foo + 1\nprint(foo)\n";
    expect(typos("python", src)).toEqual([]);
  });

  it("is quiet on every example program that compiles", () => {
    const base = join(__dirname, "../onboarding/examples");
    const m = manifest as Record<string, { starter: string; examples: { id: string; file: string; outcome: string }[] }>;
    const noisy: string[] = [];
    for (const [lang, entry] of Object.entries(m)) {
      if (!parsers.has(lang) || lang === "javascript" || lang === "typescript") continue;
      const files = [entry.starter, ...entry.examples.filter((e) => e.outcome !== "compile-error").map((e) => e.file)];
      for (const file of files) {
        const source = readFileSync(join(base, lang, file), "utf8");
        const found = insights(lang, source).typos;
        // Examples about a wrong name are allowed (and expected) to be flagged.
        if (found.length > 0 && !/name|not-defined|undefined|command-not-found|unresolved|not-in-scope|typo|call-nil|unbound/.test(file)) {
          noisy.push(`${lang}/${file}: ${found.map((t) => t.message).join(" | ")}`);
        }
      }
    }
    expect(noisy).toEqual([]);
  });

  it("flags the example about a misspelt name", () => {
    const src = readFileSync(join(__dirname, "../onboarding/examples/c/typo.c"), "utf8");
    expect(insights("c", src).typos.length).toBeGreaterThan(0);
  });

  it("covers every example file without throwing", () => {
    const base = join(__dirname, "../onboarding/examples");
    for (const lang of readdirSync(base)) {
      if (!parsers.has(lang)) continue;
      for (const file of readdirSync(join(base, lang))) insights(lang, readFileSync(join(base, lang, file), "utf8"));
    }
  });
});

describe("Saarthi tips", () => {
  const tips = (lang: string, source: string) => insights(lang, source).tips.map((t) => t.message);

  it("C: scanf without &, stray ';', assignment in a condition, integer division, array bounds, gets", () => {
    const src = `#include <stdio.h>
int main(void) {
    int n, a[5];
    scanf("%d", n);
    for (int i = 0; i < n; i++);
    if (n = 3) { }
    double half = 1 / 2;
    for (int i = 0; i <= 5; i++) a[i] = i;
    char s[10];
    gets(s);
    return 0;
}
`;
    const found = insights("c", src).tips;
    const messages = found.map((t) => t.message).join("\n");
    expect(messages).toMatch(/scanf needs the address of "n"/);
    expect(messages).toMatch(/whole loop body/);
    expect(messages).toMatch(/assigns inside the condition/);
    expect(messages).toMatch(/divides two whole numbers, so the result is 0/);
    expect(messages).toMatch(/one past the end/);
    expect(messages).toMatch(/gets\(\) was removed/);
    const scanf = found.find((t) => t.message.includes("scanf"))!;
    expect(applyTextEdits(src, scanf.fix!.edits)).toContain('scanf("%d", &n);');
    const eq = found.find((t) => t.message.includes("assigns inside"))!;
    expect(applyTextEdits(src, eq.fix!.edits)).toContain("if (n == 3)");
  });

  it("C: a variable read before it has a value", () => {
    const src = "int main(void) {\n    int sum;\n    sum += 5;\n    return sum;\n}\n";
    const [t] = insights("c", src).tips;
    expect(t.message).toMatch(/"sum" is used here before it has a value/);
    expect(applyTextEdits(src, t.fix!.edits)).toContain("int sum = 0;");
  });

  it("a while loop whose variable never changes", () => {
    expect(tips("c", "int main(void) {\n    int i = 0;\n    while (i < 10) {\n        i + 1;\n    }\n}\n")[0]).toMatch(/Nothing inside this loop changes "i"/);
    expect(tips("c", "int main(void) {\n    int i = 0;\n    while (i < 10) {\n        i++;\n    }\n}\n")).toEqual([]);
    expect(tips("python", "i = 0\nwhile i < 3:\n    print(i)\n")[0]).toMatch(/Nothing inside this loop changes "i"/);
    expect(tips("python", "i = 0\nwhile i < 3:\n    i += 1\n")).toEqual([]);
  });

  it("Java strings compared with ==", () => {
    const src = 'public class Main {\n    public static void main(String[] args) {\n        String s = "a";\n        if (s == "a") { }\n    }\n}\n';
    const [t] = insights("java", src).tips;
    expect(t.message).toMatch(/Use \.equals/);
    expect(applyTextEdits(src, t.fix!.edits)).toContain('if (s.equals("a"))');
  });

  it("Python: input() used as a number", () => {
    const src = "n = input()\nprint(n + 1)\n";
    const [t] = insights("python", src).tips;
    expect(t.message).toMatch(/input\(\) always gives text/);
    expect(applyTextEdits(src, t.fix!.edits)).toBe("n = int(input())\nprint(n + 1)\n");
  });

  it("stays quiet on correct code", () => {
    const src = `#include <stdio.h>
int main(void) {
    int n, total = 0;
    scanf("%d", &n);
    int a[5];
    for (int i = 0; i < 5; i++) a[i] = i;
    while (n > 0) { total += n % 10; n /= 10; }
    printf("%d\\n", total);
    return 0;
}
`;
    expect(tips("c", src)).toEqual([]);
  });
});

describe("symbols and metrics", () => {
  it("lists functions, variables and parameters", () => {
    const { symbols } = insights("c", "int square(int x) { return x * x; }\nint main(void) { int total = square(3); return total; }\n");
    expect(symbols).toEqual(
      expect.arrayContaining([
        { name: "square", kind: "function", line: 1 },
        { name: "x", kind: "parameter", line: 1 },
        { name: "main", kind: "function", line: 2 },
        { name: "total", kind: "variable", line: 2 },
      ]),
    );
  });

  it("estimates complexity from loop nesting and recursion", () => {
    const { metrics } = insights(
      "python",
      "def pairs(a):\n    for x in a:\n        for y in a:\n            print(x, y)\n\ndef fib(n):\n    return n if n < 2 else fib(n - 1) + fib(n - 2)\n\nn = int(input())\n",
    );
    const byName = Object.fromEntries(metrics.functions.map((f) => [f.name, f]));
    expect(byName.pairs.estimate).toBe("O(n²)");
    expect(byName.pairs.loopDepth).toBe(2);
    expect(byName.fib.estimate).toBe("O(2ⁿ)");
    expect(metrics.readsInput).toBe(true);
    expect(metrics.printsOutput).toBe(true);
  });
});

describe("Typo Guard on imports", () => {
  it("headers, Python modules and Java classes", () => {
    expect(typos("c", "#include <stdoi.h>\nint main(void) { return 0; }\n")).toEqual([[undefined, "stdio.h"]]);
    expect(typos("python", "import maths\nprint(maths.pi)\n")[0][1]).toBe("math");
    expect(typos("python", "import numpi as np\n")[0][1]).toBe("numpy");
    expect(typos("java", "import java.util.Scaner;\npublic class Main {}\n")[0][1]).toBe("Scanner");
    expect(typos("c", "#include <stdio.h>\n#include <stdlib.h>\n#include \"mylib.h\"\n")).toEqual([]);
  });
});

describe("Turbo C habits", () => {
  it("conio.h, getch, clrscr and void main get GCC-friendly tips", () => {
    const src = "#include <stdio.h>\n#include <conio.h>\nvoid main() {\n    clrscr();\n    printf(\"hi\");\n    getch();\n}\n";
    const t = insights("c", src).tips;
    const text = t.map((x) => x.message).join("\n");
    expect(text).toMatch(/conio\.h comes from Turbo C/);
    expect(text).toMatch(/clrscr\(\) is Turbo C only/);
    expect(text).toMatch(/getch\(\) is Turbo C only/);
    expect(text).toMatch(/main should return int/);
    const conio = t.find((x) => x.message.includes("conio"))!;
    expect(applyTextEdits(src, conio.fix!.edits)).not.toContain("conio");
    expect(insights("c", src).typos).toEqual([]);
  });
  it("iostream.h is corrected to iostream", () => {
    expect(typos("cpp", "#include <iostream.h>\nint main() { return 0; }\n")[0][1]).toBe("iostream");
  });
});
