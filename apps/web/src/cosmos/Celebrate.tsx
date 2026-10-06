import { createContext, useCallback, useContext, useMemo, useState, type CSSProperties, type ReactNode } from "react";

interface Particle {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  size: number;
  color: string;
  shape: "star" | "dot" | "chip";
  rot: number;
  delay: number;
}

export interface BurstOptions {
  /** Viewport coordinates of the burst's centre (defaults to the middle of the screen). */
  x?: number;
  y?: number;
  count?: number;
  spread?: number;
  colors?: string[];
}

interface CelebrateApi {
  burst(options?: BurstOptions): void;
  /** A burst from the centre of an element. */
  burstFrom(element: Element | null, options?: Omit<BurstOptions, "x" | "y">): void;
}

const CelebrateContext = createContext<CelebrateApi>({ burst: () => undefined, burstFrom: () => undefined });

export const useCelebrate = () => useContext(CelebrateContext);

const COLORS = ["#22c55e", "#4ade80", "#16a34a", "#06b6d4", "#f59e0b", "#86efac"];
let nextId = 1;

/**
 * Small bursts of "build bits" (squares and plus signs in the signal colours)
 * for moments worth celebrating (a first clean run, a badge). Each particle is a DOM element animated with transform and
 * opacity only, removed after its animation. Skipped entirely when motion
 * is off.
 */
export function CelebrateProvider({ children, enabled }: { children: ReactNode; enabled: boolean }) {
  const [particles, setParticles] = useState<Particle[]>([]);

  const burst = useCallback(
    (options: BurstOptions = {}) => {
      if (!enabled) return;
      const x = options.x ?? window.innerWidth / 2;
      const y = options.y ?? window.innerHeight / 3;
      const count = options.count ?? 28;
      const spread = options.spread ?? 150;
      const colors = options.colors ?? COLORS;
      const fresh: Particle[] = Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
        const distance = spread * (0.45 + Math.random() * 0.75);
        return {
          id: nextId++,
          x,
          y,
          dx: Math.cos(angle) * distance,
          dy: Math.sin(angle) * distance - spread * 0.25,
          size: 5 + Math.random() * 7,
          color: colors[i % colors.length],
          shape: i % 3 === 0 ? "star" : i % 3 === 1 ? "dot" : "chip",
          rot: Math.round((Math.random() - 0.5) * 540),
          delay: Math.round(Math.random() * 90),
        };
      });
      setParticles((all) => [...all.slice(-120), ...fresh]);
      const ids = new Set(fresh.map((p) => p.id));
      window.setTimeout(() => setParticles((all) => all.filter((p) => !ids.has(p.id))), 1400);
    },
    [enabled],
  );

  const burstFrom = useCallback(
    (element: Element | null, options: Omit<BurstOptions, "x" | "y"> = {}) => {
      if (!element) return burst(options);
      const box = element.getBoundingClientRect();
      burst({ ...options, x: box.left + box.width / 2, y: box.top + box.height / 2 });
    },
    [burst],
  );

  const api = useMemo(() => ({ burst, burstFrom }), [burst, burstFrom]);
  return (
    <CelebrateContext.Provider value={api}>
      {children}
      <div aria-hidden>
        {particles.map((p) => (
          <span
            key={p.id}
            className="cd-particle"
            data-shape={p.shape === "star" ? "star" : undefined}
            style={
              {
                "--x": `${p.x}px`,
                "--y": `${p.y}px`,
                "--dx": `${p.dx}px`,
                "--dy": `${p.dy}px`,
                "--s": `${p.shape === "chip" ? p.size * 0.6 : p.size}px`,
                "--c": p.color,
                "--r": p.shape === "dot" ? "50%" : "2px",
                "--rot": `${p.rot}deg`,
                "--d": `${p.delay}ms`,
              } as CSSProperties
            }
          />
        ))}
      </div>
    </CelebrateContext.Provider>
  );
}
