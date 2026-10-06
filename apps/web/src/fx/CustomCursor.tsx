import { useEffect, useRef } from "react";
import { lerp } from "./context";

/** Elements the custom cursor reacts to. Text fields keep the normal caret. */
const TEXTY = "input, textarea, select, [contenteditable='true'], .monaco-editor";
const ACTIVE = "a, button, [role='button'], [role='radio'], [role='switch'], [role='option'], label, summary, [data-cursor]";

/**
 * The entry page's cursor: a dot that sits on the pointer and a ring that
 * follows it with a little inertia. Over a control the ring grows; over an
 * element with data-cursor="LABEL" it shows the label; over a text field it
 * gets out of the way. Decorative (aria-hidden), mounted only with a mouse
 * and with motion on, and never catches a click (pointer-events: none).
 */
export function CustomCursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const pos = { x: -100, y: -100 };
    const trail = { x: -100, y: -100 };
    let frame = 0;
    let shown = false;
    const setState = (state: string, text = "") => {
      if (!ring.current || !dot.current || !label.current) return;
      ring.current.dataset.state = state;
      dot.current.dataset.state = state;
      if (label.current.textContent !== text) label.current.textContent = text;
    };
    const loop = () => {
      trail.x = lerp(trail.x, pos.x, 0.2);
      trail.y = lerp(trail.y, pos.y, 0.2);
      if (ring.current) ring.current.style.transform = `translate3d(${trail.x}px, ${trail.y}px, 0)`;
      frame = Math.abs(trail.x - pos.x) + Math.abs(trail.y - pos.y) > 0.3 ? requestAnimationFrame(loop) : 0;
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      pos.x = e.clientX;
      pos.y = e.clientY;
      if (!shown) {
        shown = true;
        trail.x = pos.x;
        trail.y = pos.y;
        document.documentElement.dataset.kcursor = "on";
      }
      if (dot.current) dot.current.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
      if (!frame) frame = requestAnimationFrame(loop);
    };
    const onOver = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (!target?.closest) return;
      if (target.closest(TEXTY)) return setState("text");
      // (The root element carries data-kcursor, not data-cursor, so it never matches here.)
      const active = target.closest(ACTIVE) as HTMLElement | null;
      if (!active) return setState("idle");
      const text = active.dataset.cursor ?? "";
      setState(text ? "label" : "link", text);
    };
    const onDown = () => ring.current?.setAttribute("data-press", "true");
    const onUp = () => ring.current?.removeAttribute("data-press");
    const onLeave = () => {
      shown = false;
      delete document.documentElement.dataset.kcursor;
      setState("hidden");
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerover", onOver, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerover", onOver);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      delete document.documentElement.dataset.kcursor;
    };
  }, []);

  return (
    <div aria-hidden data-testid="custom-cursor">
      <div ref={ring} className="k-cursor-ring" data-state="hidden">
        <span ref={label} className="k-cursor-label" />
      </div>
      <div ref={dot} className="k-cursor-dot" data-state="hidden" />
    </div>
  );
}
