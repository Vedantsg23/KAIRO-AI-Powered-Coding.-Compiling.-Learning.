import { Flame, LogOut, Moon, Sparkles, Sun, Trophy, UserRound, Volume2, VolumeX, Zap } from "lucide-react";
import { useMemo, type ReactNode } from "react";
import { LANGUAGE_BADGE, VERIFIED_LANGUAGES } from "../layout/LanguagePicker";
import type { Theme } from "../lib/hooks";
import { Button, Dialog } from "../ui/primitives";
import { BADGES, currentDayStreak, levelFor, type Progress } from "./achievements";
import { Avatar } from "./Avatar";
import { BadgeIcon, tierLabel } from "./BadgeIcon";
import type { Profile } from "./profile";

const MATRIX = VERIFIED_LANGUAGES;

/** One cell per language; a cell lights up after a successful run in it. */
function LanguageMatrix({ languages }: { languages: string[] }) {
  const lit = MATRIX.filter((id) => languages.includes(id)).length;
  return (
    <div role="img" aria-label={`Languages with a successful run: ${lit} of ${MATRIX.length}`} className="mt-2">
      <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-8">
        {MATRIX.map((id) => {
          const on = languages.includes(id);
          return (
            <span
              key={id}
              className={`flex h-9 flex-col items-center justify-center rounded border font-mono text-[10.5px] font-bold ${
                on ? "border-brand/50 bg-brand/12 text-brand-fg" : "border-dashed border-line-strong text-faint"
              }`}
            >
              {LANGUAGE_BADGE[id]}
              <span className={`mt-0.5 h-1 w-1 rounded-full ${on ? "bg-brand" : "bg-line-strong"}`} aria-hidden />
            </span>
          );
        })}
      </div>
      <p className="mt-1.5 font-mono text-[10px] uppercase tracking-wider text-faint">
        {lit}/{MATRIX.length} toolchains verified by a clean run
      </p>
    </div>
  );
}

function Stat({ icon, value, label }: { icon: ReactNode; value: string | number; label: string }) {
  return (
    <div className="flex flex-col items-start gap-0.5 rounded-md border border-line bg-raised px-2.5 py-2">
      <span className="text-accent-fg">{icon}</span>
      <span className="font-mono text-lg font-bold text-fg">{value}</span>
      <span className="font-mono text-[9.5px] uppercase leading-tight tracking-wider text-muted">{label}</span>
    </div>
  );
}

