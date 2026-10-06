import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useFx } from "../fx/context";
import { SaarthiMascot, type MascotMood } from "./SaarthiMascot";

/**
 * Saarthi's big hello: the avatar jumps out of the element that was clicked
 * (the nav's "Saarthi AI", the floating companion, ...), grows large in the
 * middle of the screen with a little 3D turn, hops, says its line, and then
 * shrinks back into the same element. Used for "Hii!" and for the welcome
 * after signing in.
 *
 * With reduced motion it simply fades in and out. Any click or key sends
 * Saarthi back early; the overlay never blocks what is under it.
 */
export interface HelloOptions {
  /** The big line, e.g. "Hii!" or "Welcome, Vedant!". */
  title: string;
  /** A sentence under it. */
  text?: string;
  /** Where Saarthi comes from and goes back to (an element or its rectangle). */
  from?: Element | DOMRect | null;
  mood?: MascotMood;
  /** How long Saarthi stays big, in ms (the animations add about 1.6 s). */
  hold?: number;
  /** Called when Saarthi is back where it came from. */
  onDone?(): void;
}

interface Hello extends HelloOptions {
  id: number;
  origin: DOMRect | null;
}

const HelloContext = createContext<(options: HelloOptions) => void>(() => undefined);

/** Show Saarthi's big hello. */
export function useSaarthiHello(): (options: HelloOptions) => void {
  return useContext(HelloContext);
}

let ids = 0;

export function SaarthiHelloProvider({ children }: { children: ReactNode }) {
  const [hello, setHello] = useState<Hello | null>(null);
  const show = useCallback((options: HelloOptions) => {
    const from = options.from;
    const origin = from instanceof DOMRect ? from : from ? from.getBoundingClientRect() : null;
    setHello({ ...options, id: ++ids, origin: origin && origin.width > 0 ? origin : null });
  }, []);
  const done = useCallback(() => {
    setHello((current) => {
      current?.onDone?.();
      return null;
    });
  }, []);
  return (
    <HelloContext.Provider value={show}>
      {children}
      {hello && <HelloOverlay key={hello.id} hello={hello} onDone={done} />}
    </HelloContext.Provider>
  );
}

