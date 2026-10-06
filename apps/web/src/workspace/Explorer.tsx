import { ChevronDown, FileCode2, FileInput, FolderOpen, Play, Upload } from "lucide-react";
import { memo, useMemo, useState, type ReactNode } from "react";
import type { Language } from "../api/types";
import type { HealthView } from "../layout/StatusBar";
import { LANGUAGE_BADGE, toolchainLabel } from "../layout/LanguagePicker";
import type { LiveState } from "../live/useLiveCheck";
import { examplesFor, outcomeLabel, type Example, type Outcome } from "../onboarding/examples";
import { Spot } from "../fx/pointer";
import { PanelHead } from "../ui/primitives";

const OUTCOME_DOT: Record<Outcome, string> = {
  runs: "bg-brand",
  "compile-error": "bg-danger",
  "runtime-error": "bg-warn",
  "time-limit": "bg-info",
};

interface Props {
  languages: Language[];
  language: Language | null;
  /** Languages with a saved draft in this browser. */
  draftIds: string[];
  onOpenLanguage(id: string): void;
  inputLines: number;
  onOpenInput(): void;
  onLoadExample(example: Example, runNow: boolean): void;
  onOpenExamples(): void;
  busy: boolean;
  system: {
    health: HealthView;
    saarthi: "checking" | "online" | "offline";
    live: LiveState["status"];
    languages: { ready: number; total: number } | null;
  };
}

function Section({ title, children, right, defaultOpen = true }: { title: string; children: ReactNode; right?: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="border-b border-line last:border-b-0">
      <div className="flex h-8 items-center gap-1 px-2">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="flex min-w-0 flex-1 items-center gap-1 rounded text-left hover:text-fg"
        >
          <ChevronDown size={12} className={`shrink-0 text-faint transition-transform ${open ? "" : "-rotate-90"}`} />
          <span className="k-label truncate">{title}</span>
        </button>
        {right}
      </div>
      {open && <div className="pb-2">{children}</div>}
    </section>
  );
}

function StatusRow({ label, value, tone }: { label: string; value: string; tone: "ok" | "warn" | "bad" | "ai" | "idle" }) {
  const dot = { ok: "bg-brand", warn: "bg-warn", bad: "bg-danger", ai: "bg-ai", idle: "bg-faint" }[tone];
  const text = { ok: "text-brand-fg", warn: "text-warn-fg", bad: "text-danger-fg", ai: "text-ai-fg", idle: "text-muted" }[tone];
  return (
    <li className="flex items-center gap-2 px-3 py-[3px] font-mono text-[10px] uppercase tracking-[0.08em]">
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} aria-hidden />
      <span className="truncate text-faint">{label}</span>
      <span className="min-w-3 flex-1 border-b border-dotted border-line-strong" aria-hidden />
      <b className={`shrink-0 font-semibold ${text}`}>{value}</b>
    </li>
  );
}

/**
 * The explorer: this browser's drafts as files (one per language), the
 * program's input, the current language's examples and the system status.
 */
