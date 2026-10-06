import type { Execution, ExecutionState, ExecutionStep, Language } from "../api/types";

export type StageStatus = "idle" | "waiting" | "active" | "done" | "failed" | "skipped";

export interface Stage {
  key: string;
  label: string;
  status: StageStatus;
  detail?: string;
}

type Plan = Language["steps"];

/** The step's own label ("Compile", "Syntax check", "Link", "Run"), from the language plan. */
function stepLabel(plan: Plan, name: string, kind: string): string {
  return plan.find((s) => s.name === name)?.label ?? (kind === "compile" ? "Compile" : "Run");
}

/** Stages shown in the run pipeline: Queue -> each profile step -> Result. */
export function pipelineStages(execution: Execution | null, plan: Plan): Stage[] {
  if (!execution) {
    return [
      { key: "queue", label: "Queue", status: "idle" },
      ...plan.map((s) => ({ key: s.name, label: stepLabel(plan, s.name, s.kind), status: "idle" as const })),
      { key: "result", label: "Result", status: "idle" },
    ];
  }

  const { state } = execution;
  const queued = state === "QUEUED";
  const queue: Stage = {
    key: "queue",
    label: "Queue",
    status: queued ? "active" : "done",
    detail: queued ? (execution.queuePosition ? `#${execution.queuePosition} in line` : "waiting") : undefined,
  };

  let startingShown = false;
  const steps: Stage[] = execution.steps.map((step) => {
    const stage: Stage = { key: step.name, label: stepLabel(plan, step.name, step.kind), status: "waiting" };
    switch (step.status) {
      case "RUNNING":
        stage.status = "active";
        stage.detail = step.kind === "compile" ? "working..." : "running...";
        break;
      case "SUCCEEDED":
        stage.status = "done";
        stage.detail = formatMs(step.durationMs ?? step.wallMs);
        break;
      case "FAILED":
        stage.status = "failed";
        stage.detail = failureDetail(step);
        break;
      case "SKIPPED":
        stage.status = "skipped";
        stage.detail = "skipped";
        break;
      default:
        if (state === "STARTING" && !startingShown) {
          stage.status = "active";
          stage.detail = "starting sandbox...";
          startingShown = true;
        }
    }
    return stage;
  });

  const result: Stage = {
    key: "result",
    label: "Result",
    status: !execution.terminal ? "waiting" : state === "SUCCEEDED" ? "done" : "failed",
    detail: execution.terminal ? resultLabel(state) : undefined,
  };
  return [queue, ...steps, result];
}

export function failureDetail(step: ExecutionStep): string {
  switch (step.termination) {
    case "TIMEOUT":
      return "time limit";
    case "MEMORY_LIMIT":
      return "memory limit";
    case "OUTPUT_LIMIT":
      return "output limit";
    case "SIGNALED":
      return step.signalName ?? `signal ${step.signal}`;
    case "EXITED":
      return `exit ${step.exitCode}`;
    default:
      return "failed";
  }
}

export function resultLabel(state: ExecutionState): string {
  switch (state) {
    case "SUCCEEDED":
      return "success";
    case "COMPILE_ERROR":
      return "compile error";
    case "RUNTIME_ERROR":
      return "runtime error";
    case "TIMEOUT":
      return "time limit";
    case "MEMORY_LIMIT":
      return "memory limit";
    case "REJECTED":
      return "server busy";
    case "CANCELLED":
      return "cancelled";
    default:
      return "platform error";
  }
}

export function formatMs(ms: number | null | undefined): string | undefined {
  if (ms === null || ms === undefined) return undefined;
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(ms < 10_000 ? 2 : 1)} s`;
}

/**
 * The shell line shown above a run's output, as a student would type it:
 * "$ ./main", "$ python3 -I -B main.py". Wrappers the sandbox adds for its own
 * reasons (stdbuf for unbuffered output) and the workspace path are left out;
 * Details shows the exact command.
 */
export function promptLine(argv: string[] | undefined): string {
  if (!argv || argv.length === 0) return "./program";
  let args = [...argv];
  if (args[0] === "stdbuf") {
    args = args.slice(1);
    while (args.length > 1 && args[0].startsWith("-")) args = args.slice(1);
  }
  return args.map((a) => a.replace(/^\/workspace\//, "./")).join(" ");
}
