import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { clamp, useFx } from "./context";

/**
 * A card that tilts towards the pointer in 3D, with a soft glare where the
 * pointer is. The tilt is written as CSS variables on the card itself (it
 * has few children), once per frame.
 */
export function Tilt({ children, className = "", max = 7, style }: { children: ReactNode; className?: string; max?: number; style?: CSSProperties }) {
  const { motion, fine } = useFx();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !motion || !fine) return;
    let frame = 0;
    let point = { x: 0.5, y: 0.5 };
    const paint = () => {
      frame = 0;
      el.style.setProperty("--rx", `${((0.5 - point.y) * max * 2).toFixed(2)}deg`);
      el.style.setProperty("--ry", `${((point.x - 0.5) * max * 2).toFixed(2)}deg`);
      el.style.setProperty("--gx", `${(point.x * 100).toFixed(1)}%`);
      el.style.setProperty("--gy", `${(point.y * 100).toFixed(1)}%`);
    };
    const onMove = (e: PointerEvent) => {
      const box = el.getBoundingClientRect();
      point = { x: clamp((e.clientX - box.left) / box.width, 0, 1), y: clamp((e.clientY - box.top) / box.height, 0, 1) };
      el.dataset.tilt = "on";
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const onLeave = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      delete el.dataset.tilt;
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--ry", "0deg");
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [motion, fine, max]);
  return (
    <div ref={ref} className={`k-tilt ${className}`} style={style}>
      {children}
      <span className="k-tilt-glare" aria-hidden />
    </div>
  );
}

/**
 * Layers that drift with the pointer for depth (the entry page's hero):
 * every child with data-depth="n" moves n px at the edges of the host.
 */
export function useParallax(host: () => HTMLElement | null) {
  const { motion, fine } = useFx();
  useEffect(() => {
    const el = host();
    if (!el || !motion || !fine) return;
    const layers = [...el.querySelectorAll<HTMLElement>("[data-depth]")];
    let frame = 0;
    let target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    const paint = () => {
      current.x += (target.x - current.x) * 0.08;
      current.y += (target.y - current.y) * 0.08;
      for (const layer of layers) {
        const depth = Number(layer.dataset.depth) || 0;
        layer.style.translate = `${(current.x * depth).toFixed(2)}px ${(current.y * depth).toFixed(2)}px`;
      }
      frame = Math.abs(target.x - current.x) + Math.abs(target.y - current.y) > 0.001 ? requestAnimationFrame(paint) : 0;
    };
    const onMove = (e: PointerEvent) => {
      const box = el.getBoundingClientRect();
      target = { x: clamp((e.clientX - box.left) / box.width - 0.5, -0.5, 0.5) * 2, y: clamp((e.clientY - box.top) / box.height - 0.5, -0.5, 0.5) * 2 };
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const onLeave = () => {
      target = { x: 0, y: 0 };
      if (!frame) frame = requestAnimationFrame(paint);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    el.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      for (const layer of layers) layer.style.translate = "";
    };
  }, [host, motion, fine]);
}

/**
 * Panel spotlight: while the pointer is over a .k-panel, the panel's border
 * lights up near the pointer. The position goes to the panel's own
 * .k-spot child (an empty element), so no other element restyles.
 */
export function useSpotlight(root: () => HTMLElement | null) {
  const { motion, fine } = useFx();
  useEffect(() => {
    const host = root();
    if (!host || !motion || !fine) return;
    let spot: HTMLElement | null = null;
    let panel: HTMLElement | null = null;
    let frame = 0;
    let point = { x: 0, y: 0 };
    const paint = () => {
      frame = 0;
      if (!spot || !panel) return;
      const box = panel.getBoundingClientRect();
      spot.style.setProperty("--mx", `${(point.x - box.left).toFixed(0)}px`);
      spot.style.setProperty("--my", `${(point.y - box.top).toFixed(0)}px`);
    };
    const onMove = (e: PointerEvent) => {
      point = { x: e.clientX, y: e.clientY };
      const next = (e.target as Element | null)?.closest?.(".k-panel") as HTMLElement | null;
      if (next !== panel) {
        spot?.removeAttribute("data-on");
        panel = next;
        spot = next?.querySelector<HTMLElement>(":scope > .k-spot") ?? null;
        spot?.setAttribute("data-on", "true");
      }
      if (spot && !frame) frame = requestAnimationFrame(paint);
    };
    const onLeave = () => {
      spot?.removeAttribute("data-on");
      spot = null;
      panel = null;
    };
    host.addEventListener("pointermove", onMove, { passive: true });
    host.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      onLeave();
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
    };
  }, [root, motion, fine]);
}

/** The empty element a panel's spotlight is drawn on (see useSpotlight). */
export function Spot() {
  return <span className="k-spot" aria-hidden />;
}
