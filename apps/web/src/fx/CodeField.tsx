import { useEffect, useRef } from "react";
import { useFx } from "./context";

const GLYPHS = ["{", "}", "(", ")", ";", "<", ">", "=", "/", "*", "+", "0", "1", "#", "[", "]", ":", "=>", "&&", "::", "{}", "()", "if", "fn", "int", "for"];

interface Glyph {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ox: number;
  oy: number;
  text: string;
  size: number;
  alpha: number;
  depth: number;
}

/**
 * The entry page's living background: code glyphs drifting on the grid,
 * pushed aside by the pointer and wired to their neighbours near it, like a
 * syntax tree being read. A 2D canvas drawn once per frame only while it is
 * on screen and the tab is visible; one still frame with motion off.
 * Colours come from the theme tokens, so it follows light and dark.
 */
export function CodeField({ className = "", density = 1 }: { className?: string; density?: number }) {
  const { motion, fine } = useFx();
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let glyphs: Glyph[] = [];
    let frame = 0;
    let visible = true;
    let colors = { fg: "#0b1510", brand: "#22c55e" };
    const pointer = { x: -9999, y: -9999, active: false };
    const readColors = () => {
      const style = getComputedStyle(el);
      colors = { fg: style.getPropertyValue("--cd-fg").trim() || colors.fg, brand: style.getPropertyValue("--cd-brand").trim() || colors.brand };
    };
    const seed = () => {
      const count = Math.round(Math.min(140, (width * height) / 9000) * density);
      glyphs = Array.from({ length: count }, () => {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const depth = 0.4 + Math.random() * 0.8;
        return {
          x,
          y,
          ox: x,
          oy: y,
          vx: (Math.random() - 0.5) * 0.18 * depth,
          vy: (Math.random() - 0.5) * 0.12 * depth - 0.05,
          text: GLYPHS[(Math.random() * GLYPHS.length) | 0],
          size: 10 + depth * 7,
          alpha: 0.08 + depth * 0.15,
          depth,
        };
      });
    };
    const resize = () => {
      const box = el.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      width = Math.max(1, box.width);
      height = Math.max(1, box.height);
      el.width = Math.round(width * dpr);
      el.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      readColors();
      seed();
      draw(0);
    };
    const draw = (step: number) => {
      ctx.clearRect(0, 0, width, height);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const near: Glyph[] = [];
      for (const g of glyphs) {
        if (step) {
          g.ox += g.vx * step;
          g.oy += g.vy * step;
          if (g.ox < -20) g.ox = width + 20;
          if (g.ox > width + 20) g.ox = -20;
          if (g.oy < -20) g.oy = height + 20;
          if (g.oy > height + 20) g.oy = -20;
          // Pushed away from the pointer, then back to the drifting position.
          let tx = g.ox;
          let ty = g.oy;
          if (pointer.active) {
            const dx = g.ox - pointer.x;
            const dy = g.oy - pointer.y;
            const d = Math.hypot(dx, dy);
            if (d < 150 && d > 0.01) {
              const push = (1 - d / 150) * 46 * g.depth;
              tx += (dx / d) * push;
              ty += (dy / d) * push;
            }
          }
          g.x += (tx - g.x) * 0.12;
          g.y += (ty - g.y) * 0.12;
        }
        const d = pointer.active ? Math.hypot(g.x - pointer.x, g.y - pointer.y) : 9999;
        const lit = d < 190;
        if (lit) near.push(g);
        ctx.globalAlpha = lit ? Math.min(0.9, g.alpha + (1 - d / 190) * 0.6) : g.alpha;
        ctx.fillStyle = lit ? colors.brand : colors.fg;
        ctx.font = `600 ${g.size.toFixed(1)}px "JetBrains Mono Variable", "JetBrains Mono", monospace`;
        ctx.fillText(g.text, g.x, g.y);
      }
      // Wire the glyphs near the pointer to their neighbours.
      if (near.length > 1) {
        ctx.strokeStyle = colors.brand;
        ctx.lineWidth = 1;
        for (let i = 0; i < near.length; i++) {
          for (let j = i + 1; j < near.length; j++) {
            const a = near[i];
            const b = near[j];
            const d = Math.hypot(a.x - b.x, a.y - b.y);
            if (d > 95) continue;
            ctx.globalAlpha = (1 - d / 95) * 0.35;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
    };
    let last = performance.now();
    let frames = 0;
    const loop = (now: number) => {
      const step = Math.min(3, (now - last) / 16.7);
      last = now;
      if (++frames % 90 === 0) readColors();
      draw(step);
      frame = requestAnimationFrame(loop);
    };
    const start = () => {
      if (!motion || frame || !visible || document.hidden) return;
      last = performance.now();
      frame = requestAnimationFrame(loop);
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
    };
    const onMove = (e: PointerEvent) => {
      const box = el.getBoundingClientRect();
      pointer.x = e.clientX - box.left;
      pointer.y = e.clientY - box.top;
      pointer.active = pointer.x >= -40 && pointer.y >= -40 && pointer.x <= width + 40 && pointer.y <= height + 40;
    };
    const onVisibility = () => (document.hidden ? stop() : start());
    const resizer = new ResizeObserver(resize);
    resizer.observe(el);
    const watcher = new IntersectionObserver((entries) => {
      visible = entries.some((e) => e.isIntersecting);
      if (visible) start();
      else stop();
    });
    watcher.observe(el);
    const themes = new MutationObserver(() => {
      readColors();
      if (!frame) draw(0);
    });
    themes.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    if (fine) window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    resize();
    start();
    return () => {
      stop();
      resizer.disconnect();
      watcher.disconnect();
      themes.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [motion, fine, density]);

  return <canvas ref={canvas} className={`pointer-events-none ${className}`} aria-hidden data-testid="code-field" />;
}
