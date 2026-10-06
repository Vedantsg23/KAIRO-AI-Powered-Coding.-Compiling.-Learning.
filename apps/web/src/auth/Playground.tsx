import { CheckCircle2, Loader2, RotateCcw, Wrench, Zap } from "lucide-react";
import { useRef, useState } from "react";
import { play } from "../fx/sound";
import { useInView } from "../fx/scroll";
import { applyTextEdits } from "../lib/edits";
import { LIVE_DEBOUNCE_MS } from "../live/support";
import { useLiveCheck } from "../live/useLiveCheck";

/** Small programs with one slip each; the live analyzer has a quick fix for every one. */
const SAMPLES = [
  {
    id: "c",
    name: "C",
    file: "main.c",
    code: '#include <stdio.h>\n\nint main(void) {\n    int total = 0\n    for (int i = 1; i <= 4; i++) {\n        total += i * 100;\n    }\n    printf("Total: %d\\n", total);\n    return 0;\n}\n',
  },
  {
    id: "python",
    name: "Python",
    file: "main.py",
    code: 'def greet(name)\n    print(f"Namaste, {name}!")\n\nfor student in ["Asha", "Ravi"]:\n    greet(student)\n',
  },
  {
    id: "java",
    name: "Java",
    file: "Main.java",
    code: 'public class Main {\n    public static void main(String[] args) {\n        int score = 42;\n        System.out.println("Score: " + score)\n    }\n}\n',
  },
] as const;

type SampleId = (typeof SAMPLES)[number]["id"];

/**
 * The entry page's playground: try the real live analyzer (Tree-sitter in a
 * Web Worker, the same one the workspace uses) on a program with a slip in
 * it, and apply the same rule-based quick fix. The analyzer only loads once
 * the playground scrolls into view. Nothing is sent to the server.
 */
export function Playground() {
  const [ref, inView] = useInView<HTMLDivElement>({ threshold: 0.2 });
  return (
    <div ref={ref} data-testid="entry-playground" className="k-hud relative overflow-hidden rounded-lg border border-line-strong bg-surface shadow-[var(--cd-shadow)]">
      {inView ? (
        <PlaygroundBody />
      ) : (
        <div className="flex h-[340px] items-center justify-center gap-2 font-mono text-xs uppercase tracking-wider text-faint">
          <Loader2 size={14} className="animate-spin text-brand-fg" /> Loading the analyzer...
        </div>
      )}
    </div>
  );
}

