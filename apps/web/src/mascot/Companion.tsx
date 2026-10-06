import { X } from "lucide-react";
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { load, save } from "../lib/storage";
import { SaarthiMascot, type MascotMood } from "./SaarthiMascot";

export type BubbleTone = "info" | "success" | "error" | "badge";

export interface Bubble {
  id: number;
  tone: BubbleTone;
  text: string;
  action?: { label: string; onClick(): void };
}

const REACTION: Record<BubbleTone, [MascotMood, number]> = {
  info: ["wave", 2400],
  success: ["happy", 2800],
  badge: ["happy", 3200],
  error: ["concerned", 4000],
};
const SLEEP_AFTER_MS = 120_000;
let nextId = 1;

export interface CompanionApi {
  bubble: Bubble | null;
  mood: MascotMood;
  say(text: string, tone?: BubbleTone, action?: Bubble["action"], showMs?: number): void;
  /** Show a face for a moment without saying anything (explaining, suggesting...). */
  react(mood: MascotMood, ms?: number): void;
  dismiss(): void;
  /** Counts the tricks asked for (from the command palette); each new value makes Saarthi spin. */
  trick: number;
  doTrick(): void;
}

/**
 * Saarthi's floating self: reacts to what happens (a clean run, an error, a
 * new badge, an explanation, a suggested fix) with a face and a short speech
 * bubble, thinks while an answer is on its way, and dozes off when nothing
 * happens for a while.
 */
export function useCompanion(thinking: boolean): CompanionApi {
  const [bubble, setBubble] = useState<Bubble | null>(null);
  const [reaction, setReaction] = useState<MascotMood | null>(null);
  const [sleeping, setSleeping] = useState(false);
  const [trick, setTrick] = useState(0);
  const lastActivity = useRef(Date.now());
  const sleepingRef = useRef(false);
  const timers = useRef<{ bubble?: number; reaction?: number }>({});

  useEffect(() => {
    const wake = () => {
      lastActivity.current = Date.now();
      if (sleepingRef.current) {
        sleepingRef.current = false;
        setSleeping(false);
      }
    };
    const check = window.setInterval(() => {
      if (!sleepingRef.current && Date.now() - lastActivity.current > SLEEP_AFTER_MS) {
        sleepingRef.current = true;
        setSleeping(true);
      }
    }, 10_000);
    window.addEventListener("keydown", wake);
    window.addEventListener("pointerdown", wake);
    window.addEventListener("pointermove", wake, { passive: true });
    return () => {
      window.clearInterval(check);
      window.removeEventListener("keydown", wake);
      window.removeEventListener("pointerdown", wake);
      window.removeEventListener("pointermove", wake);
    };
  }, []);

  useEffect(
    () => () => {
      window.clearTimeout(timers.current.bubble);
      window.clearTimeout(timers.current.reaction);
    },
    [],
  );

  const react = useCallback((face: MascotMood, ms = 3000) => {
    window.clearTimeout(timers.current.reaction);
    setReaction(face);
    timers.current.reaction = window.setTimeout(() => setReaction(null), ms);
  }, []);

  const say = useCallback(
    (text: string, tone: BubbleTone = "info", action?: Bubble["action"], showMs?: number) => {
      window.clearTimeout(timers.current.bubble);
      setBubble({ id: nextId++, tone, text, action });
      const [face, faceMs] = REACTION[tone];
      react(face, faceMs);
      timers.current.bubble = window.setTimeout(() => setBubble(null), showMs ?? (tone === "error" ? 9000 : 6500));
    },
    [react],
  );

  const dismiss = useCallback(() => {
    window.clearTimeout(timers.current.bubble);
    setBubble(null);
  }, []);

  const doTrick = useCallback(() => {
    setTrick((n) => n + 1);
    say("Wheee! Okay, okay, back to code.", "success", undefined, 3200);
  }, [say]);

  const mood: MascotMood = thinking ? "thinking" : (reaction ?? (sleeping ? "sleeping" : "idle"));
  // One object while nothing changes, so the memoised companion skips the console's renders.
  return useMemo(() => ({ bubble, mood, say, react, dismiss, trick, doTrick }), [bubble, mood, say, react, dismiss, trick, doTrick]);
}

