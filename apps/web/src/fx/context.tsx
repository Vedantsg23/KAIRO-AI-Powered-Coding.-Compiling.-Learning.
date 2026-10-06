import { createContext, useContext, useEffect, useState } from "react";

/**
 * Whether decorative motion is on (the system's "reduce motion" setting and
 * the student's Animations switch) and whether the pointer is a precise,
 * hovering one (mouse or trackpad). Touch screens get no cursor effects.
 */
export interface Fx {
  motion: boolean;
  fine: boolean;
}

export const FxContext = createContext<Fx>({ motion: true, fine: true });

export const useFx = () => useContext(FxContext);

const FINE = "(hover: hover) and (pointer: fine)";

export function useFinePointer(): boolean {
  const [fine, setFine] = useState(() => typeof window !== "undefined" && !!window.matchMedia?.(FINE).matches);
  useEffect(() => {
    const list = window.matchMedia?.(FINE);
    if (!list) return;
    const update = () => setFine(list.matches);
    list.addEventListener("change", update);
    return () => list.removeEventListener("change", update);
  }, []);
  return fine;
}

/** Linear interpolation, and a clamp, used by the pointer effects. */
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
