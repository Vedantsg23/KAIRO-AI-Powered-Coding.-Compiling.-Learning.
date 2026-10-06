import { useEffect, useRef } from "react";

/**
 * The entry page's changing background. Each chapter of the page has its own
 * scene, drawn on one fixed canvas behind the content, and scenes cross-fade
 * when the chapter in the middle of the screen changes:
 *
 *   stars   drifting points wired to their neighbours (a constellation)
 *   grid    a perspective blueprint floor rolling towards you, with a scan line
 *   waves   ribbons of sine waves flowing across the page
 *   orbits  rings turning around a bright core, with small satellites
 *
 * Colours come from the page's tokens (--cd-fg, --cd-brand, --cd-ai), read
 * every frame, so a scene follows the page as it turns dark or light. It only
 * animates while the tab is visible; with motion off it draws one still frame.
 */
export type Scene = "none" | "stars" | "grid" | "waves" | "orbits";

const SCENES: Exclude<Scene, "none">[] = ["stars", "grid", "waves", "orbits"];
const FADE_MS = 750;

interface Colors {
  fg: string;
  brand: string;
  ai: string;
}

interface Star {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}

type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number, c: Colors) => void;

function makeStars(w: number, h: number): Star[] {
  const count = Math.round(Math.min(90, Math.max(30, (w * h) / 16000)));
  return Array.from({ length: count }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    vx: (Math.random() - 0.5) * 0.25,
    vy: (Math.random() - 0.5) * 0.25,
    r: 0.8 + Math.random() * 1.8,
  }));
}