function Toggle({ on, onClick, label, icon }: { on: boolean; onClick(): void; label: string; icon: ReactNode }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm text-fg hover:bg-fg/5"
    >
      <span className="text-muted">{icon}</span>
      <span className="flex-1">{label}</span>
      <span className={`relative h-5 w-9 rounded-full transition-colors ${on ? "bg-brand" : "bg-line-strong"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
      </span>
    </button>
  );
}

export function ProfileCard({
  open,
  onClose,
  profile,
  progress,
  motion,
  onToggleMotion,
  theme,
  onToggleTheme,
  sound,
  onToggleSound,
  onSignOut,
}: {
  open: boolean;
  onClose(): void;
  profile: Profile;
  progress: Progress;
  motion: boolean;
  onToggleMotion(): void;
  theme: Theme;
  onToggleTheme(): void;
  sound: boolean;
  onToggleSound(): void;
  onSignOut(): void;
}) {
  const level = levelFor(progress.xp);
  const streak = currentDayStreak(progress);
  const earned = useMemo(() => BADGES.filter((b) => progress.badges[b.id]).length, [progress.badges]);

  return (
    <Dialog open={open} onClose={onClose} labelledBy="profile-title" width="max-w-2xl">
      <div className="cd-scroll overflow-y-auto" data-testid="profile-card">
        <div className="relative overflow-hidden border-b border-line bg-raised px-6 pb-5 pt-6">
          <p className="k-label mb-3">Operator profile</p>
          <div className="relative flex items-center gap-4">
            <Avatar id={profile.avatar} size={76} ring={level.fraction} />
            <div className="min-w-0 flex-1">
              <h2 id="profile-title" className="truncate text-xl font-bold text-fg" data-testid="profile-name">
                {profile.name}
              </h2>
              <p className="flex items-center gap-1.5 text-xs text-muted">
                <UserRound size={12} />
                {profile.kind === "guest" ? "Guest (saved in this browser)" : (profile.email ?? "Signed in")}
              </p>
              <p className="mt-2 flex items-baseline gap-2">
                <span className="text-base font-semibold text-brand-fg" data-testid="profile-level">
                  {level.name}
                </span>
                <span className="font-mono text-[11px] text-faint">level {level.index + 1}</span>
              </p>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line-strong/60">
                <div
                  className="h-full rounded-full bg-brand transition-[width] duration-700"
                  style={{ width: `${Math.max(3, level.fraction * 100)}%` }}
                />
              </div>
              <p className="mt-1 font-mono text-[10.5px] text-faint" data-testid="profile-xp">
                {progress.xp} XP{level.next !== null ? ` · ${level.next - progress.xp} to the next level` : " · top level"}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 px-6 pt-5 sm:grid-cols-4">
          <Stat icon={<Sparkles size={16} />} value={progress.successes} label="clean runs" />
          <Stat icon={<Flame size={16} className={streak ? "cd-flame" : ""} />} value={streak} label={`day streak (best ${progress.bestDayStreak})`} />
          <Stat icon={<Zap size={16} />} value={progress.bestCleanStreak} label="best clean streak" />
          <Stat icon={<Trophy size={16} />} value={`${earned}/${BADGES.length}`} label="badges" />
        </div>

        <section className="px-6 pt-5">
          <h3 className="k-label">Language matrix</h3>
          <p className="text-xs text-muted">Each language you have run successfully lights up.</p>
          <LanguageMatrix languages={progress.languages} />
        </section>

        <section className="px-6 pt-5">
          <h3 className="k-label">Badges</h3>
          <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2" data-testid="badge-list">
            {BADGES.map((badge) => {
              const when = progress.badges[badge.id];
              return (
                <li
                  key={badge.id}
                  data-testid={`badge-${badge.id}`}
                  data-earned={when ? "true" : "false"}
                  className={`flex items-center gap-3 rounded-md border p-2 ${when ? "border-accent/40 bg-accent/[0.06]" : "border-line opacity-80"}`}
                  title={when ? `Earned ${new Date(when).toLocaleDateString()}` : "Not earned yet"}
                >
                  <BadgeIcon badge={badge} earned={!!when} size={40} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-fg">
                      {badge.title}{" "}
                      <span className="font-mono text-[9.5px] font-semibold uppercase tracking-wide text-faint">{tierLabel(badge.tier)}</span>
                    </p>
                    <p className="text-[11.5px] leading-snug text-muted">{badge.description}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="px-6 pb-6 pt-5">
          <h3 className="k-label mb-1">Settings</h3>
          <Toggle on={motion} onClick={onToggleMotion} label="Animations" icon={<Sparkles size={16} />} />
          <Toggle on={theme === "dark"} onClick={onToggleTheme} label="Dark theme" icon={theme === "dark" ? <Moon size={16} /> : <Sun size={16} />} />
          <Toggle on={sound} onClick={onToggleSound} label="Interface sounds" icon={sound ? <Volume2 size={16} /> : <VolumeX size={16} />} />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11.5px] text-faint">
              {profile.kind === "guest" ? "As a guest, your badges and streaks are saved in this browser only." : "Signed in with your account."}
            </p>
            <Button onClick={onSignOut} data-testid="sign-out">
              <LogOut size={15} /> {profile.kind === "guest" ? "Switch profile" : "Sign out"}
            </Button>
          </div>
        </section>
      </div>
    </Dialog>
  );
}
