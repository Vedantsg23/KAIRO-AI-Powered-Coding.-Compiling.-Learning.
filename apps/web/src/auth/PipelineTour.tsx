import { BadgeCheck, CheckCircle2, Sparkles, Wrench } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { clamp, useFx } from "../fx/context";
import { SplitText } from "../fx/text";
import { SaarthiMascot, type MascotMood } from "../mascot/SaarthiMascot";

interface Step {
  key: string;
  title: string;
  body: string;
  art: ReactNode;
  /** Saarthi's face and line at this step: Saarthi walks the visitor through the pipeline. */
  mood: MascotMood;
  say: string;
}

const Code = ({ children }: { children: ReactNode }) => (
  <pre className="overflow-hidden whitespace-pre font-mono text-[12.5px] leading-[1.7] text-fg">{children}</pre>
);
const n = (line: number) => <span className="select-none text-faint">{String(line).padStart(2, " ")}  </span>;
const kw = (text: string) => <span className="font-semibold text-brand-fg">{text}</span>;

const STEPS: Step[] = [
  {
    key: "CODE",
    title: "Write it",
    body: "Pick one of 32 languages and write. Drafts save in this browser as you type, one per language.",
    mood: "wave",
    say: "Namaste! Pick a language and start typing. I'm watching every keystroke.",
    art: (
      <Code>
        {n(1)}
        {kw("int")} main(<span className="text-info-fg">void</span>) {"{"}
        {"\n"}
        {n(2)}    {kw("int")} total = <span className="text-info-fg">0</span>
        <span className="k-caret" />
        {"\n"}
        {n(3)}    printf(<span className="text-accent-fg">"%d\n"</span>, total);
        {"\n"}
        {n(4)}
        {"}"}
      </Code>
    ),
  },
  {
    key: "ANALYZE",
    title: "Analyzed as you type",
    body: "A Tree-sitter parser in a Web Worker re-reads the file 150 ms after you pause and underlines slips before you ever press Run.",
    mood: "thinking",
    say: "Line 2 never ends: it's missing a ';'. Caught before you pressed Run.",
    art: (
      <Code>
        {n(1)}
        {kw("int")} main(<span className="text-info-fg">void</span>) {"{"}
        {"\n"}
        {n(2)}    {kw("int")} total = <span className="text-info-fg">0</span>
        <span className="underline decoration-danger decoration-wavy decoration-2 underline-offset-4"> </span>
        {"\n"}
        {n(3)}    <span className="underline decoration-danger/50 decoration-wavy underline-offset-4">printf</span>(<span className="text-accent-fg">"%d\n"</span>, total);
        {"\n"}
        <span className="text-danger-fg">   ▲ Missing ';' (end of statement) · line 2 · live</span>
      </Code>
    ),
  },
  {
    key: "DIAGNOSE",
    title: "Clean diagnostics",
    body: "Compiler output from GCC, javac, rustc and the rest becomes one list of problems, each pinned to its file, line and column.",
    mood: "concerned",
    say: "GCC points at line 3, but the ';' belongs at the end of line 2. I'll show you both.",
    art: (
      <div className="flex flex-col gap-2 font-mono text-[12px]">
        <div className="flex items-center gap-2 rounded border border-danger/40 bg-danger/[0.07] px-2.5 py-2">
          <span className="rounded bg-danger px-1 text-[9.5px] font-bold text-white">E</span>
          <span className="min-w-0 truncate text-fg">expected ',' or ';' before 'printf'</span>
          <span className="ml-auto shrink-0 text-faint">main.c:3:5</span>
        </div>
        <div className="flex items-center gap-2 rounded border border-info/40 bg-info/[0.07] px-2.5 py-2">
          <span className="rounded bg-info px-1 text-[9.5px] font-bold text-white">↳</span>
          <span className="min-w-0 truncate text-fg">the ';' belongs here</span>
          <span className="ml-auto shrink-0 text-faint">main.c:2:18</span>
        </div>
        <p className="text-[10.5px] uppercase tracking-wider text-faint">C_MISSING_SEMICOLON · syntax · exact range</p>
      </div>
    ),
  },
  {
    key: "EXPLAIN",
    title: "Saarthi explains",
    body: "Saarthi, the AI guide, explains the error in plain words: what happened, why, and the concept behind it, grounded in your real run.",
    mood: "explaining",
    say: "Every C statement ends with ';'. Without it, the compiler reads straight on into printf.",
    art: (
      <div className="rounded-lg border border-ai/40 bg-ai/[0.06] p-3 text-[13px] leading-relaxed text-fg">
        <p className="k-label flex items-center gap-1.5 !text-ai-fg">
          <Sparkles size={12} /> Saarthi · why
        </p>
        <p className="mt-1.5">
          In C every statement ends with a <b>;</b>. Line 2 declares <code className="font-mono text-brand-fg">total</code> but never ends, so the compiler reads on into{" "}
          <code className="font-mono">printf</code> and gets confused.
        </p>
      </div>
    ),
  },
  {
    key: "FIX",
    title: "A fix you approve",
    body: "Quick fixes for common slips, or Saarthi's suggested patch shown as a diff first. Nothing changes until you press Apply, and Ctrl+Z undoes it.",
    mood: "suggesting",
    say: "Add ';' to line 2? Nothing changes until you say so.",
    art: (
      <div className="font-mono text-[12.5px] leading-[1.8]">
        <p className="rounded-sm bg-danger/10 px-2 text-danger-fg">-     int total = 0</p>
        <p className="rounded-sm bg-brand/12 px-2 text-brand-fg">+     int total = 0;</p>
        <span className="mt-3 inline-flex items-center gap-1.5 rounded bg-brand px-2.5 py-1 text-[11px] font-bold text-on-brand">
          <Wrench size={12} /> [ ADD ; ]
        </span>
      </div>
    ),
  },
  {
    key: "COMPILE",
    title: "Real compilers, locked sandbox",
    body: "Your code compiles and runs in a fresh container: no network, a read-only system, and strict time, memory and output limits for every language.",
    mood: "thinking",
    say: "Compiling in a fresh sandbox: no network, strict limits. Just a moment.",
    art: (
      <div className="font-mono text-[12.5px] leading-[1.75] text-fg">
        <p>
          <span className="text-brand-fg">$</span> gcc -std=gnu17 -Wall -o main main.c
        </p>
        <p>
          <span className="text-brand-fg">$</span> ./main
        </p>
        <p>0</p>
        <p className="mt-2 border-t border-line pt-2 text-[10.5px] font-bold uppercase tracking-wider text-brand-fg">Process exit: 0 · time 0.018 s</p>
      </div>
    ),
  },
  {
    key: "VERIFY",
    title: "Verified by a real run",
    body: "A fix only counts once a real run of exactly the patched code succeeds. Then Saarthi calls it verified, and the Verified Fix badge is yours.",
    mood: "happy",
    say: "Exit 0! A real run proves the fix works. That one's verified.",
    art: (
      <div className="flex flex-col items-start gap-2">
        <span className="inline-flex items-center gap-2 rounded-md border border-brand/50 bg-brand/10 px-3 py-2 font-mono text-[12px] font-bold uppercase tracking-wider text-brand-fg">
          <CheckCircle2 size={16} /> Verified by a real run
        </span>
        <span className="inline-flex items-center gap-2 rounded-md border border-accent/50 bg-accent/10 px-3 py-2 text-[12.5px] font-semibold text-fg">
          <BadgeCheck size={16} className="text-accent-fg" /> Badge unlocked: Verified Fix
        </span>
      </div>
    ),
  },
];

