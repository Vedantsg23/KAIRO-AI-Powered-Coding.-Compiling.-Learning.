import { Check, Clock3, Flag, Hammer, Link2, Minus, Play, ScanSearch, X } from "lucide-react";
import { Fragment, memo, useEffect, useRef } from "react";
import type { Execution, Language } from "../api/types";
import { useCelebrate } from "../cosmos/Celebrate";
import { pipelineStages, type Stage } from "./pipeline";

function stageIcon(stage: Stage) {
  if (stage.key === "queue") return Clock3;
  if (stage.key === "result") return Flag;
  if (stage.label === "Link") return Link2;
  if (stage.label === "Syntax check") return ScanSearch;
  if (stage.label === "Run") return Play;
  return Hammer;
}

function NodeIcon({ stage }: { stage: Stage }) {
  if (stage.status === "done") return <Check size={12} strokeWidth={3} />;
  if (stage.status === "failed") return <X size={12} strokeWidth={3} />;
  if (stage.status === "skipped") return <Minus size={11} />;
  const Icon = stageIcon(stage);
  return <Icon size={11} />;
}

/**
 * The build pipeline: QUEUE -> (SYNTAX CHECK / COMPILE / LINK) -> RUN -> RESULT,
 * lit up as the real run reports its progress, with each step's time or
 * failure underneath. A clean finish sends a small burst from RESULT.
 */
export const RunPipeline = memo(function RunPipeline({ execution, plan }: { execution: Execution | null; plan: Language["steps"] }) {
  const stages = pipelineStages(execution, plan);
  const busy = execution !== null && !execution.terminal;
  const count = stages.length;

  // Celebrate a success only if this view watched the run finish.
  const resultNode = useRef<HTMLSpanElement>(null);
  const watched = useRef<string | null>(null);
  const { burstFrom } = useCelebrate();
  useEffect(() => {
    if (!execution) return;
    if (!execution.terminal) {
      watched.current = execution.id;
    } else if (execution.state === "SUCCEEDED" && watched.current === execution.id) {
      watched.current = null;
      burstFrom(resultNode.current, { count: 16, spread: 70 });
    }
  }, [execution, burstFrom]);

  return (
    <section aria-label="Build pipeline" data-tour="pipeline" data-testid="pipeline" className="@container k-pipeline relative flex min-w-0 flex-1 items-center gap-3 px-3 py-1.5">
      {busy && <div className="cd-progress absolute inset-x-0 top-0 h-px" />}
      <span className="k-label hidden shrink-0 @[34rem]:inline">Pipeline</span>
      <ol className="flex min-w-0 flex-1 items-center gap-1.5">
        {stages.map((stage, i) => {
          const next = stages[i + 1];
          const link = !next
            ? null
            : stage.status === "failed" || next.status === "skipped"
              ? "failed"
              : next.status === "active"
                ? "flow"
                : next.status === "done" || next.status === "failed"
                  ? "done"
                  : "idle";
          return (
            <Fragment key={stage.key}>
              <li className="flex min-w-0 items-center gap-1.5" aria-label={`${stage.label}: ${stage.status}`}>
                <span
                  ref={i === count - 1 ? resultNode : undefined}
                  className="cd-station"
                  data-status={stage.status}
                  data-result={i === count - 1 && stage.status === "done" ? "success" : undefined}
                >
                  <NodeIcon stage={stage} />
                </span>
                <span className="flex min-w-0 flex-col leading-none">
                  <span className={`truncate font-mono text-[9.5px] font-bold uppercase tracking-[0.1em] ${stage.status === "idle" || stage.status === "waiting" ? "text-faint" : "text-fg"}`}>
                    {stage.label}
                  </span>
                  <span className={`mt-0.5 min-h-[10px] truncate font-mono text-[9.5px] ${stage.status === "failed" ? "text-danger-fg" : "text-faint"} max-lg:hidden`} title={stage.detail}>
                    {stage.detail ?? ""}
                  </span>
                </span>
              </li>
              {link && <li className="k-link shrink-0" data-state={link} aria-hidden />}
            </Fragment>
          );
        })}
      </ol>
    </section>
  );
});
