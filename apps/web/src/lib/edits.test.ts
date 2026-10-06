import { describe, expect, it } from "vitest";
import { applyTextEdits, offsetAt, previewEdits } from "./edits";

describe("text edits", () => {
  const text = "int x = 1\nreturn x;\n";

  it("finds offsets from 1-based lines and columns, clamped to the line", () => {
    expect(offsetAt(text, 1, 1)).toBe(0);
    expect(offsetAt(text, 1, 10)).toBe(9);
    expect(offsetAt(text, 1, 99)).toBe(9);
    expect(offsetAt(text, 2, 1)).toBe(10);
    expect(offsetAt(text, 9, 1)).toBe(text.length);
  });

  it("inserts, replaces and applies several edits from the end backwards", () => {
    expect(applyTextEdits(text, [{ startLine: 1, startColumn: 10, endLine: 1, endColumn: 10, text: ";" }])).toBe("int x = 1;\nreturn x;\n");
    expect(applyTextEdits("if x = 5:", [{ startLine: 1, startColumn: 6, endLine: 1, endColumn: 7, text: "==" }])).toBe("if x == 5:");
    expect(
      applyTextEdits("a b", [
        { startLine: 1, startColumn: 1, endLine: 1, endColumn: 2, text: "A" },
        { startLine: 1, startColumn: 3, endLine: 1, endColumn: 4, text: "B" },
      ]),
    ).toBe("A B");
  });

  it("previews the touched lines before and after", () => {
    expect(previewEdits(text, [{ startLine: 1, startColumn: 10, endLine: 1, endColumn: 10, text: ";" }])).toEqual({
      line: 1,
      before: ["int x = 1"],
      after: ["int x = 1;"],
    });
    expect(previewEdits(text, [])).toBeNull();
  });
});
