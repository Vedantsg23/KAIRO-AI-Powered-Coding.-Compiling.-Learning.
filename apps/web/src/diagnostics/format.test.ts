import { describe, expect, it } from "vitest";
import type { Diagnostic } from "../api/types";
import { countBySeverity, sortDiagnostics, splitMessage } from "./format";
import { NOTES, noteFor } from "./notes";

const d = (severity: Diagnostic["severity"], line: number | null, code = "X"): Diagnostic => ({
  id: `${severity}-${line}`,
  source: "compiler",
  severity,
  category: "other",
  code,
  message: "m",
  file: "main.c",
  range: line === null ? null : { startLine: line, startColumn: 1, endLine: line, endColumn: 2 },
  relatedLocations: [],
  executionId: null,
  rawOutputReference: null,
});

describe("splitMessage", () => {
  it("separates compiler codes", () => {
    expect(splitMessage("Type 'string' is not assignable to type 'number'. [TS2322]").flag).toBe("TS2322");
    expect(splitMessage("; expected [CS1002]").flag).toBe("CS1002");
    expect(splitMessage("mismatched types: expected `i32`, found `&str` [E0308]").flag).toBe("E0308");
    expect(splitMessage("see [docs]").flag).toBeNull();
  });

  it("separates GCC's warning flag", () => {
    expect(splitMessage("unused variable 'x' [-Wunused-variable]")).toEqual({
      text: "unused variable 'x'",
      flag: "-Wunused-variable",
    });
    expect(splitMessage("format '%d' expects argument [-Wformat=]").flag).toBe("-Wformat=");
    expect(splitMessage("expected ';' before 'return'")).toEqual({ text: "expected ';' before 'return'", flag: null });
  });
});

describe("sortDiagnostics", () => {
  it("puts errors first, then warnings, by line", () => {
    const sorted = sortDiagnostics([d("warning", 2), d("error", 9), d("info", 1), d("error", 3), d("error", null)]);
    expect(sorted.map((x) => x.id)).toEqual(["error-3", "error-9", "error-null", "warning-2", "info-1"]);
  });
});

describe("countBySeverity", () => {
  it("counts each severity", () => {
    expect(countBySeverity([d("error", 1), d("error", 2), d("warning", 3)])).toEqual({ error: 2, warning: 1, info: 0 });
  });
});

describe("notes", () => {
  it("has a note for the codes the C adapter and synthesis produce", () => {
    for (const code of [
      "C_MISSING_SEMICOLON", "C_UNDECLARED_IDENTIFIER", "C_IMPLICIT_FUNCTION_DECLARATION", "C_MISSING_HEADER",
      "C_UNDEFINED_REFERENCE", "C_WRONG_ARGUMENT_COUNT", "C_FORMAT_MISMATCH", "RUNTIME_SEGMENTATION_FAULT",
      "RUNTIME_ARITHMETIC_ERROR", "LIMIT_TIMEOUT", "LIMIT_MEMORY", "LIMIT_OUTPUT", "UNPARSED",
    ]) {
      expect(NOTES[code], code).toBeDefined();
    }
  });

  it("uses language-neutral notes by code ending for every language", () => {
    expect(noteFor("PY_NAME_ERROR", "name").title).toBe("Name not defined");
    expect(noteFor("JS_NOT_DEFINED", "name").title).toBe("Name not defined");
    expect(noteFor("JAVA_INDEX_OUT_OF_BOUNDS", "runtime").title).toBe("Index out of range");
    expect(noteFor("GO_NIL_MAP", "runtime").title).toBe("Missing value (null / nil / None)");
    expect(noteFor("RS_STACK_OVERFLOW", "runtime").title).toBe("Recursion too deep");
    expect(noteFor("CS_SYNTAX_ERROR", "syntax").title).toBe("Syntax problem");
  });

  it("falls back to a category note for unknown codes", () => {
    expect(noteFor("C_SOMETHING_NEW", "type").title).toBe("Type problem");
  });
});