/** Saarthi in the middle of the tour, on its holo-platform, saying what happens at this step. */
function Guide({ step, size, onSaarthi }: { step: Step; size: number; onSaarthi?(el: Element): void }) {
  return (
    <div className="flex flex-col items-center" data-testid="tour-saarthi" data-mood={step.mood}>
      <div key={step.key} className="k-tour-say relative w-full max-w-[19rem] rounded-xl border border-ai/40 bg-surface px-3.5 py-2.5 text-center shadow-[var(--cd-shadow)]">
        <p className="k-label flex items-center justify-center gap-1.5 !text-[9px] !text-ai-fg">
          <span className="h-1.5 w-1.5 rounded-full bg-ai" aria-hidden /> Saarthi
        </p>
        <p className="mt-1 text-[13px] leading-snug text-fg">{step.say}</p>
      </div>
      <div className={`k-float-slow relative -mt-1 ${onSaarthi ? "cursor-pointer" : ""}`} onClick={(e) => onSaarthi?.(e.currentTarget)}>
        <div className="k-tour-halo" aria-hidden />
        <SaarthiMascot size={size} mood={step.mood} />
      </div>
    </div>
  );
}

/**
 * CODE → ANALYZE → DIAGNOSE → EXPLAIN → FIX → COMPILE → VERIFY, told by
 * scrolling, with Saarthi in the middle as the guide: the panel stays pinned
 * while each step takes its turn (Saarthi changes face and says what is
 * happening), the track fills as you go, and a step's node jumps straight to
 * it. With motion off it is a plain list of the seven steps.
 */