export function SceneCanvas({ scene, motion, className = "" }: { scene: Scene; motion: boolean; className?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const target = useRef(scene);
  target.current = scene;
  const redraw = useRef<() => void>(() => undefined);

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    let w = 0;
    let h = 0;
    let stars: Star[] = [];
    let frame = 0;
    let last = performance.now();
    const alpha: Record<string, number> = { stars: 0, grid: 0, waves: 0, orbits: 0 };
    let colors: Colors = { fg: "#888", brand: "#22c55e", ai: "#06b6d4" };

    const readColors = () => {
      const style = getComputedStyle(el);
      colors = {
        fg: style.getPropertyValue("--cd-fg").trim() || colors.fg,
        brand: style.getPropertyValue("--cd-brand").trim() || colors.brand,
        ai: style.getPropertyValue("--cd-ai").trim() || colors.ai,
      };
    };

    const resize = () => {
      const dpr = Math.min(1.5, window.devicePixelRatio || 1);
      w = el.clientWidth;
      h = el.clientHeight;
      el.width = Math.max(1, Math.round(w * dpr));
      el.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stars = makeStars(w, h);
    };

    const drawStars: Draw = (g, width, height, t, c) => {
      const move = motion ? 1 : 0;
      for (const s of stars) {
        s.x += s.vx * move;
        s.y += s.vy * move;
        if (s.x < -20) s.x = width + 20;
        if (s.x > width + 20) s.x = -20;
        if (s.y < -20) s.y = height + 20;
        if (s.y > height + 20) s.y = -20;
      }
      const base = g.globalAlpha;
      const reach = 130;
      g.lineWidth = 1;
      g.strokeStyle = c.brand;
      for (let i = 0; i < stars.length; i++) {
        const a = stars[i];
        for (let j = i + 1; j < stars.length; j++) {
          const b = stars[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          if (dx > reach || dx < -reach || dy > reach || dy < -reach) continue;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d > reach) continue;
          g.globalAlpha = base * (1 - d / reach) * 0.35;
          g.beginPath();
          g.moveTo(a.x, a.y);
          g.lineTo(b.x, b.y);
          g.stroke();
        }
      }
      g.fillStyle = c.fg;
      for (const s of stars) {
        g.globalAlpha = base * 0.5 * (0.55 + 0.45 * Math.sin(t / 900 + s.x * 0.05));
        g.beginPath();
        g.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = base;
    };

    const drawGrid: Draw = (g, width, height, t, c) => {
      const horizon = height * 0.32;
      const cx = width / 2;
      g.lineWidth = 1;
      g.strokeStyle = c.fg;
      // Lines towards the vanishing point.
      g.save();
      g.globalAlpha = g.globalAlpha * 0.13;
      for (let i = -16; i <= 16; i++) {
        g.beginPath();
        g.moveTo(cx + i * 18, horizon);
        g.lineTo(cx + i * (width / 9), height);
        g.stroke();
      }
      g.restore();
      // Rows rolling towards the viewer (spacing grows with depth).
      const shift = motion ? (t / 2400) % 1 : 0.35;
      for (let k = 0; k < 14; k++) {
        const z = (k + shift) / 14;
        const y = horizon + (height - horizon) * z * z;
        g.save();
        g.globalAlpha = g.globalAlpha * (0.05 + 0.16 * z);
        g.beginPath();
        g.moveTo(0, y);
        g.lineTo(width, y);
        g.stroke();
        g.restore();
      }
      // A scan line sweeping down the page.
      const scan = motion ? ((t / 4200) % 1) * height : height * 0.6;
      const grad = g.createLinearGradient(0, scan - 60, 0, scan);
      grad.addColorStop(0, "transparent");
      grad.addColorStop(1, c.brand);
      g.save();
      g.globalAlpha = g.globalAlpha * 0.16;
      g.fillStyle = grad;
      g.fillRect(0, scan - 60, width, 60);
      g.restore();
    };

    const drawWaves: Draw = (g, width, height, t, c) => {
      const time = motion ? t / 1000 : 2;
      const ribbons = [
        { y: 0.28, amp: 36, len: 420, speed: 0.6, color: c.brand, a: 0.22 },
        { y: 0.42, amp: 52, len: 560, speed: -0.45, color: c.ai, a: 0.18 },
        { y: 0.58, amp: 30, len: 340, speed: 0.8, color: c.fg, a: 0.1 },
        { y: 0.74, amp: 46, len: 480, speed: -0.3, color: c.brand, a: 0.14 },
      ];
      for (const r of ribbons) {
        for (let line = 0; line < 3; line++) {
          g.save();
          g.globalAlpha = g.globalAlpha * r.a * (1 - line * 0.28);
          g.strokeStyle = r.color;
          g.lineWidth = 1.4;
          g.beginPath();
          for (let x = 0; x <= width; x += 8) {
            const y =
              height * r.y +
              line * 10 +
              Math.sin((x / r.len) * Math.PI * 2 + time * r.speed * 2 + line * 0.5) * r.amp +
              Math.sin((x / (r.len * 0.37)) * Math.PI * 2 - time * r.speed) * r.amp * 0.25;
            if (x === 0) g.moveTo(x, y);
            else g.lineTo(x, y);
          }
          g.stroke();
          g.restore();
        }
      }
    };

    const drawOrbits: Draw = (g, width, height, t, c) => {
      const cx = width * 0.72;
      const cy = height * 0.5;
      const time = motion ? t / 1000 : 1.3;
      const glow = g.createRadialGradient(cx, cy, 0, cx, cy, Math.min(width, height) * 0.22);
      glow.addColorStop(0, c.brand);
      glow.addColorStop(1, "transparent");
      g.save();
      g.globalAlpha = g.globalAlpha * 0.16;
      g.fillStyle = glow;
      g.fillRect(0, 0, width, height);
      g.restore();
      const rings = [0.12, 0.2, 0.29, 0.39, 0.5];
      rings.forEach((ratio, i) => {
        const rx = Math.min(width, height * 1.6) * ratio;
        const ry = rx * 0.42;
        const tilt = -0.35;
        g.save();
        g.translate(cx, cy);
        g.rotate(tilt);
        g.globalAlpha = g.globalAlpha * 0.16;
        g.strokeStyle = c.fg;
        g.lineWidth = 1;
        g.beginPath();
        g.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        g.stroke();
        const angle = time * (0.5 / (i + 1)) + i * 1.7;
        g.globalAlpha = (g.globalAlpha / 0.16) * 0.8;
        g.fillStyle = i % 2 ? c.ai : c.brand;
        g.beginPath();
        g.arc(Math.cos(angle) * rx, Math.sin(angle) * ry, 3 + (i % 3), 0, Math.PI * 2);
        g.fill();
        g.restore();
      });
    };

    const DRAW: Record<string, Draw> = { stars: drawStars, grid: drawGrid, waves: drawWaves, orbits: drawOrbits };

    const paint = (now: number) => {
      const dt = Math.min(100, now - last);
      last = now;
      readColors();
      ctx.clearRect(0, 0, w, h);
      for (const name of SCENES) {
        const want = target.current === name ? 1 : 0;
        alpha[name] = motion ? alpha[name] + Math.sign(want - alpha[name]) * Math.min(Math.abs(want - alpha[name]), dt / FADE_MS) : want;
        if (alpha[name] < 0.01) continue;
        ctx.save();
        ctx.globalAlpha = alpha[name];
        DRAW[name](ctx, w, h, now, colors);
        ctx.restore();
      }
    };

    const loop = (now: number) => {
      paint(now);
      frame = requestAnimationFrame(loop);
    };
    const start = () => {
      cancelAnimationFrame(frame);
      last = performance.now();
      if (motion && !document.hidden) frame = requestAnimationFrame(loop);
      else paint(performance.now());
    };
    redraw.current = () => {
      if (!motion) paint(performance.now());
    };

    resize();
    start();
    const onResize = () => {
      resize();
      if (!motion) paint(performance.now());
    };
    const onVisibility = () => start();
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [motion]);

  // With motion off there is no loop: draw the new scene once (after the tone change settles).
  useEffect(() => {
    redraw.current();
    const timer = window.setTimeout(() => redraw.current(), 60);
    return () => window.clearTimeout(timer);
  }, [scene]);

  return <canvas ref={canvas} aria-hidden className={`pointer-events-none fixed inset-0 h-full w-full ${className}`} data-testid="scene-canvas" data-scene={scene} />;
}
