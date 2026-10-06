import { AlarmClock, CheckCircle2, Play, Upload, XCircle, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import type { Language } from "../api/types";
import { LanguageBadge } from "../layout/LanguagePicker";
import { Button, Dialog } from "../ui/primitives";
import { examplesFor, outcomeLabel, type Example, type Outcome } from "./examples";

const OUTCOME_STYLE: Record<Outcome, { className: string; icon: typeof CheckCircle2 }> = {
  runs: { className: "bg-brand/12 text-brand-fg", icon: CheckCircle2 },
  "compile-error": { className: "bg-danger/12 text-danger-fg", icon: XCircle },
  "runtime-error": { className: "bg-warn/15 text-warn-fg", icon: Zap },
  "time-limit": { className: "bg-info/15 text-info-fg", icon: AlarmClock },
};

const FILTERS: (Outcome | "all")[] = ["all", "runs", "compile-error", "runtime-error", "time-limit"];

export function ExampleGallery({
  open,
  language,
  onClose,
  onLoad,
}: {
  open: boolean;
  language: Language | null;
  onClose(): void;
  onLoad(example: Example, runNow: boolean): void;
}) {
  const [filter, setFilter] = useState<Outcome | "all">("all");
  const examples = language ? examplesFor(language.id) : [];
  const compileLabel = language?.steps.find((s) => s.kind === "compile")?.label ?? "Compile";
  const present = new Set(examples.map((e) => e.outcome));
  const filters = FILTERS.filter((f) => f === "all" || present.has(f));
  const shown = examples.filter((e) => filter === "all" || e.outcome === filter);
  useEffect(() => setFilter("all"), [language?.id]);

  return (
    <Dialog open={open} onClose={onClose} labelledBy="examples-title" width="max-w-3xl">
      <div className="border-b border-line px-6 pb-4 pt-5">
        <p className="k-label">Examples / {language?.displayName ?? ""}</p>
        <h2 id="examples-title" className="mt-1 flex items-center gap-2 text-lg font-semibold text-fg">
          {language && <LanguageBadge id={language.id} />}
          {language?.displayName ?? ""} examples
        </h2>
        <p className="mt-0.5 text-sm text-muted">
          Load a program and run it to see how each kind of problem is reported. Loading replaces the editor text; press Ctrl+Z
          in the editor to get your code back. Other languages have their own examples: switch language first.
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Filter examples">
          {filters.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={`rounded-md border px-2.5 py-1 font-mono text-[10.5px] font-semibold uppercase tracking-wider transition-colors ${
                filter === f ? "border-brand bg-brand text-on-brand" : "border-line bg-surface text-muted hover:text-fg"
              }`}
            >
              {f === "all" ? "All" : outcomeLabel(f, compileLabel)}
            </button>
          ))}
        </div>
      </div>
      <ul className="cd-scroll grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto p-5 sm:grid-cols-2">
        {shown.map((example) => {
          const style = OUTCOME_STYLE[example.outcome];
          const Icon = style.icon;
          return (
            <li key={example.id} className="flex flex-col rounded-md border border-line bg-surface p-3.5 transition-colors hover:border-brand/50">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-fg">{example.title}</p>
                <span className={`inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[10.5px] font-semibold ${style.className}`}>
                  <Icon size={11} />
                  {outcomeLabel(example.outcome, compileLabel)}
                </span>
              </div>
              <p className="mt-1 flex-1 text-xs leading-relaxed text-muted">{example.description}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {example.concepts.map((c) => (
                  <span key={c} className="rounded bg-fg/6 px-1.5 py-px text-[10.5px] text-faint">
                    {c}
                  </span>
                ))}
                {example.stdin && (
                  <span className="rounded bg-info/12 px-1.5 py-px text-[10.5px] text-info-fg" title="Comes with input for the Input tab">
                    uses input
                  </span>
                )}
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="primary" onClick={() => onLoad(example, true)} data-testid={`example-run-${example.id}`}>
                  <Play size={12} fill="currentColor" /> Load and run
                </Button>
                <Button size="sm" onClick={() => onLoad(example, false)} data-testid={`example-load-${example.id}`}>
                  <Upload size={12} /> Load only
                </Button>
              </div>
            </li>
          );
        })}
        {shown.length === 0 && <li className="col-span-full py-8 text-center text-sm text-faint">No examples for this language yet.</li>}
      </ul>
    </Dialog>
  );
}
