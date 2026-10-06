import { describe, expect, it } from "vitest";
import type { Execution, ExecutionStep, Language } from "../api/types";
import { formatMs, pipelineStages, promptLine } from "./pipeline";

const limits = { wallTimeMs: 5000, memoryMb: 256, outputKb: 64 };
const plan: Language["steps"] = [
  { name: "compile", kind: "compile", label: "Compile", argv: ["gcc"], limits },
  { name: "run", kind: "run", label: "Run", argv: ["./main"], limits },
];

function step(name: string, kind: "compile" | "run", extra: Partial<ExecutionStep> = {}): ExecutionStep {
  return {
    name, kind, status: "PENDING", termination: null, exitCode: null, signal: null, signalName: null,
    durationMs: null, wallMs: null, stdout: "", stderr: "", stdoutTruncated: false, stderrTruncated: false,
    peakMemoryBytes: null, limits, ...extra,
  };
}

function execution(extra: Partial<Execution>): Execution {
  return {
    id: "exe_1", languageId: "c", state: "QUEUED", terminal: false, summary: "", sourceHash: "sha256:x",
    sourceBytes: 1, queuePosition: null, createdAt: "2026-09-26T00:00:00Z", startedAt: null, finishedAt: null,
    toolchain: null, steps: [step("compile", "compile"), step("run", "run")], diagnostics: [], error: null,
    ...extra,
  };
}

const statuses = (e: Execution | null) => pipelineStages(e, plan).map((s) => `${s.key}:${s.status}`);

describe("pipelineStages", () => {
  it("is idle before the first run", () => {
    expect(statuses(null)).toEqual(["queue:idle", "compile:idle", "run:idle", "result:idle"]);
  });

  it("shows the queue position while queued", () => {
    const stages = pipelineStages(execution({ queuePosition: 3 }), plan);
    expect(stages[0]).toMatchObject({ status: "active", detail: "#3 in line" });
  });

  it("marks the first step active while the sandbox starts", () => {
    expect(statuses(execution({ state: "STARTING" }))).toEqual([
      "queue:done", "compile:active", "run:waiting", "result:waiting",
    ]);
  });

  it("shows a compile error and a skipped run", () => {
    const e = execution({
      state: "COMPILE_ERROR",
      terminal: true,
      steps: [
        step("compile", "compile", { status: "FAILED", termination: "EXITED", exitCode: 1 }),
        step("run", "run", { status: "SKIPPED" }),
      ],
    });
    const stages = pipelineStages(e, plan);
    expect(stages.map((s) => s.status)).toEqual(["done", "failed", "skipped", "failed"]);
    expect(stages[1].detail).toBe("exit 1");
    expect(stages[3].detail).toBe("compile error");
  });

  it("names the signal of a crash and shows durations", () => {
    const e = execution({
      state: "RUNTIME_ERROR",
      terminal: true,
      steps: [
        step("compile", "compile", { status: "SUCCEEDED", termination: "EXITED", exitCode: 0, durationMs: 130 }),
        step("run", "run", { status: "FAILED", termination: "SIGNALED", signal: 11, signalName: "SIGSEGV" }),
      ],
    });
    const stages = pipelineStages(e, plan);
    expect(stages[1].detail).toBe("130 ms");
    expect(stages[2].detail).toBe("SIGSEGV");
  });
});

describe("formatMs", () => {
  it("formats milliseconds and seconds", () => {
    expect(formatMs(87)).toBe("87 ms");
    expect(formatMs(1234)).toBe("1.23 s");
    expect(formatMs(12_345)).toBe("12.3 s");
    expect(formatMs(null)).toBeUndefined();
  });
});

describe("step labels", () => {
  it("uses the language's own step names, e.g. Python's syntax check and Go's link step", () => {
    const goPlan: Language["steps"] = [
      { name: "compile", kind: "compile", label: "Compile", argv: ["compile"], limits },
      { name: "link", kind: "compile", label: "Link", argv: ["link"], limits },
      { name: "run", kind: "run", label: "Run", argv: ["./main"], limits },
    ];
    expect(pipelineStages(null, goPlan).map((s) => s.label)).toEqual(["Queue", "Compile", "Link", "Run", "Result"]);
    const pyPlan: Language["steps"] = [
      { name: "check", kind: "compile", label: "Syntax check", argv: ["python3"], limits },
      { name: "run", kind: "run", label: "Run", argv: ["python3"], limits },
    ];
    expect(pipelineStages(null, pyPlan)[1].label).toBe("Syntax check");
  });
});

describe("the terminal's prompt line", () => {
  it("shows the command as a student would type it", () => {
    expect(promptLine(["stdbuf", "-oL", "/workspace/main"])).toBe("./main");
    expect(promptLine(["python3", "-I", "-B", "/workspace/main.py"])).toBe("python3 -I -B ./main.py");
    expect(promptLine(["java", "-cp", "/workspace", "Main"])).toBe("java -cp /workspace Main");
    expect(promptLine(undefined)).toBe("./program");
  });
});
