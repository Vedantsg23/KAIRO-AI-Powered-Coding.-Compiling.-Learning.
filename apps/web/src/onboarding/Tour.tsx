import { ArrowLeft, ArrowRight } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Button } from "../ui/primitives";

export interface TourStep {
  /** CSS selector of the element to highlight, e.g. [data-tour="run"]. */
  target: string;
  title: string;
  body: ReactNode;
  /** Where the card goes; "inside" is for large targets such as the editor. */
  placement?: "bottom" | "top" | "left" | "right" | "inside";
}

const CARD_WIDTH = 330;
const PAD = 6;

/**
 * Guided tour: dims the page, cuts a highlighted hole around the current
 * target and shows a card next to it. Keyboard: arrows to move, Esc to exit.
 */
export function Tour({ steps, open, onClose }: { steps: TourStep[]; open: boolean; onClose(): void }) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const step = steps[index];

  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !step) return;
    const element = document.querySelector<HTMLElement>(step.target);
    // A target hidden at this screen size (display: none) has an empty box: show the card on its own.
    const measure = () => {
      const box = element?.getBoundingClientRect();
      setRect(box && box.width > 0 && box.height > 0 ? box : null);
    };
    element?.scrollIntoView({ block: "nearest" });
    measure();
    const observer = new ResizeObserver(measure);
    if (element) observer.observe(element);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [open, step]);

  const next = useCallback(() => (index + 1 < steps.length ? setIndex(index + 1) : onClose()), [index, steps.length, onClose]);
  const back = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, next, back, onClose]);

  if (!open || !step) return null;
  const last = index === steps.length - 1;

  return (
    <div className="fixed inset-0 z-50" data-testid="tour">
      {rect ? (
        <div
          aria-hidden
          className="pointer-events-none fixed rounded-lg ring-2 ring-brand transition-all duration-300 ease-out"
          style={{
            left: rect.left - PAD,
            top: rect.top - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            boxShadow: "0 0 0 9999px var(--cd-scrim)",
          }}
        />
      ) : (
        <div className="fixed inset-0 bg-[var(--cd-scrim)]" />
      )}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        key={index}
        className="k-hud cd-glass fixed animate-pop-in rounded-lg border border-line-strong p-4"
        style={{ width: CARD_WIDTH, ...cardPosition(rect, step.placement) }}
      >
        <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-brand-fg">
          Step {index + 1} of {steps.length}
        </p>
        <h3 id="tour-title" className="mt-1 text-base font-semibold text-fg">
          {step.title}
        </h3>
        <div className="mt-1.5 text-sm leading-relaxed text-muted">{step.body}</div>
        <div className="mt-4 flex items-center gap-2">
          <div className="flex flex-1 gap-1" aria-hidden>
            {steps.map((_, i) => (
              <span
                key={i}
                className={`h-1 rounded-full transition-all ${i === index ? "w-5 bg-brand" : i < index ? "w-2 bg-brand/50" : "w-2 bg-line-strong"}`}
              />
            ))}
          </div>
          <button type="button" onClick={onClose} className="px-1 text-xs text-faint hover:text-fg">
            Skip
          </button>
          {index > 0 && (
            <Button size="sm" onClick={back} aria-label="Previous step">
              <ArrowLeft size={13} />
            </Button>
          )}
          <Button size="sm" variant="primary" onClick={next} data-testid="tour-next" autoFocus>
            {last ? "Start coding" : "Next"} {!last && <ArrowRight size={13} />}
          </Button>
        </div>
      </div>
    </div>
  );
}

function cardPosition(rect: DOMRect | null, placement: TourStep["placement"] = "bottom"): CSSProperties {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const margin = 12;
  const gap = 16;
  const clampX = (x: number) => Math.max(margin, Math.min(x, vw - CARD_WIDTH - margin));
  const clampY = (y: number) => Math.max(margin, Math.min(y, vh - 240));
  if (!rect) return { left: (vw - CARD_WIDTH) / 2, top: vh / 3 };

  if (placement === "inside") return { left: clampX(rect.right - CARD_WIDTH - 24), top: clampY(rect.top + 24) };
  if (placement === "right" && rect.right + gap + CARD_WIDTH < vw - margin) return { left: rect.right + gap, top: clampY(rect.top) };
  if (placement === "left" && rect.left - gap - CARD_WIDTH > margin) return { left: rect.left - gap - CARD_WIDTH, top: clampY(rect.top) };

  const centeredX = clampX(rect.left + rect.width / 2 - CARD_WIDTH / 2);
  const spaceBelow = vh - rect.bottom;
  if ((placement !== "top" && spaceBelow > 230) || rect.top < 230) {
    return spaceBelow > 230 ? { left: centeredX, top: rect.bottom + gap } : { left: clampX(rect.right - CARD_WIDTH - 24), top: clampY(rect.top + 24) };
  }
  return { left: centeredX, bottom: vh - rect.top + gap };
}
