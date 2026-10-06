import { describe, expect, it } from "vitest";
import type { Execution } from "../api/types";
import { moodFor, type MoodInput } from "./mood";

function execution(state: string, terminal: boolean, errors = 0): Execution {
  return {
    id: "exe_1",
    state,
    terminal,
    diagnostics: Array.from({ length: errors }, (_, i) => ({ id: `d${i}`, severity: "error" })),
  } as unknown as Execution;
}

const base: MoodInput = { execution: null, stale: false, liveProblemCount: 0, edits: 0 };

describe("mood", () => {
  it("is calm with nothing going on, and typing while the student types", () => {
    expect(moodFor(base, false, false)).toBe("calm");
    expect(moodFor(base, true, false)).toBe("typing");
  });

  it("a run in flight wins over everything else", () => {
    expect(moodFor({ ...base, execution: execution("RUNNING", false), liveProblemCount: 2 }, true, true)).toBe("running");
  });

  it("celebrates a success, then shows errors of the current run before live warnings", () => {
    expect(moodFor({ ...base, execution: execution("SUCCEEDED", true) }, false, true)).toBe("success");
    expect(moodFor({ ...base, execution: execution("COMPILE_ERROR", true, 1), liveProblemCount: 1 }, false, false)).toBe("error");
    expect(moodFor({ ...base, execution: execution("TIMEOUT", true) }, false, false)).toBe("error");
  });

  it("ignores the results of code that has changed since", () => {
    const input = { ...base, execution: execution("COMPILE_ERROR", true, 1), stale: true };
    expect(moodFor(input, false, false)).toBe("calm");
    expect(moodFor({ ...input, liveProblemCount: 1 }, false, false)).toBe("warn");
  });
});