export const Explorer = memo(function Explorer(props: Props) {
  const { language, system } = props;
  const examples = useMemo(() => (language ? examplesFor(language.id) : []), [language]);
  const compileLabel = language?.steps.find((s) => s.kind === "compile")?.label ?? "Compile";
  const files = useMemo(() => {
    const ids = new Set(props.draftIds);
    if (language) ids.add(language.id);
    return props.languages.filter((l) => ids.has(l.id)).sort((a, b) => (a.id === language?.id ? -1 : b.id === language?.id ? 1 : a.sourceFile.localeCompare(b.sourceFile)));
  }, [props.languages, props.draftIds, language]);

  const live =
    system.live === "unsupported"
      ? { value: "run to check", tone: "idle" as const }
      : system.live === "error"
        ? { value: "unavailable", tone: "warn" as const }
        : system.live === "loading"
          ? { value: "loading", tone: "idle" as const }
          : { value: "ready", tone: "ok" as const };

  return (
    <aside className="k-panel h-full" aria-label="Explorer" data-testid="explorer">
      <Spot />
      <PanelHead index="01" title="Explorer">
        <FolderOpen size={13} className="text-faint" aria-hidden />
      </PanelHead>
      <div className="cd-scroll min-h-0 flex-1 overflow-y-auto">
        <Section title="Workspace">
          <ul aria-label="Files">
            {files.map((l) => {
              const active = l.id === language?.id;
              return (
                <li key={l.id}>
                  <button
                    type="button"
                    onClick={() => props.onOpenLanguage(l.id)}
                    aria-current={active ? "true" : undefined}
                    data-testid={`explorer-file-${l.id}`}
                    title={`${l.displayName} · ${toolchainLabel(l)}${active ? "" : ". Open this draft"}`}
                    className={`group flex w-full items-center gap-2 border-l-2 py-1 pl-4 pr-2 text-left text-[12.5px] transition-colors ${
                      active ? "border-brand bg-brand/8 font-semibold text-fg" : "border-transparent text-muted hover:bg-fg/4 hover:text-fg"
                    }`}
                  >
                    <FileCode2 size={14} className={active ? "text-brand-fg" : "text-faint"} aria-hidden />
                    <span className="min-w-0 flex-1 truncate font-mono">{l.sourceFile}</span>
                    <span className="font-mono text-[9.5px] font-bold text-faint">{LANGUAGE_BADGE[l.id] ?? l.id}</span>
                  </button>
                </li>
              );
            })}
            <li>
              <button
                type="button"
                onClick={props.onOpenInput}
                data-testid="explorer-input"
                title="The program's standard input"
                className="flex w-full items-center gap-2 border-l-2 border-transparent py-1 pl-4 pr-2 text-left text-[12.5px] text-muted hover:bg-fg/4 hover:text-fg"
              >
                <FileInput size={14} className="text-faint" aria-hidden />
                <span className="min-w-0 flex-1 truncate font-mono">stdin.txt</span>
                <span className="font-mono text-[9.5px] text-faint">{props.inputLines ? `${props.inputLines} ln` : "empty"}</span>
              </button>
            </li>
          </ul>
          <p className="px-4 pt-1.5 text-[10.5px] leading-snug text-faint">Drafts are saved in this browser, one per language.</p>
        </Section>

        <Section
          title={`Examples · ${language?.displayName ?? ""}`}
          right={
            <button type="button" onClick={props.onOpenExamples} className="shrink-0 rounded px-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-brand-fg hover:underline">
              All
            </button>
          }
        >
          <ul aria-label="Examples">
            {examples.slice(0, 7).map((example) => (
              <li key={example.id} className="group flex items-center gap-2 py-0.5 pl-4 pr-1.5 hover:bg-fg/4">
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${OUTCOME_DOT[example.outcome]}`} title={outcomeLabel(example.outcome, compileLabel)} aria-hidden />
                <span className="min-w-0 flex-1 truncate text-[12px] text-muted group-hover:text-fg" title={`${example.title}: ${outcomeLabel(example.outcome, compileLabel)}`}>
                  {example.title}
                </span>
                <button
                  type="button"
                  onClick={() => props.onLoadExample(example, false)}
                  aria-label={`Load "${example.title}"`}
                  title="Load"
                  data-testid={`explorer-load-${example.id}`}
                  className="rounded p-1 text-faint opacity-0 hover:bg-fg/8 hover:text-fg focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <Upload size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => props.onLoadExample(example, true)}
                  disabled={props.busy}
                  aria-label={`Load and run "${example.title}"`}
                  title="Load and run"
                  data-testid={`explorer-run-${example.id}`}
                  className="rounded p-1 text-brand-fg hover:bg-brand/12 disabled:opacity-40"
                >
                  <Play size={12} fill="currentColor" />
                </button>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      <section className="border-t border-line bg-raised pb-2 pt-1.5" aria-label="System status" data-testid="system-status">
        <p className="k-label px-3 pb-1">System</p>
        <ul>
          <StatusRow label="Compiler core" value={system.health.core ? "online" : "offline"} tone={system.health.core ? "ok" : "bad"} />
          <StatusRow
            label="Sandbox"
            value={system.health.text.replace(/^Sandbox /, "").replace("...", "")}
            tone={system.health.dot === "bg-brand" ? "ok" : system.health.dot === "bg-warn" ? "warn" : system.health.dot === "bg-danger" ? "bad" : "idle"}
          />
          <StatusRow label="Saarthi AI" value={system.saarthi} tone={system.saarthi === "online" ? "ai" : system.saarthi === "offline" ? "warn" : "idle"} />
          <StatusRow label="Live analyzer" value={live.value} tone={live.tone} />
          {system.languages && <StatusRow label="Languages" value={`${system.languages.ready}/${system.languages.total}`} tone="ok" />}
          {language && <StatusRow label="Toolchain" value={toolchainLabel(language)} tone="idle" />}
        </ul>
      </section>
    </aside>
  );
});