const TONE: Record<BubbleTone, { border: string; label: string; dot: string }> = {
  info: { border: "border-line-strong", label: "SAARTHI", dot: "bg-ai" },
  success: { border: "border-brand/60", label: "SAARTHI · RUN OK", dot: "bg-brand" },
  error: { border: "border-danger/50", label: "SAARTHI · ISSUE FOUND", dot: "bg-danger" },
  badge: { border: "border-accent/60", label: "SAARTHI · UNLOCKED", dot: "bg-accent" },
};

/** Where the student parked Saarthi, as offsets from the editor's bottom-right corner. */
interface Parking {
  right: number;
  bottom: number;
}
const PARKING_KEY = "k.saarthi.pos";
const EDGE = 6;

/**
 * The floating assistant: Saarthi hovering over its holo-platform in a corner
 * of the editor, with its speech bubble. Click it to open Saarthi's panel;
 * drag it anywhere in the editor (the spot is remembered), or move it with
 * the arrow keys when it has focus; double-click to say hello. The bubble is
 * a polite live region, so what Saarthi says is also read out.
 */
export const Companion = memo(function Companion({
  api,
  size = 72,
  onClick,
  className = "k-float",
  draggable = true,
}: {
  api: CompanionApi;
  size?: number;
  onClick?(): void;
  className?: string;
  draggable?: boolean;
}) {
  const { bubble } = api;
  const tone = bubble ? TONE[bubble.tone] : null;
  const host = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const [parking, setParking] = useState<Parking | null>(() => (draggable ? load<Parking | null>(PARKING_KEY, null) : null));
  const [dragging, setDragging] = useState(false);
  const [spin, setSpin] = useState(false);
  const [room, setRoom] = useState({ below: false, left: false });
  const drag = useRef<{ x: number; y: number; from: Parking; moved: boolean } | null>(null);
  const dragged = useRef(false);
  const clicks = useRef<number[]>([]);

  /** Keep Saarthi inside the editor, whatever its size is now. */
  const fit = useCallback((p: Parking): Parking => {
    const parent = host.current?.parentElement;
    const own = button.current;
    if (!parent || !own) return p;
    const maxRight = Math.max(EDGE, parent.clientWidth - own.offsetWidth - EDGE);
    const maxBottom = Math.max(EDGE, parent.clientHeight - own.offsetHeight - EDGE);
    return { right: Math.round(Math.min(maxRight, Math.max(EDGE, p.right))), bottom: Math.round(Math.min(maxBottom, Math.max(EDGE, p.bottom))) };
  }, []);

  // Which way the bubble has room to open, from where Saarthi is parked.
  useLayoutEffect(() => {
    const parent = host.current?.parentElement;
    const own = button.current;
    if (!parent || !own) return;
    const p = parking ?? { right: 22, bottom: 14 };
    const next = { below: parent.clientHeight - p.bottom - own.offsetHeight < 170, left: parent.clientWidth - p.right < 300 };
    setRoom((r) => (r.below === next.below && r.left === next.left ? r : next));
  }, [parking, bubble]);

  // A parked spot outside a smaller editor (another screen, a resized panel) is pulled back in.
  useEffect(() => {
    const parent = host.current?.parentElement;
    if (!parent || !parking) return;
    const observer = new ResizeObserver(() => setParking((p) => (p ? fit(p) : p)));
    observer.observe(parent);
    return () => observer.disconnect();
  }, [parking !== null, fit]);

  const park = (p: Parking) => {
    const next = fit(p);
    setParking(next);
    save(PARKING_KEY, next);
  };

  // A trick (five quick clicks, or the command palette) makes Saarthi spin.
  useEffect(() => {
    if (api.trick === 0) return;
    setSpin(true);
    const timer = window.setTimeout(() => setSpin(false), 1150);
    return () => window.clearTimeout(timer);
  }, [api.trick]);

  const activate = () => {
    const now = Date.now();
    clicks.current = [...clicks.current.filter((t) => now - t < 1400), now];
    if (clicks.current.length >= 5) {
      clicks.current = [];
      api.doTrick();
      return;
    }
    onClick?.();
  };

  const start = { right: parking?.right ?? 22, bottom: parking?.bottom ?? 14 };
  return (
    <div
      ref={host}
      className={className}
      data-testid="companion"
      data-dragging={dragging ? "true" : undefined}
      style={{
        ...(parking ? { right: parking.right, bottom: parking.bottom } : null),
        flexDirection: room.below ? "column-reverse" : "column",
        alignItems: room.left ? "flex-start" : "flex-end",
      }}
    >
      <div role="status" aria-live="polite">
        {bubble && tone && (
          <div
            key={bubble.id}
            data-testid="companion-bubble"
            data-tone={bubble.tone}
            className={`k-bubble cd-glass rounded-xl border p-3 pr-8 text-left ${tone.border} ${room.below ? "k-bubble-below" : ""}`}
          >
            <p className="k-label flex items-center gap-1.5 !text-[9.5px]">
              <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} aria-hidden />
              {tone.label}
            </p>
            <p className="mt-1 text-[13px] leading-snug text-fg">{bubble.text}</p>
            {bubble.action && (
              <button
                type="button"
                className="mt-2 inline-flex items-center gap-1 rounded-md border border-ai/40 bg-ai/10 px-2 py-1 font-mono text-[10.5px] font-semibold uppercase tracking-wider text-ai-fg hover:bg-ai/20"
                onClick={() => {
                  bubble.action?.onClick();
                  api.dismiss();
                }}
              >
                {bubble.action.label}
              </button>
            )}
            <button type="button" aria-label="Dismiss" onClick={api.dismiss} className="absolute right-2 top-2 rounded p-0.5 text-faint hover:text-fg">
              <X size={13} />
            </button>
          </div>
        )}
      </div>
      <button
        ref={button}
        type="button"
        className={`k-float-button ${spin ? "k-spin" : ""}`}
        aria-label="Open Saarthi, the AI guide"
        aria-description={draggable ? "Drag, or use the arrow keys, to move Saarthi. Double-click to say hello." : undefined}
        title={draggable ? "Saarthi · click to open, drag to move" : "Saarthi · AI guide"}
        onClick={() => {
          if (dragged.current) {
            dragged.current = false;
            return;
          }
          activate();
        }}
        onDoubleClick={() => api.react("wave", 2400)}
        onPointerDown={(e) => {
          dragged.current = false; // a drag that ended without a click must not swallow this one
          if (!draggable || e.button !== 0) return;
          drag.current = { x: e.clientX, y: e.clientY, from: start, moved: false };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          const dx = e.clientX - d.x;
          const dy = e.clientY - d.y;
          if (!d.moved && Math.hypot(dx, dy) < 5) return;
          if (!d.moved) {
            d.moved = true;
            setDragging(true);
          }
          setParking(fit({ right: d.from.right - dx, bottom: d.from.bottom - dy }));
        }}
        onPointerUp={(e) => {
          const d = drag.current;
          drag.current = null;
          if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
          if (d?.moved) {
            dragged.current = true;
            setDragging(false);
            park({ right: d.from.right - (e.clientX - d.x), bottom: d.from.bottom - (e.clientY - d.y) });
          }
        }}
        onPointerCancel={() => {
          drag.current = null;
          setDragging(false);
        }}
        onKeyDown={(e) => {
          if (!draggable) return;
          const step = e.shiftKey ? 48 : 12;
          const moves: Record<string, Parking> = {
            ArrowLeft: { right: start.right + step, bottom: start.bottom },
            ArrowRight: { right: start.right - step, bottom: start.bottom },
            ArrowUp: { right: start.right, bottom: start.bottom + step },
            ArrowDown: { right: start.right, bottom: start.bottom - step },
          };
          const next = moves[e.key];
          if (!next) return;
          e.preventDefault();
          park(next);
        }}
      >
        <SaarthiMascot size={size} mood={api.mood} />
      </button>
    </div>
  );
});
