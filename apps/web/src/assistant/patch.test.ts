import { describe, expect, it } from "vitest";
import { diffLines } from "./patch";

const SOURCE = "#include <stdio.h>\nint main(void) {\n    int x = 1\n    printf(\"%d\", x);\n}\n";

describe("diffLines", () => {
  it("shows the replaced line with one line of context", () => {
    const lines = diffLines(SOURCE, [{ startLine: 3, endLine: 3, replacement: "    int x = 1;" }]);
    expect(lines.map((l) => `${l.kind[0]}${l.number}:${l.text}`)).toEqual([
      "c2:int main(void) {",
      "r3:    int x = 1",
      "a3:    int x = 1;",
      'c4:    printf("%d", x);',
    ]);
  });

  it("numbers added lines in the patched file and marks gaps between edits", () => {
    const text = Array.from({ length: 10 }, (_, i) => `line ${i + 1}`).join("\n");
    const lines = diffLines(text, [
      { startLine: 2, endLine: 2, replacement: "two\ntwo and a half" },
      { startLine: 8, endLine: 8, replacement: "" },
    ]);
    const added = lines.filter((l) => l.kind === "added").map((l) => l.number);
    expect(added).toEqual([2, 3]);
    expect(lines.some((l) => l.kind === "gap")).toBe(true);
    expect(lines.filter((l) => l.kind === "removed").map((l) => l.number)).toEqual([2, 8]);
  });
});