function HelloOverlay({ hello, onDone }: { hello: Hello; onDone(): void }) {
  const { motion } = useFx();
  const stage = useRef<HTMLDivElement>(null);
  const figure = useRef<HTMLDivElement>(null);
  const bubble = useRef<HTMLDivElement>(null);
  const shadow = useRef<HTMLDivElement>(null);
  const leaving = useRef(false);
  const [phase, setPhase] = useState<"in" | "hold" | "out">("in");
  const size = useMemo(() => Math.round(Math.min(300, Math.max(180, Math.min(window.innerWidth, window.innerHeight) * 0.36))), []);

  // Offset from the middle of the screen to the element Saarthi came from.
  const offset = useMemo(() => {
    const o = hello.origin;
    if (!o) return { x: 0, y: window.innerHeight * 0.35 };
    return { x: o.left + o.width / 2 - window.innerWidth / 2, y: o.top + o.height / 2 - window.innerHeight / 2 };
  }, [hello.origin]);
  const small = hello.origin ? Math.max(0.12, Math.min(0.5, Math.max(hello.origin.width, hello.origin.height) / size)) : 0.2;

  const leave = useCallback(() => {
    if (leaving.current) return;
    leaving.current = true;
    setPhase("out");
    const f = figure.current;
    const b = bubble.current;
    const s = stage.current;
    if (!motion || !f || !s) {
      s?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, fill: "forwards" }).finished.then(onDone, onDone);
      if (!s) onDone();
      return;
    }
    b?.animate([{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(0.7)" }], { duration: 180, fill: "forwards" });
    shadow.current?.animate([{ opacity: 0.55 }, { opacity: 0 }], { duration: 300, fill: "forwards" });
    s.animate([{ backgroundColor: "rgb(0 0 0 / 0.28)" }, { backgroundColor: "rgb(0 0 0 / 0)" }], { duration: 620, fill: "forwards" });
    f.animate(
      [
        { transform: "translate(0px, 0px) scale(1) rotateY(0deg)", opacity: 1 },
        { transform: "translate(0px, -26px) scale(1.06, 0.95) rotateY(-10deg)", opacity: 1, offset: 0.25 },
        { transform: `translate(${offset.x}px, ${offset.y}px) scale(${small}) rotateY(28deg) rotateX(14deg)`, opacity: 0 },
      ],
      { duration: 700, easing: "cubic-bezier(0.55, 0, 0.75, 0.3)", fill: "forwards" },
    ).finished.then(onDone, onDone);
  }, [motion, offset, small, onDone]);

  useEffect(() => {
    const f = figure.current;
    const b = bubble.current;
    const s = stage.current;
    if (!f || !s) return;
    const hold = hello.hold ?? 1500;
    if (!motion) {
      s.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, fill: "forwards" });
      setPhase("hold");
      const t = window.setTimeout(leave, hold + 900);
      return () => window.clearTimeout(t);
    }
    s.animate([{ backgroundColor: "rgb(0 0 0 / 0)" }, { backgroundColor: "rgb(0 0 0 / 0.28)" }], { duration: 500, fill: "forwards" });
    const enter = f.animate(
      [
        { transform: `translate(${offset.x}px, ${offset.y}px) scale(${small}) rotateY(-38deg) rotateX(22deg)`, opacity: 0 },
        { transform: `translate(${offset.x * 0.35}px, ${offset.y * 0.35 - 90}px) scale(0.72) rotateY(-16deg) rotateX(10deg)`, opacity: 1, offset: 0.45 },
        { transform: "translate(0px, -34px) scale(1.14) rotateY(10deg) rotateX(-6deg)", opacity: 1, offset: 0.72 },
        { transform: "translate(0px, 6px) scale(1.04, 0.95) rotateY(-3deg)", opacity: 1, offset: 0.86 },
        { transform: "translate(0px, 0px) scale(1) rotateY(0deg) rotateX(0deg)", opacity: 1 },
      ],
      { duration: 950, easing: "cubic-bezier(0.22, 0.9, 0.28, 1)", fill: "forwards" },
    );
    shadow.current?.animate([{ opacity: 0, transform: "scaleX(0.3)" }, { opacity: 0.55, transform: "scaleX(1)" }], {
      duration: 950,
      easing: "ease-out",
      fill: "forwards",
    });
    let hopTimer = 0;
    let holdTimer = 0;
    void enter.finished.then(() => {
      setPhase("hold");
      b?.animate(
        [
          { opacity: 0, transform: "translateY(10px) scale(0.6)" },
          { opacity: 1, transform: "translateY(-4px) scale(1.06)", offset: 0.7 },
          { opacity: 1, transform: "translateY(0) scale(1)" },
        ],
        { duration: 420, easing: "cubic-bezier(0.2, 0.9, 0.3, 1.2)", fill: "forwards" },
      );
      // Two happy hops (with squash and stretch), the shadow shrinking while it is in the air.
      const hop = () => {
        f.animate(
          [
            { transform: "translateY(0) scale(1, 1)" },
            { transform: "translateY(4px) scale(1.06, 0.93)", offset: 0.15 },
            { transform: "translateY(-38px) scale(0.95, 1.06)", offset: 0.5 },
            { transform: "translateY(0) scale(1.05, 0.95)", offset: 0.85 },
            { transform: "translateY(0) scale(1, 1)" },
          ],
          { duration: 560, easing: "ease-in-out", iterations: 2 },
        );
        shadow.current?.animate(
          [{ transform: "scaleX(1)", opacity: 0.55 }, { transform: "scaleX(0.7)", opacity: 0.3, offset: 0.5 }, { transform: "scaleX(1)", opacity: 0.55 }],
          { duration: 560, iterations: 2 },
        );
      };
      hopTimer = window.setTimeout(hop, 120);
      holdTimer = window.setTimeout(leave, hold + 1150);
    }, () => undefined);
    return () => {
      window.clearTimeout(hopTimer);
      window.clearTimeout(holdTimer);
    };
  }, [motion, offset, small, hello.hold, leave]);

  // Any key or click sends Saarthi back early. The overlay never catches the
  // click itself: it goes on to whatever was under it.
  useEffect(() => {
    const away = () => leave();
    window.addEventListener("keydown", away);
    window.addEventListener("pointerdown", away, true);
    return () => {
      window.removeEventListener("keydown", away);
      window.removeEventListener("pointerdown", away, true);
    };
  }, [leave]);

  return (
    <div
      ref={stage}
      className="pointer-events-none fixed inset-0 z-[70] grid place-items-center"
      style={{ perspective: "900px", opacity: motion ? 1 : 0 }}
      data-testid="saarthi-hello"
      data-phase={phase}
    >
      {motion && <div className="k-hello-rings" aria-hidden />}
      <div className="relative flex flex-col items-center" style={{ transformStyle: "preserve-3d" }}>
        <div
          ref={bubble}
          role="status"
          aria-live="polite"
          className="k-hello-bubble cd-glass relative mb-3 max-w-[min(420px,86vw)] rounded-2xl border border-ai/40 px-5 py-3 text-center shadow-[var(--cd-shadow)]"
          style={{ opacity: motion ? 0 : 1 }}
        >
          <p className="text-[clamp(1.6rem,4vw,2.4rem)] font-semibold leading-tight tracking-[-0.02em] text-fg" data-testid="saarthi-hello-title">
            {hello.title}
          </p>
          {hello.text && <p className="mt-1 text-[13.5px] leading-snug text-muted">{hello.text}</p>}
        </div>
        <div ref={figure} className="relative will-change-transform" style={{ transformStyle: "preserve-3d", opacity: motion ? 0 : 1 }}>
          <SaarthiMascot size={size} mood={hello.mood ?? "wave"} label="Saarthi" />
        </div>
        <div
          ref={shadow}
          className="mt-[-10px] h-5 rounded-[50%] bg-black/35 blur-md"
          style={{ width: size * 0.55, opacity: motion ? 0 : 0.4 }}
          aria-hidden
        />
      </div>
    </div>
  );
}
