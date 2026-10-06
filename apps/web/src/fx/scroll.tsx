import { createElement, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useFx } from "./context";

/** True once the element has scrolled into view (and stays true). */
export function useInView<T extends Element>(options: { threshold?: number; rootMargin?: string } = {}) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: options.threshold ?? 0.15, rootMargin: options.rootMargin ?? "0px 0px -8% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [inView, options.threshold, options.rootMargin]);
  return [ref, inView] as const;
}

/** Content that slides and fades in the first time it scrolls into view. */
export function Reveal({
  children,
  as = "div",
  className = "",
  delay = 0,
  from = "up",
}: {
  children: ReactNode;
  as?: "div" | "section" | "li" | "ul" | "p" | "span";
  className?: string;
  delay?: number;
  from?: "up" | "left" | "right" | "zoom";
}) {
  const { motion } = useFx();
  const [ref, inView] = useInView<HTMLElement>();
  return createElement(
    as,
    {
      ref,
      className: `${className} ${motion ? `k-reveal k-reveal-${from}` : ""} ${inView || !motion ? "is-in" : ""}`,
      style: { "--delay": `${delay}ms` } as CSSProperties,
    },
    children,
  );
}

/** A number that counts up once it is in view. The final value is always in the page for screen readers. */
export function Counter({ value, suffix = "", duration = 1400, className = "" }: { value: number; suffix?: string; duration?: number; className?: string }) {
  const { motion } = useFx();
  const [ref, inView] = useInView<HTMLSpanElement>({ threshold: 0.4 });
  const shown = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = shown.current;
    if (!el) return;
    if (!motion) {
      el.textContent = `${value}${suffix}`;
      return;
    }
    if (!inView) {
      el.textContent = `0${suffix}`;
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = `${Math.round(value * eased)}${suffix}`;
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, motion, value, suffix, duration]);
  return (
    <span ref={ref} className={className}>
      <span className="sr-only">{`${value}${suffix}`}</span>
      <span ref={shown} aria-hidden className="tabular-nums" />
    </span>
  );
}

/**
 * An endless band of words (languages, features). It drifts left, speeds up
 * while the page scrolls and turns with the scroll direction; hovering holds
 * it. With motion off it stands still.
 */
export function Marquee({
  items,
  className = "",
  scroller,
  reverse = false,
  speed = 0.55,
}: {
  items: ReactNode[];
  className?: string;
  scroller?: () => HTMLElement | null;
  /** Drift right instead of left. */
  reverse?: boolean;
  /** px per frame at rest. */
  speed?: number;
}) {
  const { motion } = useFx();
  const track = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!motion) return;
    const el = track.current;
    const host = scroller?.() ?? window;
    if (!el || !host) return;
    let x = 0;
    let velocity = 0;
    let direction = 1;
    let frame = 0;
    let hovering = false;
    let lastScroll = host instanceof Window ? host.scrollY : host.scrollTop;
    const onScroll = () => {
      const now = host instanceof Window ? host.scrollY : host.scrollTop;
      const delta = now - lastScroll;
      lastScroll = now;
      if (delta !== 0) direction = delta > 0 ? 1 : -1;
      velocity = Math.min(14, velocity + Math.abs(delta) * 0.12);
    };
    const tick = () => {
      if (!hovering) {
        const width = el.scrollWidth / 2;
        x -= (reverse ? -1 : 1) * direction * (speed + velocity);
        if (width > 0) x = ((x % width) - width) % width;
        el.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0)`;
      }
      velocity *= 0.92;
      frame = requestAnimationFrame(tick);
    };
    const enter = () => (hovering = true);
    const leave = () => (hovering = false);
    host.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("pointerenter", enter);
    el.addEventListener("pointerleave", leave);
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      host.removeEventListener("scroll", onScroll);
      el.removeEventListener("pointerenter", enter);
      el.removeEventListener("pointerleave", leave);
    };
  }, [motion, scroller, reverse, speed]);
  return (
    <div className={`k-marquee ${className}`} aria-hidden>
      <div ref={track} className="k-marquee-track">
        {[0, 1].map((copy) => (
          <div key={copy} className="k-marquee-set">
            {items.map((item, i) => (
              <span key={i} className="k-marquee-item">
                {item}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Scroll progress (0..1) of a scroll container, written to a CSS variable on `target`. */
export function useScrollProgress(scroller: () => HTMLElement | null, target: () => HTMLElement | null, name = "--progress") {
  useEffect(() => {
    const host = scroller();
    const el = target();
    if (!host || !el) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = host.scrollHeight - host.clientHeight;
      el.style.setProperty(name, max > 0 ? (host.scrollTop / max).toFixed(4) : "0");
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    host.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      host.removeEventListener("scroll", onScroll);
    };
  }, [scroller, target, name]);
}