function PlaygroundBody() {
  const [sampleId, setSampleId] = useState<SampleId>("c");
  const sample = SAMPLES.find((s) => s.id === sampleId) ?? SAMPLES[0];
  const [codes, setCodes] = useState<Record<string, string>>({});
  const code = codes[sampleId] ?? sample.code;
  const editedAt = useRef(0);
  const live = useLiveCheck(sampleId, code, editedAt);
  const problems = live.text === code ? live.problems : [];
  const current = live.text === code && live.status === "ready";
  const problem = problems[0] ?? null;
  const [fixed, setFixed] = useState<string | null>(null);
  const lines = code.split("\n");
  if (lines[lines.length - 1] === "") lines.pop();

  const setCode = (value: string) => {
    editedAt.current = performance.now();
    setCodes((all) => ({ ...all, [sampleId]: value }));
  };
  const applyFix = () => {
    if (!problem?.fix) return;
    play("fix");
    setFixed(problem.fix.label);
    setCode(applyTextEdits(code, problem.fix.edits));
  };
  const reset = () => {
    setFixed(null);
    setCodes((all) => ({ ...all, [sampleId]: sample.code }));
  };

  let status;
  if (live.status === "loading" || !current) {
    status = (
      <span className="flex items-center gap-1.5 text-muted">
        <Loader2 size={13} className="animate-spin text-brand-fg" /> {live.status === "loading" ? `Loading the ${sample.name} grammar...` : "Checking..."}
      </span>
    );
  } else if (live.status === "error") {
    status = <span className="text-warn-fg">The live analyzer is not available in this browser.</span>;
  } else if (problem) {
    status = (
      <span className="flex items-center gap-1.5 text-warn-fg">
        <Zap size={13} /> {problems.length} syntax problem{problems.length === 1 ? "" : "s"}
      </span>
    );
  } else {
    status = (
      <span className="flex items-center gap-1.5 text-brand-fg">
        <CheckCircle2 size={13} /> Syntax OK
      </span>
    );
  }

  return (
    <div className="grid lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
      {/* ------------------------------------------------------- the code */}
      <div className="min-w-0 border-b border-line lg:border-b-0 lg:border-r">
        <div className="flex h-10 items-center gap-1 border-b border-line bg-raised px-2" role="radiogroup" aria-label="Language">
          {SAMPLES.map((s) => (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={s.id === sampleId}
              data-testid={`entry-playground-${s.id}`}
              onClick={() => {
                setSampleId(s.id);
                setFixed(null);
              }}
              className={`rounded px-2.5 py-1 font-mono text-[11px] font-semibold transition-colors ${
                s.id === sampleId ? "bg-brand/12 text-brand-fg" : "text-faint hover:text-fg"
              }`}
            >
              {s.file}
            </button>
          ))}
          <button type="button" onClick={reset} className="ml-auto flex items-center gap-1 rounded px-2 py-1 font-mono text-[10.5px] uppercase tracking-wider text-faint hover:text-fg" title="Put the slip back">
            <RotateCcw size={12} /> Reset
          </button>
        </div>
        <div className="flex max-h-[320px] min-h-[240px] overflow-auto bg-[var(--cd-editor)] font-mono text-[13px] leading-[22px]">
          <div aria-hidden className="select-none py-3 pl-3 pr-2 text-right text-faint/80">
            {lines.map((_, i) => (
              <div key={i} className={problem && problem.startLine === i + 1 ? "font-bold text-danger-fg" : ""}>
                {i + 1}
              </div>
            ))}
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            wrap="off"
            aria-label={`${sample.name} code to check`}
            data-testid="entry-playground-code"
            rows={Math.max(lines.length, 8)}
            className="min-w-0 flex-1 resize-none bg-transparent py-3 pr-3 text-fg outline-none [tab-size:4]"
          />
        </div>
      </div>

      {/* ---------------------------------------------------- the analysis */}
      <div className="flex min-w-0 flex-col gap-3 p-4" aria-live="polite">
        <p className="k-label">Live analyzer · {sample.name}</p>
        <p className="font-mono text-[12px] font-semibold" data-testid="entry-playground-status">
          {status}
        </p>
        {current && problem && (
          <div className="rounded-md border border-danger/35 bg-danger/[0.06] p-3" data-testid="entry-playground-problem">
            <p className="font-mono text-[10.5px] font-bold uppercase tracking-wider text-danger-fg">
              Line {problem.startLine}, column {problem.startColumn}
            </p>
            <p className="mt-1 text-sm text-fg">{problem.message}</p>
            {problem.fix && (
              <button
                type="button"
                onClick={applyFix}
                data-testid="entry-playground-fix"
                data-cursor="FIX"
                data-magnetic="0.2"
                data-ripple=""
                className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-on-brand hover:brightness-105"
              >
                <Wrench size={12} /> [ {problem.fix.label} ]
              </button>
            )}
          </div>
        )}
        {current && !problem && live.status === "ready" && (
          <div className="rounded-md border border-brand/40 bg-brand/[0.07] p-3 text-sm text-fg" data-testid="entry-playground-ok">
            {fixed ? (
              <>
                <b className="text-brand-fg">Fixed with "{fixed}".</b> The analyzer re-read the code and found nothing else. In the workspace,
                Run then confirms it with a real compile.
              </>
            ) : (
              <>No syntax problems. Break something: delete a semicolon or a colon and watch.</>
            )}
          </div>
        )}
        <p className="mt-auto text-[11.5px] leading-relaxed text-faint">
          Real Tree-sitter parsing in your browser, {LIVE_DEBOUNCE_MS} ms after you stop typing
          {live.stats.checkP50 !== null ? ` (this check: ${live.stats.checkP50 < 10 ? live.stats.checkP50.toFixed(1) : Math.round(live.stats.checkP50)} ms)` : ""}. Nothing
          leaves this page.
        </p>
      </div>
    </div>
  );
}
