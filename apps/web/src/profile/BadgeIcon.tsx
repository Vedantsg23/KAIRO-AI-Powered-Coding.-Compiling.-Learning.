import {
  BadgeCheck,
  Bug,
  CalendarCheck,
  CalendarDays,
  Compass,
  Flame,
  Hammer,
  Keyboard,
  Layers,
  Languages,
  Lightbulb,
  Lock,
  Moon,
  Orbit,
  Sparkles,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { BadgeDef, BadgeTier } from "./achievements";

const ICONS: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  hammer: Hammer,
  layers: Layers,
  bug: Bug,
  lightbulb: Lightbulb,
  keyboard: Keyboard,
  compass: Compass,
  flame: Flame,
  languages: Languages,
  "badge-check": BadgeCheck,
  calendar: CalendarDays,
  moon: Moon,
  zap: Zap,
  orbit: Orbit,
  "calendar-check": CalendarCheck,
  trophy: Trophy,
};

const TIER: Record<BadgeTier, { from: string; to: string; label: string }> = {
  bronze: { from: "#f4b183", to: "#b5542a", label: "Bronze" },
  silver: { from: "#eef2f0", to: "#8a9a91", label: "Silver" },
  gold: { from: "#fde68a", to: "#d97706", label: "Gold" },
};

export function tierLabel(tier: BadgeTier): string {
  return TIER[tier].label;
}

/** A badge's medal: tier-coloured, with its icon; greyed out with a lock until earned. */
export function BadgeIcon({ badge, earned, size = 44 }: { badge: BadgeDef; earned: boolean; size?: number }) {
  const Icon = earned ? (ICONS[badge.icon] ?? Sparkles) : Lock;
  const tier = TIER[badge.tier];
  return (
    <span
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-[28%] ${earned ? "text-[#1a1208]" : "text-faint"}`}
      style={{
        width: size,
        height: size,
        background: earned ? `linear-gradient(145deg, ${tier.from}, ${tier.to})` : "var(--cd-raised)",
        boxShadow: earned ? `0 6px 18px -6px ${tier.to}` : "inset 0 0 0 1px var(--cd-line-strong)",
      }}
    >
      <Icon size={Math.round(size * 0.46)} strokeWidth={2.2} />
      {earned && <span className="cd-badge-shine absolute inset-0" />}
    </span>
  );
}
