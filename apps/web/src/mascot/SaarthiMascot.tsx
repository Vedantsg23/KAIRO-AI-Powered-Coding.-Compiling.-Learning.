import { memo, useEffect, useId, useRef, type CSSProperties } from "react";
import { lookAt, watchPointer } from "../cosmos/pointer";

/**
 * Saarthi's moods. idle = calm, thinking = analysing (an answer is on its
 * way), explaining (Saarthi is talking), happy (a clean run, a verified fix),
 * concerned (an error was found), suggesting (a fix is ready), sleeping
 * (nothing happening for a while) and wave (hello).
 */
export type MascotMood = "idle" | "thinking" | "explaining" | "happy" | "concerned" | "suggesting" | "sleeping" | "wave";

/**
 * Saarthi, drawn: a small floating assistant with a white glossy helmet, a
 * dark visor with two green eyes, and a holo-platform under it. Original
 * artwork (SVG), animated with CSS (styles/kairo.css). `variant="head"`
 * crops to the head for small sizes. Memoised: its props are plain values,
 * and the drawing is large, so the console's renders while typing skip it.
 */
export const SaarthiMascot = memo(function SaarthiMascot({
  size = 64,
  mood = "idle",
  watch = true,
  label,
  className = "",
  variant = "full",
}: {
  size?: number;
  mood?: MascotMood;
  /** Eyes follow the pointer. */
  watch?: boolean;
  /** Accessible name; decorative when omitted. */
  label?: string;
  className?: string;
  variant?: "full" | "head";
}) {
  const id = useId().replace(/:/g, "");
  const svg = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!watch) return;
    return watchPointer((x, y) => {
      const el = svg.current;
      if (!el) return;
      const { dx, dy } = lookAt(el, x, y, 240, 0.42);
      el.style.setProperty("--px", dx.toFixed(3));
      el.style.setProperty("--py", dy.toFixed(3));
    });
  }, [watch]);

  const shell = `url(#${id}-shell)`;
  const visor = "M60 33 C79 33 89 38 89 50 C89 62 79 67 60 67 C41 67 31 62 31 50 C31 38 41 33 60 33 Z";
  return (
    <svg
      ref={svg}
      width={size}
      height={size}
      viewBox={variant === "head" ? "14 2 92 84" : "0 0 120 120"}
      className={`k-avatar mood-${mood} shrink-0 ${className}`}
      style={{ "--eye": "#4ade80" } as CSSProperties}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      data-testid="saarthi-mascot"
      data-mood={mood}
    >
      <defs>
        <radialGradient id={`${id}-shell`} cx="34%" cy="24%" r="85%">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.55" stopColor="#f1f6f3" />
          <stop offset="1" stopColor="#c9d7cf" />
        </radialGradient>
        <linearGradient id={`${id}-visor`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1d2b23" />
          <stop offset="0.5" stopColor="#0a130e" />
          <stop offset="1" stopColor="#040806" />
        </linearGradient>
        <radialGradient id={`${id}-pglow`}>
          <stop offset="0" stopColor="#22c55e" stopOpacity="0.55" />
          <stop offset="1" stopColor="#22c55e" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-beam`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#22c55e" stopOpacity="0.28" />
          <stop offset="1" stopColor="#22c55e" stopOpacity="0" />
        </linearGradient>
        <filter id={`${id}-blur`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
        <clipPath id={`${id}-vclip`}>
          <path d={visor} />
        </clipPath>
      </defs>

      {variant === "full" && (
        <g className="a-platform">
          <ellipse className="a-glow" cx="60" cy="107" rx="36" ry="9" fill={`url(#${id}-pglow)`} />
          <path d="M45 107 L51 86 L69 86 L75 107 Z" fill={`url(#${id}-beam)`} />
          <ellipse cx="60" cy="107" rx="25" ry="5.2" fill="none" stroke="#22c55e" strokeWidth="1.6" />
          <ellipse cx="60" cy="107" rx="33" ry="7.2" fill="none" stroke="#22c55e" strokeOpacity="0.45" strokeWidth="1" strokeDasharray="2 3.5" />
          <ellipse cx="60" cy="107" rx="13" ry="2.6" fill="#22c55e" fillOpacity="0.35" />
        </g>
      )}

      <g className="a-float">
        {variant === "full" && (
          <>
            <path d="M45 72 C48 86 54 94 60 96 C66 94 72 86 75 72 Z" fill={shell} stroke="#aebfb5" strokeWidth="1" />
            <rect x="57.6" y="80" width="4.8" height="6" rx="2.4" fill="#22c55e" />
            <g className="a-hand-l">
              <ellipse cx="29" cy="80" rx="6.8" ry="7.4" fill={shell} stroke="#aebfb5" strokeWidth="1" />
            </g>
            <g className="a-hand-r">
              <ellipse cx="91" cy="80" rx="6.8" ry="7.4" fill={shell} stroke="#aebfb5" strokeWidth="1" />
            </g>
          </>
        )}
        <line x1="60" y1="19" x2="60" y2="11" stroke="#9fb3a8" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="60" cy="9.5" r="5" fill="#22c55e" opacity="0.35" filter={`url(#${id}-blur)`} />
        <circle cx="60" cy="9.5" r="3.1" fill="#22c55e" />
        <rect x="17.5" y="40" width="9" height="20" rx="4.5" fill="#e4ece7" stroke="#aebfb5" strokeWidth="1" />
        <rect x="20.3" y="44.5" width="3.4" height="11" rx="1.7" fill="#22c55e" />
        <rect x="93.5" y="40" width="9" height="20" rx="4.5" fill="#e4ece7" stroke="#aebfb5" strokeWidth="1" />
        <rect x="96.3" y="44.5" width="3.4" height="11" rx="1.7" fill="#22c55e" />
        <path d="M60 18 C84 18 97 29 97 49 C97 69 84 79 60 79 C36 79 23 69 23 49 C23 29 36 18 60 18 Z" fill={shell} stroke="#aebfb5" strokeWidth="1.2" />
        <ellipse cx="43" cy="27.5" rx="11" ry="4.2" fill="#fff" opacity="0.9" transform="rotate(-17 43 27.5)" />
        <path d={visor} fill={`url(#${id}-visor)`} />
        <path d="M38 39.5 Q60 33.5 82 39.5" stroke="#fff" strokeOpacity="0.16" strokeWidth="2" fill="none" strokeLinecap="round" />
        <g clipPath={`url(#${id}-vclip)`}>
          <rect className="a-scan" x="30" y="34" width="60" height="2.4" fill="#4ade80" opacity="0.55" />
        </g>

        <g className="a-eyes">
          <g className="a-eye-open">
            <g filter={`url(#${id}-blur)`} opacity="0.75">
              <rect className="a-eye" x="42" y="43" width="10" height="13" rx="5" style={{ fill: "var(--eye)" }} />
              <rect className="a-eye" x="68" y="43" width="10" height="13" rx="5" style={{ fill: "var(--eye)" }} />
            </g>
            <rect className="a-eye" x="42" y="43" width="10" height="13" rx="5" style={{ fill: "var(--eye)" }} />
            <rect className="a-eye" x="68" y="43" width="10" height="13" rx="5" style={{ fill: "var(--eye)" }} />
            <rect className="a-eye" x="44.2" y="45" width="3" height="3.4" rx="1.5" fill="#eafff1" opacity="0.9" />
            <rect className="a-eye" x="70.2" y="45" width="3" height="3.4" rx="1.5" fill="#eafff1" opacity="0.9" />
          </g>
          <g className="a-eye-happy" strokeWidth="3.2" fill="none" strokeLinecap="round" style={{ stroke: "var(--eye)" }}>
            <path d="M41.5 52 Q47 43 52.5 52" />
            <path d="M67.5 52 Q73 43 78.5 52" />
          </g>
          <g className="a-eye-closed" strokeWidth="2.6" fill="none" strokeLinecap="round" style={{ stroke: "var(--eye)" }}>
            <path d="M42 50 Q47 53.5 52 50" />
            <path d="M68 50 Q73 53.5 78 50" />
          </g>
          <g className="a-brows" strokeWidth="2.2" strokeLinecap="round" style={{ stroke: "var(--eye)" }}>
            <path d="M41 39.5 L51.5 42" />
            <path d="M79 39.5 L68.5 42" />
          </g>
        </g>
        <path className="a-mouth-smile" d="M54.5 59.5 Q60 63.5 65.5 59.5" stroke="#4ade80" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path className="a-mouth-flat" d="M54 61 Q56.8 59 59.5 61 Q62.2 63 65 61" stroke="#fbbf24" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        <g className="a-eq" fill="#4ade80">
          <rect x="51.5" y="57" width="2" height="7" rx="1" />
          <rect x="55.2" y="56" width="2" height="9" rx="1" />
          <rect x="59" y="55" width="2" height="11" rx="1" />
          <rect x="62.8" y="56" width="2" height="9" rx="1" />
          <rect x="66.5" y="57" width="2" height="7" rx="1" />
        </g>

        <g className="a-holo-explain">
          <rect x="97" y="14" width="21" height="17" rx="2.5" fill="#22c55e" fillOpacity="0.12" stroke="#22c55e" strokeWidth="1" />
          <path d="M100.5 19 H113 M100.5 22.5 H110 M100.5 26 H114.5" stroke="#22c55e" strokeWidth="1.3" strokeLinecap="round" />
        </g>
        <g className="a-holo-idea" stroke="#22c55e" fill="none" strokeWidth="1.5" strokeLinecap="round">
          <path d="M107 13.5 a7 7 0 0 0 -4.2 12.6 v2.4 h8.4 v-2.4 a7 7 0 0 0 -4.2 -12.6 z" fill="#22c55e" fillOpacity="0.14" />
          <path d="M103.6 31.5 h6.8" />
          <path d="M107 7 v-2.5 M114 10 l1.8 -1.8 M100 10 l-1.8 -1.8" />
        </g>
        <g className="a-holo-alert">
          <path d="M106 7 L116 25 H96 Z" fill="#f59e0b" fillOpacity="0.16" stroke="#f59e0b" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M106 13 V19" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="106" cy="22" r="1.1" fill="#f59e0b" />
        </g>
        <g className="a-think" fill="#22c55e">
          <circle cx="84" cy="15" r="2.2" />
          <circle cx="92" cy="10" r="2.8" />
          <circle cx="101.5" cy="5.5" r="3.4" />
        </g>
        <g className="a-sparks" stroke="#22c55e" strokeWidth="1.7" strokeLinecap="round">
          <path d="M103 16 v7 M99.5 19.5 h7" />
          <path d="M15 22 v5 M12.5 24.5 h5" />
          <path d="M108 36 v4 M106 38 h4" />
        </g>
        <g className="a-zzz" fill="#22c55e" fontFamily="var(--font-mono)" fontWeight="700">
          <text x="86" y="17" fontSize="10">
            z
          </text>
          <text x="95" y="9" fontSize="13">
            Z
          </text>
        </g>
      </g>
    </svg>
  );
});
