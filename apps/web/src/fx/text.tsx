import { createElement, useLayoutEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { useFx } from "./context";
import { useInView } from "./scroll";

export type SplitPart = string | { text: string; className?: string } | { br: true };

/**
 * A heading whose words rise into place one after another, when it mounts
 * or (`observe`) when it first scrolls into view. Screen readers get the
 * full text once (visually hidden); the animated word pieces are hidden
 * from them. With motion off the words simply stand in place.
 */
export function SplitText({
  parts,
  as = "span",
  className = "",
  delay = 0,
  stagger = 60,
  id,
  observe = false,
}: {
  parts: SplitPart[];
  as?: "h1" | "h2" | "h3" | "p" | "span";
  className?: string;
  /** ms before the first word. */
  delay?: number;
  /** ms between words. */
  stagger?: number;
  id?: string;
  /** Wait until the heading scrolls into view. */
  observe?: boolean;
}) {
  const { motion } = useFx();
  const [ref, inView] = useInView<HTMLElement>({ threshold: 0.3 });
  const label = parts.map((p) => (typeof p === "string" ? p : "text" in p ? p.text : " ")).join("").replace(/\s+/g, " ").trim();
  let index = 0;
  const children: ReactNode[] = [];
  parts.forEach((part, p) => {
    if (typeof part !== "string" && "br" in part) {
      children.push(<br key={`br${p}`} />);
      return;
    }
    const text = typeof part === "string" ? part : part.text;
    const cls = typeof part === "string" ? "" : (part.className ?? "");
    text.split(/(\s+)/).forEach((word, w) => {
      if (!word) return;
      if (/^\s+$/.test(word)) {
        children.push(" ");
        return;
      }
      const i = index++;
      children.push(
        <span key={`${p}-${w}`} className="k-split-word" aria-hidden>
          <span className={`k-split-inner ${cls}`} style={{ "--i": i } as CSSProperties}>
            {word}
          </span>
        </span>,
      );
    });
  });
  return createElement(
    as,
    {
      id,
      ref,
      className: `${className} ${motion ? "k-split" : ""}`,
      "data-wait": motion && observe && !inView ? "" : undefined,
      style: { "--d": `${delay}ms`, "--s": `${stagger}ms` } as CSSProperties,
    },
    <span className="sr-only">{label}</span>,
    children,
  );
}

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<>/{}[]=+*#;:";

/**
 * Text that decodes itself like a terminal: random glyphs settle into the
 * real text from left to right, when it first appears (`mount`) and again
 * when the pointer comes over it (`hover`). The real text stays in the DOM
 * the whole time (it only turns transparent while an aria-hidden overlay
 * shows the glyphs), so screen readers, find-in-page and tests always see it.
 */
export function Scramble({
  text,
  className = "",
  hover = true,
  mount = true,
  duration = 600,
}: {
  text: string;
  className?: string;
  hover?: boolean;
  mount?: boolean;
  duration?: number;
}) {
  const { motion } = useFx();
  const host = useRef<HTMLSpanElement>(null);
  const glyphs = useRef<HTMLSpanElement>(null);
  const frame = useRef(0);

  const stop = () => {
    cancelAnimationFrame(frame.current);
    if (glyphs.current) glyphs.current.textContent = "";
    host.current?.removeAttribute("data-decoding");
  };

  const run = () => {
    const el = glyphs.current;
    if (!el || !host.current || !motion || !text.trim()) return;
    cancelAnimationFrame(frame.current);
    host.current.setAttribute("data-decoding", "");
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const settled = Math.floor(t * text.length);
      let out = "";
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        out += i < settled || /[\s·/.:,]/.test(ch) ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      el.textContent = out;
      if (t < 1) frame.current = requestAnimationFrame(tick);
      else stop();
    };
    frame.current = requestAnimationFrame(tick);
  };

  useLayoutEffect(() => {
    if (mount) run();
    return stop;
  }, [text, motion]);

  return (
    <span ref={host} className={`k-decode ${className}`} onPointerEnter={hover ? run : undefined}>
      <span className="k-decode-text">{text}</span>
      <span ref={glyphs} className="k-decode-glyphs" aria-hidden />
    </span>
  );
}

/** Beyond this many lines, terminal text is shown at once. */
const REVEAL_MAX_LINES = 400;

/**
 * Terminal text that writes itself in, line after line (each line fades in
 * a moment after the one before). The characters are exactly `text`, so
 * copying, find-in-page and tests see the same text. Long outputs and
 * motion off render plainly.
 */
export function LineReveal({ text }: { text: string }) {
  const { motion } = useFx();
  if (!motion || !text) return <>{text}</>;
  const lines = text.match(/[^\n]*\n|[^\n]+$/g) ?? [text];
  if (lines.length > REVEAL_MAX_LINES) return <>{text}</>;
  return (
    <>
      {lines.map((line, i) => (
        <span key={i} className="k-line" style={{ "--i": Math.min(i, 40) } as CSSProperties}>
          {line}
        </span>
      ))}
    </>
  );
}

/** The same reveal for lines that are already separate elements (the build log). */
export function lineReveal(motion: boolean, index: number, count: number): { className: string; style?: CSSProperties } {
  if (!motion || count > REVEAL_MAX_LINES) return { className: "" };
  return { className: "k-line", style: { "--i": Math.min(index, 40) } as CSSProperties };
}
