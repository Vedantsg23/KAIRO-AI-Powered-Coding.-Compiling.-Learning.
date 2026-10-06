import { Binary, Braces, Code2, Cpu, Radio, Rocket, SquareTerminal, Zap, type LucideIcon } from "lucide-react";
import { memo } from "react";
import { AVATARS, type AvatarId } from "./profile";

const ICONS: Record<AvatarId, LucideIcon> = {
  rocket: Rocket,
  planet: Cpu,
  moon: SquareTerminal,
  star: Braces,
  comet: Zap,
  satellite: Radio,
  sun: Code2,
  telescope: Binary,
};

/**
 * A profile picture: one of eight developer emblems on its own colour tile.
 * With `ring` (0..1) a progress ring shows how far the profile is into its level.
 */
export const Avatar = memo(function Avatar({ id, size = 32, ring }: { id: AvatarId; size?: number; ring?: number }) {
  const avatar = AVATARS.find((a) => a.id === id) ?? AVATARS[0];
  const Icon = ICONS[avatar.id];
  const inner = ring === undefined ? size : size - 6;
  const face = (
    <span
      className="flex shrink-0 items-center justify-center rounded-[28%] text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.3)]"
      style={{ width: inner, height: inner, background: `linear-gradient(135deg, ${avatar.from}, ${avatar.to})` }}
    >
      <Icon size={Math.round(inner * 0.52)} strokeWidth={2.2} />
    </span>
  );
  if (ring === undefined) return face;
  const degrees = Math.round(Math.max(0, Math.min(1, ring)) * 360);
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-[32%]"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(var(--cd-brand) ${degrees}deg, var(--cd-line-strong) ${degrees}deg)`,
      }}
    >
      <span className="flex items-center justify-center rounded-[30%] bg-surface" style={{ width: size - 3, height: size - 3 }}>
        {face}
      </span>
    </span>
  );
});
