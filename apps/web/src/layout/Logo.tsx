import { memo, useId } from "react";

/**
 * KAIRO's mark: a dark chip with a "K" built from a stem and a code chevron
 * ("|<"), and a green cursor that blinks when `animated`.
 */
export const KairoMark = memo(function KairoMark({ size = 30, animated = false }: { size?: number; animated?: boolean }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden className="shrink-0">
      <defs>
        <linearGradient id={`${id}-edge`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4ade80" />
          <stop offset="0.5" stopColor="#22c55e" stopOpacity="0.35" />
          <stop offset="1" stopColor="#22c55e" stopOpacity="0.9" />
        </linearGradient>
        <linearGradient id={`${id}-tile`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#15211a" />
          <stop offset="1" stopColor="#070c09" />
        </linearGradient>
      </defs>
      <rect x="0.75" y="0.75" width="38.5" height="38.5" rx="10" fill={`url(#${id}-tile)`} stroke={`url(#${id}-edge)`} strokeWidth="1.5" />
      {/* HUD ticks */}
      <path d="M6 9.5 V6 H9.5 M30.5 6 H34 V9.5 M34 30.5 V34 H30.5 M9.5 34 H6 V30.5" stroke="#22c55e" strokeOpacity="0.45" strokeWidth="1.1" fill="none" />
      <path d="M13 10.5 V29.5" stroke="#f2f7f3" strokeWidth="3.6" strokeLinecap="square" />
      <path d="M26.5 10.5 L17 20 L26.5 29.5" stroke="#22c55e" strokeWidth="3.6" strokeLinecap="square" strokeLinejoin="miter" fill="none" />
      <rect className={animated ? "k-caret" : undefined} x="28.5" y="26.2" width="4.6" height="3.3" fill="#4ade80" />
    </svg>
  );
});

/**
 * The KAIRO wordmark, drawn: geometric monoline letters where the "I" is a
 * green text caret (KA|RO); it stays lit so the name always reads. Uses
 * currentColor, so it follows the theme.
 */
export function KairoWordmark({ height = 16, className = "" }: { height?: number; animated?: boolean; className?: string }) {
  return (
    <svg
      height={height}
      viewBox="-2 -2 104 24"
      className={`shrink-0 ${className}`}
      role="img"
      aria-label="KAIRO"
      style={{ width: (height * 104) / 24 }}
    >
      <g stroke="currentColor" strokeWidth="3.2" fill="none" strokeLinecap="square" strokeLinejoin="miter">
        <path d="M1.6 0 V20" />
        <path d="M15 0 L5 10 L15 20" />
        <path d="M22 20 L30.5 0 L39 20" />
        <path d="M58.6 20 V1.6 H66 A4.9 4.9 0 0 1 66 11.4 H58.6 M65 11.4 L72 20" />
        <rect x="80.6" y="1.6" width="16.2" height="16.8" rx="5.6" />
      </g>
      <rect x="46.6" y="-1" width="3.6" height="22" fill="var(--cd-brand)" />
    </svg>
  );
}

/** Mark + wordmark (+ optional sub-label), as used in the system bar and on the entry page. */
export const KairoLogo = memo(function KairoLogo({
  size = 30,
  animated = false,
  sub,
  compact = false,
}: {
  size?: number;
  animated?: boolean;
  /** A small mono label after a slash, e.g. "COMPILER OS". */
  sub?: string;
  /** Only the mark on phones. */
  compact?: boolean;
}) {
  return (
    <span className="flex items-center gap-2.5">
      <KairoMark size={size} animated={animated} />
      <span className={`items-center gap-2 text-fg ${compact ? "hidden sm:flex" : "flex"}`}>
        <KairoWordmark height={Math.round(size * 0.46)} animated={animated} />
        {sub && (
          <span className="hidden items-center gap-2 font-mono text-[10.5px] font-semibold tracking-[0.16em] text-faint sm:flex">
            <span className="text-line-strong">/</span>
            {sub}
          </span>
        )}
      </span>
    </span>
  );
});

/** Saarthi's emblem: the assistant's head (white helmet, dark visor, green eyes). */
export const SaarthiMark = memo(function SaarthiMark({ size = 32 }: { size?: number }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className="shrink-0">
      <defs>
        <linearGradient id={`${id}-shell`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#d7e2dc" />
        </linearGradient>
      </defs>
      <rect x="2.5" y="3.5" width="27" height="25" rx="11" fill={`url(#${id}-shell)`} stroke="#9fb3a8" strokeWidth="1" />
      <rect x="6" y="9.5" width="20" height="12" rx="6" fill="#0b1510" />
      <rect x="10" y="13.4" width="4" height="4.4" rx="2" fill="#4ade80" />
      <rect x="18" y="13.4" width="4" height="4.4" rx="2" fill="#4ade80" />
      <circle cx="16" cy="4.6" r="1.6" fill="#22c55e" />
    </svg>
  );
});
