import { X } from "lucide-react";
import type { BadgeDef } from "./achievements";
import { BadgeIcon, tierLabel } from "./BadgeIcon";

/**
 * The "badge unlocked" card that drops in at the top of the screen. It stays
 * below the top bar (z-30) and dialogs (z-50): a menu or dialog the student
 * opens must never be covered, or clicked through, by a notification.
 */
export function BadgeToast({ badge, onClose, onOpenProfile }: { badge: BadgeDef; onClose(): void; onOpenProfile(): void }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-16 z-20 flex justify-center px-4">
      <div
        role="status"
        data-testid="badge-toast"
        className="cd-badge-card cd-glass k-hud pointer-events-auto relative flex w-full max-w-sm items-center gap-3 rounded-lg border border-accent/50 p-3 pr-9"
      >
        <BadgeIcon badge={badge} earned size={52} />
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-accent-fg">
            Badge unlocked · {tierLabel(badge.tier)}
          </p>
          <p className="text-base font-semibold text-fg">{badge.title}</p>
          <p className="text-xs text-muted">{badge.description}</p>
          <button type="button" className="mt-1 text-xs font-semibold text-brand-fg hover:underline" onClick={onOpenProfile}>
            See all badges
          </button>
        </div>
        <button type="button" aria-label="Dismiss" onClick={onClose} className="absolute right-2 top-2 rounded p-1 text-faint hover:text-fg">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
