import { useEffect } from "react";
import { clamp } from "./context";

/**
 * Magnetic controls: an element with data-magnetic leans towards the
 * pointer while it is over it (a few pixels, strength from the attribute,
 * default 0.3) and springs back when the pointer leaves. One listener for
 * the whole page; the element's resting box is measured once on entry, so
 * the movement never feeds back into itself. Mounted only with a mouse and
 * with motion on. data-ripple adds a press ripple where it was clicked.
 */
export function MagneticField() {
  useEffect(() => {
    let active: HTMLElement | null = null;
    let rest: DOMRect | null = null;
    let frame = 0;
    let last = { x: 0, y: 0 };

    const release = () => {
      if (!active) return;
      active.style.transform = "";
      active.removeAttribute("data-magnet");
      active = null;
      rest = null;
    };
    const apply = () => {
      frame = 0;
      if (!active || !rest) return;
      const strength = Number(active.dataset.magnetic) || 0.3;
      const max = Math.max(4, Math.min(12, rest.width * 0.12));
      const dx = clamp((last.x - (rest.left + rest.width / 2)) * strength, -max, max);
      const dy = clamp((last.y - (rest.top + rest.height / 2)) * strength, -max, max);
      active.style.transform = `translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, 0)`;
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      last = { x: e.clientX, y: e.clientY };
      const target = (e.target as Element | null)?.closest?.("[data-magnetic]") as HTMLElement | null;
      if (target !== active) {
        release();
        if (target && !(target as HTMLButtonElement).disabled) {
          active = target;
          active.style.transform = "";
          rest = active.getBoundingClientRect();
          active.setAttribute("data-magnet", "on");
        }
      }
      if (active && !frame) frame = requestAnimationFrame(apply);
    };
    const onDown = (e: PointerEvent) => {
      const host = (e.target as Element | null)?.closest?.("[data-ripple]") as HTMLElement | null;
      if (!host || (host as HTMLButtonElement).disabled) return;
      const box = host.getBoundingClientRect();
      const size = Math.max(box.width, box.height) * 2.2;
      const drop = document.createElement("span");
      drop.className = "k-ripple";
      drop.setAttribute("aria-hidden", "true");
      drop.style.width = drop.style.height = `${size}px`;
      drop.style.left = `${e.clientX - box.left - size / 2}px`;
      drop.style.top = `${e.clientY - box.top - size / 2}px`;
      host.appendChild(drop);
      window.setTimeout(() => drop.remove(), 650);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("scroll", release, { passive: true, capture: true });
    window.addEventListener("blur", release);
    return () => {
      cancelAnimationFrame(frame);
      release();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("scroll", release, { capture: true });
      window.removeEventListener("blur", release);
    };
  }, []);
  return null;
}
