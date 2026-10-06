import { AlertCircle, AlertTriangle, BookOpen, ChevronRight, Info, Lightbulb, ScrollText, Wand2 } from "lucide-react";
import { useState } from "react";
import type { Diagnostic, RawOutputReference } from "../api/types";
import { SaarthiMark } from "../layout/Logo";
import { Badge, Button } from "../ui/primitives";
import { CATEGORY_LABEL, locationLabel, splitMessage } from "./format";
import { noteFor } from "./notes";

const SEVERITY_ICON = {
  error: <AlertCircle size={14} className="text-danger-fg" />,
  warning: <AlertTriangle size={14} className="text-warn-fg" />,
  info: <Info size={14} className="text-info-fg" />,
};

const SEVERITY_BAR = { error: "bg-danger", warning: "bg-warn", info: "bg-info" };
const SEVERITY_CHIP = {
  error: "border-danger/35 bg-danger/10 text-danger-fg",
  warning: "border-warn/40 bg-warn/12 text-warn-fg",
  info: "border-info/35 bg-info/10 text-info-fg",
};

interface Props {
  /** Position in the list, shown as 01, 02... */
  index?: number;
  diagnostic: Diagnostic;
  selected: boolean;
  stale: boolean;
  fileName: string;
  saarthi: boolean;
  onSelect(): void;
  onReveal(line: number, column: number): void;
  onShowRaw(ref: RawOutputReference): void;
  onExplain(): void;
  onFix(): void;
}

export function DiagnosticCard(props: Props) {
  const { diagnostic: d, selected, stale, onSelect, onReveal, onShowRaw } = props;
  const [open, setOpen] = useState(false);
  const { text, flag } = splitMessage(d.message);
  const note = noteFor(d.code, d.category);
  const location = locationLabel(d);
  // Related notes can point into library files (e.g. a C++ header): only
  // locations in the student's own file can be revealed in the editor.
  const related = (d.relatedLocations ?? []).filter((r) => r.range);
  const inOwnFile = (file: string | null | undefined) => !file || file === props.fileName;

  return (
    <li
      data-testid="diagnostic"
      data-code={d.code}
      onClick={onSelect}
      className={`group relative overflow-hidden rounded-md border transition-colors ${
        selected ? "border-brand/55 bg-brand/[0.05]" : "border-line bg-surface hover:border-line-strong"
      } ${stale ? "opacity-60" : ""}`}
    >
      <span className={`absolute inset-y-0 left-0 w-[3px] ${SEVERITY_BAR[d.severity]}`} />
      <div className="py-2 pl-3.5 pr-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {props.index !== undefined && <span className="font-mono text-[10px] font-semibold text-faint">{String(props.index).padStart(2, "0")}</span>}
          <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-px font-mono text-[9.5px] font-bold uppercase tracking-[0.1em] ${SEVERITY_CHIP[d.severity]}`}>
            {SEVERITY_ICON[d.severity]}
            {d.severity}
          </span>
          <Badge className="bg-fg/6 text-muted">{CATEGORY_LABEL[d.category]}</Badge>
          <span className="truncate font-mono text-[10.5px] text-faint">{d.code}</span>
          {location && d.range && inOwnFile(d.file) && (
            <button
              type="button"
              disabled={stale}
              onClick={(e) => {
                e.stopPropagation();
                onReveal(d.range!.startLine, d.range!.startColumn);
              }}
              className="ml-auto rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold text-brand-fg hover:bg-brand/10 disabled:cursor-not-allowed disabled:text-faint disabled:hover:bg-transparent"
              title={stale ? "The code has changed since this run" : "Show in editor"}
            >
              {location} &rarr;
            </button>
          )}
          {!location && <span className="ml-auto font-mono text-[10.5px] text-faint">{d.source === "runtime" ? "while running" : "whole program"}</span>}
        </div>
        <p className="mt-1.5 text-[13px] font-medium leading-snug text-fg">
          {text}
          {flag && <span className="ml-1.5 font-mono text-[11px] font-normal text-faint">[{flag}]</span>}
        </p>

        {related.map((r, i) =>
          inOwnFile(r.file) ? (
            <button
              key={i}
              type="button"
              disabled={stale}
              onClick={(e) => {
                e.stopPropagation();
                onReveal(r.range!.startLine, r.range!.startColumn);
              }}
              className="mt-1.5 flex w-full items-start gap-1.5 rounded border border-line bg-raised px-2 py-1 text-left text-xs text-muted hover:border-brand/40 disabled:hover:border-line"
            >
              <Lightbulb size={13} className="mt-px shrink-0 text-warn-fg" />
              <span>
                <b className="font-semibold text-fg">Line {r.range!.startLine}:</b> {r.message}
              </span>
            </button>
          ) : (
            <p key={i} className="mt-1.5 flex items-start gap-1.5 rounded border border-line bg-raised px-2 py-1 text-xs text-faint">
              <Lightbulb size={13} className="mt-px shrink-0" />
              <span>
                <b className="font-semibold">{r.file ?? "library"}:</b> {r.message}
              </span>
            </p>
          ),
        )}

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <button
            type="button"
            aria-expanded={open}
            onClick={(e) => {
              e.stopPropagation();
              setOpen((v) => !v);
            }}
            className="flex items-center gap-1 text-xs font-semibold text-muted hover:text-brand-fg"
          >
            <ChevronRight size={13} className={`transition-transform ${open ? "rotate-90" : ""}`} />
            What does this mean?
          </button>
          {d.rawOutputReference && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onShowRaw(d.rawOutputReference!);
              }}
              className="flex items-center gap-1 text-xs text-faint hover:text-brand-fg"
            >
              <ScrollText size={12} />
              Raw output
            </button>
          )}
          {props.saarthi && !stale && d.code !== "UNPARSED" && (
            <span className="ml-auto flex items-center gap-1.5">
              <Button
                size="sm"
                variant="ai"
                data-testid="explain-button"
                onClick={(e) => {
                  e.stopPropagation();
                  props.onExplain();
                }}
              >
                <SaarthiMark size={14} /> Explain
              </Button>
              {d.severity !== "info" && (
                <Button
                  size="sm"
                  variant="ghost"
                  data-testid="fix-button"
                  title="Saarthi proposes a small patch; nothing changes until you accept it"
                  onClick={(e) => {
                    e.stopPropagation();
                    props.onFix();
                  }}
                >
                  <Wand2 size={13} /> Suggest fix
                </Button>
              )}
            </span>
          )}
        </div>

        {open && (
          <div className="mt-2 animate-fade-in rounded border border-line bg-raised p-2.5 text-xs leading-relaxed">
            <p className="font-semibold text-fg">{note.title}</p>
            <p className="mt-1 text-muted">{note.meaning}</p>
            <p className="mt-1.5 text-fg">
              <b>Try:</b> {note.tip}
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1 rounded border border-brand/30 bg-brand/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-brand-fg">
                <BookOpen size={11} /> Concept: {note.concept}
              </span>
              <span className="text-[10px] text-faint">Quick note, written by people, not AI</span>
            </div>
          </div>
        )}
      </div>
    </li>
  );
}