export function PipelineTour({ scroller, onSaarthi }: { scroller: () => HTMLElement | null; onSaarthi?(el: Element): void }) {
  const { motion } = useFx();
  const section = useRef<HTMLElement>(null);
  const fill = useRef<HTMLSpanElement>(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const host = scroller();
    const el = section.current;
    if (!motion || !host || !el) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const top = el.getBoundingClientRect().top - host.getBoundingClientRect().top;
      const total = el.offsetHeight - host.clientHeight;
      const t = clamp(-top / Math.max(1, total), 0, 1);
      fill.current?.style.setProperty("--tour", t.toFixed(4)); // only the track's fill restyles
      const next = Math.min(STEPS.length - 1, Math.floor(t * STEPS.length));
      setStep((s) => (s === next ? s : next));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    host.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      host.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [motion, scroller]);

  const jump = (i: number) => {
    const host = scroller();
    const el = section.current;
    if (!host || !el) return;
    const top = el.getBoundingClientRect().top - host.getBoundingClientRect().top + host.scrollTop;
    const total = el.offsetHeight - host.clientHeight;
    host.scrollTo({ top: top + ((i + 0.5) / STEPS.length) * total, behavior: "smooth" });
  };

  if (!motion) {
    return (
      <section aria-labelledby="tour-title" className="mx-auto max-w-[1320px] px-4 py-14 sm:px-6" data-testid="pipeline-tour">
        <div className="flex flex-wrap items-center gap-6">
          <SaarthiMascot size={110} mood="wave" />
          <div className="min-w-0 flex-1">
            <p className="k-label">How KAIRO works · with Saarthi</p>
            <h2 id="tour-title" className="mt-2 text-3xl font-semibold tracking-tight text-fg">
              Code → Analyze → Diagnose → Explain → Fix → Compile → Verify
            </h2>
          </div>
        </div>
        <ol className="mt-8 grid gap-6 md:grid-cols-2">
          {STEPS.map((s, i) => (
            <li key={s.key} className="rounded-lg border border-line bg-surface p-4">
              <p className="font-mono text-[11px] font-bold tracking-[0.16em] text-brand-fg">
                {String(i + 1).padStart(2, "0")} / {s.key}
              </p>
              <p className="mt-1 text-lg font-semibold text-fg">{s.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{s.body}</p>
              <p className="mt-2 text-[13px] leading-snug text-ai-fg">Saarthi: "{s.say}"</p>
              <div className="mt-3 rounded-md border border-line bg-raised p-3" aria-hidden>
                {s.art}
              </div>
            </li>
          ))}
        </ol>
      </section>
    );
  }

  const current = STEPS[step];
  return (
    <section
      ref={section}
      aria-labelledby="tour-title"
      className="k-tour relative"
      style={{ height: `calc(${STEPS.length} * 34vh + 100dvh)` } as CSSProperties}
      data-testid="pipeline-tour"
      data-step={current.key}
    >
      <div className="sticky top-14 flex h-[calc(100dvh-3.5rem)] flex-col justify-evenly overflow-hidden py-4">
        {/* The step's number, huge and outlined, behind everything. */}
        <span
          key={`g${step}`}
          aria-hidden
          className="k-tour-step k-outline-text pointer-events-none absolute -bottom-[0.18em] right-[2%] select-none font-mono text-[clamp(9rem,26vw,24rem)] font-bold leading-none tracking-[-0.08em] !opacity-20"
        >
          {String(step + 1).padStart(2, "0")}
        </span>
        <div className="mx-auto grid w-full max-w-[1320px] items-center gap-6 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(15rem,19rem)_minmax(0,1fr)] lg:gap-8">
          <div className="min-w-0">
            <p className="k-label">How KAIRO works</p>
            <h2 id="tour-title" className="sr-only">
              Code, Analyze, Diagnose, Explain, Fix, Compile, Verify
            </h2>
            <p key={`n${step}`} className="k-tour-step mt-4 font-mono text-[12px] font-bold tracking-[0.2em] text-brand-fg" aria-hidden>
              {String(step + 1).padStart(2, "0")} / {String(STEPS.length).padStart(2, "0")} · {current.key}
            </p>
            <SplitText
              key={`t${step}`}
              as="p"
              parts={[current.title]}
              stagger={45}
              className="mt-2 text-4xl font-semibold leading-[1.05] tracking-[-0.03em] text-fg sm:text-5xl xl:text-[3.4rem]"
            />
            <p key={`b${step}`} className="k-tour-step mt-4 max-w-lg text-[15px] leading-relaxed text-muted" style={{ animationDelay: "120ms" }}>
              {current.body}
            </p>
          </div>
          {/* Saarthi, in the middle: the guide of the tour. */}
          <div aria-hidden className="max-lg:hidden">
            <Guide step={current} size={196} onSaarthi={onSaarthi} />
          </div>
          <div className="flex min-w-0 items-center gap-3 lg:hidden" aria-hidden>
            <SaarthiMascot size={72} mood={current.mood} />
            <p key={`s${step}`} className="k-tour-say min-w-0 flex-1 rounded-xl border border-ai/40 bg-surface px-3 py-2 text-[12.5px] leading-snug text-fg">
              {current.say}
            </p>
          </div>
          <div className="relative min-w-0" aria-hidden>
            <div className="k-tour-glow" />
            <div key={`a${step}`} className="k-tour-art k-hud relative rounded-lg border border-line-strong bg-surface p-5 shadow-[var(--cd-shadow)]">
              <p className="k-label mb-3 flex items-center justify-between !text-[9.5px]">
                <span>{current.key}</span>
                <span className="text-faint">step {step + 1}</span>
              </p>
              {current.art}
            </div>
          </div>
        </div>

        {/* The track: seven nodes; the fill follows the scroll. */}
        <nav aria-label="Pipeline steps" className="mx-auto w-full max-w-[1320px] px-4 sm:px-6">
          <ol className="relative grid grid-cols-7">
            <span className="absolute left-[7%] right-[7%] top-[9px] h-px bg-line-strong" aria-hidden />
            <span ref={fill} className="k-tour-fill absolute left-[7%] right-[7%] top-[9px] h-[2px] bg-brand" aria-hidden />
            {STEPS.map((s, i) => (
              <li key={s.key} className="relative flex justify-center">
                <button
                  type="button"
                  onClick={() => jump(i)}
                  aria-current={i === step ? "step" : undefined}
                  data-cursor={i === step ? undefined : "GO"}
                  className="group flex flex-col items-center gap-2"
                >
                  <span
                    className={`h-[19px] w-[19px] rounded-full border-2 transition-all duration-300 ${
                      i < step ? "border-brand bg-brand" : i === step ? "scale-125 border-brand bg-surface shadow-[0_0_0_5px_color-mix(in_oklab,var(--cd-brand)_22%,transparent)]" : "border-line-strong bg-surface group-hover:border-brand/60"
                    }`}
                  />
                  <span className={`font-mono text-[9.5px] font-bold tracking-[0.14em] max-sm:hidden ${i <= step ? "text-brand-fg" : "text-faint"}`}>{s.key}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>
      </div>
    </section>
  );
}
