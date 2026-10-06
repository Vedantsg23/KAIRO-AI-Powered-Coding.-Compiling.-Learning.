import { describe, expect, it } from "vitest";
import type { Diagnostic } from "../api/types";
import { diagnosticsToMarkers, liveProblemsToMarkers } from "./markers";

const base: Diagnostic = {
  id: "diag_1",
  source: "compiler",
  severity: "error",
  category: "syntax",
  code: "C_MISSING_SEMICOLON",
  message: "expected ',' or ';' before 'printf'",
  file: "main.c",
  range: { startLine: 5, startColumn: 5, endLine: 5, endColumn: 11 },
  relatedLocations: [
    {
      file: "main.c",
      range: { startLine: 4, startColumn: 13, endLine: 4, endColumn: 14 },
      message: "The missing ';' probably belongs at the end of this line.",
    },
  ],
  executionId: "exe_1",
  rawOutputReference: null,
};

describe("diagnosticsToMarkers", () => {
  it("maps a located diagnostic and its related hint", () => {
    const markers = diagnosticsToMarkers([base], "main.c", "GCC");
    expect(markers).toEqual([
      {
        severity: "error",
        message: base.message,
        code: "C_MISSING_SEMICOLON",
        source: "GCC",
        startLineNumber: 5,
        startColumn: 5,
        endLineNumber: 5,
        endColumn: 11,
      },
      {
        severity: "hint",
        message: "The missing ';' probably belongs at the end of this line.",
        code: "C_MISSING_SEMICOLON",
        source: "note",
        startLineNumber: 4,
        startColumn: 13,
        endLineNumber: 4,
        endColumn: 14,
      },
    ]);
  });

  it("skips diagnostics without a range or for other files", () => {
    const crash: Diagnostic = { ...base, source: "runtime", code: "RUNTIME_SEGMENTATION_FAULT", range: null, file: null };
    const header: Diagnostic = { ...base, file: "/usr/include/stdio.h", relatedLocations: [] };
    expect(diagnosticsToMarkers([crash, header], "main.c", "GCC")).toEqual([]);
  });
});

describe("liveProblemsToMarkers", () => {
  it("labels live problems so they are not mistaken for compiler output", () => {
    const [marker] = liveProblemsToMarkers([
      { kind: "missing", message: "Missing ';' (end of statement)", startLine: 2, startColumn: 13, endLine: 2, endColumn: 14 },
    ]);
    expect(marker).toMatchObject({ severity: "error", source: "live check", code: "LIVE_MISSING", startLineNumber: 2 });
    expect(marker.message).toContain("Missing ';'");
    expect(marker.message).toContain("Live syntax check");
  });
});
