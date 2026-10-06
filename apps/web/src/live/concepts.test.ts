// Concept detection on the real Tree-sitter grammars (the .wasm files the browser loads).
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { beforeAll, describe, expect, it } from "vitest";
import { Language, Parser } from "web-tree-sitter";
import { conceptAt, conceptsInFile, type ConceptNode } from "./concepts";

const require = createRequire(import.meta.url);
const WASM: Record<string, string> = {
  c: "tree-sitter-c/tree-sitter-c.wasm",
  cpp: "tree-sitter-cpp/tree-sitter-cpp.wasm",
  java: "tree-sitter-java/tree-sitter-java.wasm",
  python: "tree-sitter-python/tree-sitter-python.wasm",
  javascript: "tree-sitter-javascript/tree-sitter-javascript.wasm",
  go: "tree-sitter-go/tree-sitter-go.wasm",
  bash: "tree-sitter-bash/tree-sitter-bash.wasm",
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

/** The concept where `marker` is in the code (the marker is removed first). */
function at(id: string, code: string, marker = "|") {
  const index = code.indexOf(marker);
  const text = code.replace(marker, "");
  const before = text.slice(0, index).split("\n");
  const tree = parsers.get(id)!.parse(text)!;
  const root = tree.rootNode as unknown as ConceptNode;
  const result = { ...conceptAt(root, before.length - 1, before[before.length - 1].length), inFile: conceptsInFile(root) };
  tree.delete();
  return result;
}

describe("concept detection", () => {
  it("C: printf's arguments are output, inside main(), even inside its format string", () => {
    const c = at("c", '#include <stdio.h>\nint main(void) {\n    printf("%d\\n", |42);\n    return 0;\n}\n');
    expect(c.path).toEqual(["Input & output", "Formatted output (printf)", "Arguments"]);
    expect(c.scope).toBe("main()");
    expect(at("c", 'int main(void) {\n    printf("T|otal");\n}\n').path).toEqual(["Input & output", "Formatted output (printf)", "Arguments"]);
    expect(at("c", 'int main(void) {\n    char *s = "h|i";\n}\n').path).toEqual(["Data types", "Strings"]);
  });

  it("C: a call to our own function, its parameters, a pointer and a loop", () => {
    const code = "int add(int a, int |b) { return a + b; }\nint main(void) {\n    int *p = 0;\n    for (int i = 0; i < 3; i++) { add(i, 1); }\n}\n";
    expect(at("c", code).path).toEqual(["Functions", "Parameters"]);
    expect(at("c", code.replace("|", "").replace("add(i, 1)", "add(|i, 1)")).path).toEqual(["Functions", "Function calls", "Arguments"]);
    expect(at("c", code.replace("|", "").replace("*p", "*|p")).path).toEqual(["Memory", "Pointers"]);
    expect(at("c", code.replace("|", "").replace("i < 3", "i |< 3")).path[0]).toBe("Expressions");
    const inFile = at("c", code).inFile;
    expect(inFile).toEqual(expect.arrayContaining(["Functions", "Memory", "Control flow"]));
  });

  it("C++: std::cout is an output stream", () => {
    const c = at("cpp", '#include <iostream>\nint main() {\n    std::cout << "hi" << |std::endl;\n}\n');
    expect(c.path).toEqual(["Input & output", "Output streams (std::cout)"]);
    expect(c.scope).toBe("main()");
  });

  it("Python: for loop over range(), a def's parameters, an if", () => {
    expect(at("python", "for i in ra|nge(3):\n    print(i)\n").path).toEqual(["Control flow", "Loops", "range()"]);
    expect(at("python", "def area(w, |h):\n    return w * h\n")).toMatchObject({ path: ["Functions", "Parameters"], scope: "area()" });
    expect(at("python", "x = 5\nif x > 3:\n    y = |1\n").path).toEqual(["Variables", "Assignment"]);
    expect(at("python", "x = 5\nif x |> 3:\n    pass\n").path).toEqual(["Expressions", "Comparison"]);
  });

  it("Java: System.out.println, new objects, and the class around them", () => {
    const code = 'import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        List<Integer> xs = new ArrayList<>();\n        System.out.println(|xs);\n    }\n}\n';
    expect(at("java", code)).toMatchObject({ path: ["Input & output", "Output (System.out.println)", "Arguments"], scope: "main()" });
    expect(at("java", code.replace("|", "").replace("new ArrayList", "new |ArrayList")).path).toEqual(["Object-oriented", "Creating objects"]);
  });

  it("JavaScript, Go and Bash use the shared names", () => {
    expect(at("javascript", "const xs = [1, 2].map((x) => x |* 2);\nconsole.log(xs);\n").path).toEqual(["Expressions", "Operators"]);
    expect(at("javascript", "console.log(|1);\n").path).toEqual(["Input & output", "Output (console.log)", "Arguments"]);
    expect(at("go", 'package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println(|1)\n}\n')).toMatchObject({
      path: ["Input & output", "Output (fmt.Println)", "Arguments"],
      scope: "main()",
    });
    expect(at("bash", "for i in 1 2 3; do\n  e|cho $i\ndone\n").path).toEqual(["Input & output", "Output (echo)"]);
  });
});
