import { CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

const SAMPLES: { lang: string; file: string; code: string; out: string }[] = [
  { lang: "Python", file: "main.py", code: 'name = input("Your name: ")\nprint(f"Namaste, {name}!")', out: "Namaste, Asha!" },
  { lang: "C", file: "main.c", code: '#include <stdio.h>\n\nint main(void) {\n    printf("Hello, KAIRO!\\n");\n}', out: "Hello, KAIRO!" },
  { lang: "JavaScript", file: "main.js", code: "const tests = 8;\nconsole.log(`${tests} tests passed`);", out: "8 tests passed" },
  { lang: "Java", file: "Main.java", code: 'public class Main {\n    public static void main(String[] a) {\n        System.out.println("Build OK");\n    }\n}', out: "Build OK" },
  { lang: "Rust", file: "main.rs", code: 'fn main() {\n    let steps = [1, 2, 3];\n    println!("{} steps", steps.len());\n}', out: "3 steps" },
  { lang: "SQL", file: "main.sql", code: "SELECT 'compiled ' || 42 AS status;", out: "compiled 42" },
];

const KEYWORDS =
  /\b(int|void|main|return|public|class|static|String|fn|let|const|SELECT|AS|include|print|printf|println|input|console|log|System|out|len)\b/;

/** Minimal colouring for the demo snippets: strings, keywords, numbers. */
function colour(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const token = /("(?:[^"\\\n]|\\.)*"?|'[^'\n]*'?|`[^`\n]*`?|\b\d+\b|\b[A-Za-z_]\w*\b|#include)/g;
  let last = 0;
  for (const match of text.matchAll(token)) {
    const [value] = match;
    const at = match.index ?? 0;
    if (at > last) parts.push(text.slice(last, at));
    const cls = /^["'`]/.test(value)
      ? "text-accent-fg"
      : /^\d/.test(value)
        ? "text-info-fg"
        : KEYWORDS.test(value) || value === "#include"
          ? "font-semibold text-brand-fg"
          : "text-fg";
    parts.push(
      <span key={at} className={cls}>
        {value}
      </span>,
    );
    last = at + value.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

/**
 * A little terminal that types a program in one language after another and
 * "runs" it. Decoration for the entry page; real runs happen in the sandbox.
 */
export function CodeTypewriter({ motion }: { motion: boolean }) {
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(motion ? 0 : Number.MAX_SAFE_INTEGER);
  const [phase, setPhase] = useState<"typing" | "running" | "done">(motion ? "typing" : "done");
  const sample = SAMPLES[index];

  useEffect(() => {
    if (!motion) {
      setShown(Number.MAX_SAFE_INTEGER);
      setPhase("done");
      const timer = window.setTimeout(() => setIndex((i) => (i + 1) % SAMPLES.length), 4500);
      return () => window.clearTimeout(timer);
    }
    setShown(0);
    setPhase("typing");
    const timers: number[] = [];
    const length = sample.code.length;
    for (let i = 1; i <= length; i++) timers.push(window.setTimeout(() => setShown(i), i * 32));
    timers.push(window.setTimeout(() => setPhase("running"), length * 32 + 250));
    timers.push(window.setTimeout(() => setPhase("done"), length * 32 + 900));
    timers.push(window.setTimeout(() => setIndex((i) => (i + 1) % SAMPLES.length), length * 32 + 2800));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [index, motion, sample.code.length]);

  return (
    <div className="w-full overflow-hidden rounded-lg border border-line-strong bg-[var(--cd-terminal)] text-left shadow-[var(--cd-shadow)]" aria-hidden>
      <div className="flex items-center gap-2 border-b border-line bg-raised px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-danger/80" />
        <span className="h-2 w-2 rounded-full bg-warn/80" />
        <span className="h-2 w-2 rounded-full bg-brand/80" />
        <span className="ml-2 font-mono text-[11px] text-muted">{sample.file}</span>
        <span className="ml-auto rounded border border-brand/35 bg-brand/10 px-1.5 font-mono text-[10px] font-bold text-brand-fg">{sample.lang}</span>
      </div>
      <pre className="min-h-[7.5rem] whitespace-pre-wrap px-4 py-3 font-mono text-[12.5px] leading-relaxed text-fg">
        {colour(sample.code.slice(0, shown))}
        {phase === "typing" && <span className="cd-caret" />}
      </pre>
      <div className="flex h-9 items-center gap-2 border-t border-line px-4 font-mono text-[11.5px]">
        {phase === "typing" && <span className="text-faint">▸ waiting for RUN</span>}
        {phase === "running" && (
          <span className="flex items-center gap-2 text-brand-fg">
            <Loader2 size={13} className="animate-spin" /> compiling and running in the sandbox...
          </span>
        )}
        {phase === "done" && (
          <span className="flex items-center gap-2 text-fg">
            <CheckCircle2 size={13} className="text-brand-fg" /> {sample.out}
            <span className="ml-2 text-[10px] uppercase tracking-wider text-faint">exit 0</span>
          </span>
        )}
      </div>
    </div>
  );
}
