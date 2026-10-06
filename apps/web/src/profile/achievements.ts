import { load, save } from "../lib/storage";

/**
 * Learning progress: XP, levels, badges and streaks. Pure functions over a
 * plain object, stored per profile in this browser (later: per account).
 * Only things the platform itself observed count: a run's real result,
 * an explanation received, a fix verified by a real run.
 */
export interface Progress {
  version: 1;
  xp: number;
  runs: number;
  successes: number;
  /** Languages with at least one successful run. */
  languages: string[];
  /** Languages whose latest run failed: a success there next counts as a fixed error. */
  failing: string[];
  cleanStreak: number;
  bestCleanStreak: number;
  dayStreak: number;
  bestDayStreak: number;
  /** Local date (YYYY-MM-DD) of the latest successful run. */
  lastDay: string | null;
  fixedErrors: number;
  explanations: number;
  verifiedFixes: number;
  examples: number;
  inputRuns: number;
  nightRuns: number;
  /** Badge id -> when it was earned (ISO). */
  badges: Record<string, string>;
}

export type ProgressEvent =
  | { type: "run"; languageId: string; succeeded: boolean; usedInput: boolean }
  | { type: "explained" }
  | { type: "verified" }
  | { type: "example" };

export type BadgeTier = "bronze" | "silver" | "gold";

export interface BadgeDef {
  id: string;
  title: string;
  description: string;
  /** Key of the icon the UI draws for it. */
  icon: string;
  tier: BadgeTier;
  earned(p: Progress): boolean;
}

export const BADGES: BadgeDef[] = [
  { id: "first-light", title: "First Build", description: "Your first program compiled and ran without errors.", icon: "hammer", tier: "bronze", earned: (p) => p.successes >= 1 },
  { id: "bug-squasher", title: "Bug Squasher", description: "Fixed an error and ran the code cleanly.", icon: "bug", tier: "bronze", earned: (p) => p.fixedErrors >= 1 },
  { id: "curious-mind", title: "Curious Mind", description: "Asked Saarthi to explain a problem.", icon: "lightbulb", tier: "bronze", earned: (p) => p.explanations >= 1 },
  { id: "conversation", title: "Input Handler", description: "Ran a program that reads your input.", icon: "keyboard", tier: "bronze", earned: (p) => p.inputRuns >= 1 },
  { id: "explorer", title: "Explorer", description: "Loaded 5 example programs.", icon: "compass", tier: "bronze", earned: (p) => p.examples >= 5 },
  { id: "on-a-roll", title: "On a Roll", description: "5 clean runs in a row.", icon: "flame", tier: "silver", earned: (p) => p.bestCleanStreak >= 5 },
  { id: "polyglot", title: "Polyglot", description: "Programs in 3 languages ran successfully.", icon: "languages", tier: "silver", earned: (p) => p.languages.length >= 3 },
  { id: "trusted-fix", title: "Verified Fix", description: "A Saarthi fix passed a real run.", icon: "badge-check", tier: "silver", earned: (p) => p.verifiedFixes >= 1 },
  { id: "three-day-orbit", title: "Three-Day Uptime", description: "Coded 3 days in a row.", icon: "calendar", tier: "silver", earned: (p) => p.bestDayStreak >= 3 },
  { id: "night-owl", title: "Night Owl", description: "A clean run between midnight and 5 am.", icon: "moon", tier: "silver", earned: (p) => p.nightRuns >= 1 },
  { id: "unstoppable", title: "Unstoppable", description: "15 clean runs in a row.", icon: "zap", tier: "gold", earned: (p) => p.bestCleanStreak >= 15 },
  { id: "constellation", title: "Toolchain Master", description: "Programs in 8 languages ran successfully.", icon: "layers", tier: "gold", earned: (p) => p.languages.length >= 8 },
  { id: "week-of-code", title: "Week of Code", description: "Coded 7 days in a row.", icon: "calendar-check", tier: "gold", earned: (p) => p.bestDayStreak >= 7 },
  { id: "century", title: "Century", description: "100 successful runs.", icon: "trophy", tier: "gold", earned: (p) => p.successes >= 100 },
];

export interface Level {
  index: number;
  name: string;
  min: number;
  /** XP where the next level starts (null at the top). */
  next: number | null;
  /** 0..1 progress towards the next level. */
  fraction: number;
}

const LEVELS: [string, number][] = [
  ["Initiate", 0],
  ["Syntax Scout", 60],
  ["Bug Hunter", 160],
  ["Builder", 320],
  ["Debugger", 550],
  ["Optimizer", 850],
  ["Architect", 1250],
  ["Compiler Whisperer", 1800],
  ["Systems Master", 2500],
  ["KAIRO Legend", 3400],
];

export function levelFor(xp: number): Level {
  let index = 0;
  while (index + 1 < LEVELS.length && xp >= LEVELS[index + 1][1]) index++;
  const [name, min] = LEVELS[index];
  const next = index + 1 < LEVELS.length ? LEVELS[index + 1][1] : null;
  return { index, name, min, next, fraction: next === null ? 1 : (xp - min) / (next - min) };
}

export const XP = {
  run: 2,
  success: 10,
  newLanguage: 15,
  fixedError: 10,
  dayStreakPerDay: 5,
  explained: 5,
  verified: 20,
  example: 3,
} as const;

export function emptyProgress(): Progress {
  return {
    version: 1,
    xp: 0,
    runs: 0,
    successes: 0,
    languages: [],
    failing: [],
    cleanStreak: 0,
    bestCleanStreak: 0,
    dayStreak: 0,
    bestDayStreak: 0,
    lastDay: null,
    fixedErrors: 0,
    explanations: 0,
    verifiedFixes: 0,
    examples: 0,
    inputRuns: 0,
    nightRuns: 0,
    badges: {},
  };
}

/** Local calendar day, YYYY-MM-DD. */
export function dayKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function previousDay(date: Date): string {
  return dayKey(new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1));
}

/** The streak as it stands today: it is broken once a whole day passes without a clean run. */
export function currentDayStreak(p: Progress, now: Date = new Date()): number {
  return p.lastDay === dayKey(now) || p.lastDay === previousDay(now) ? p.dayStreak : 0;
}

export interface Outcome {
  progress: Progress;
  xpGained: number;
  unlocked: BadgeDef[];
  /** Set when this event moved the profile to a new level. */
  levelUp: Level | null;
}

export function applyEvent(before: Progress, event: ProgressEvent, now: Date = new Date()): Outcome {
  const p: Progress = { ...before, languages: [...before.languages], failing: [...before.failing], badges: { ...before.badges } };
  let xp = 0;
  switch (event.type) {
    case "run": {
      p.runs += 1;
      xp += XP.run;
      if (event.succeeded) {
        p.successes += 1;
        xp += XP.success;
        if (!p.languages.includes(event.languageId)) {
          p.languages.push(event.languageId);
          xp += XP.newLanguage;
        }
        if (p.failing.includes(event.languageId)) {
          p.fixedErrors += 1;
          xp += XP.fixedError;
          p.failing = p.failing.filter((id) => id !== event.languageId);
        }
        p.cleanStreak += 1;
        p.bestCleanStreak = Math.max(p.bestCleanStreak, p.cleanStreak);
        if (event.usedInput) p.inputRuns += 1;
        if (now.getHours() < 5) p.nightRuns += 1;
        const today = dayKey(now);
        if (p.lastDay !== today) {
          p.dayStreak = p.lastDay === previousDay(now) ? p.dayStreak + 1 : 1;
          p.bestDayStreak = Math.max(p.bestDayStreak, p.dayStreak);
          p.lastDay = today;
          xp += XP.dayStreakPerDay * Math.min(p.dayStreak, 7);
        }
      } else {
        p.cleanStreak = 0;
        if (!p.failing.includes(event.languageId)) p.failing.push(event.languageId);
      }
      break;
    }
    case "explained":
      p.explanations += 1;
      xp += XP.explained;
      break;
    case "verified":
      p.verifiedFixes += 1;
      xp += XP.verified;
      break;
    case "example":
      p.examples += 1;
      xp += XP.example;
      break;
  }
  p.xp = before.xp + xp;
  const unlocked = BADGES.filter((b) => !p.badges[b.id] && b.earned(p));
  for (const badge of unlocked) p.badges[badge.id] = now.toISOString();
  const levelBefore = levelFor(before.xp);
  const levelAfter = levelFor(p.xp);
  return { progress: p, xpGained: xp, unlocked, levelUp: levelAfter.index > levelBefore.index ? levelAfter : null };
}

const key = (profileId: string) => `cd.progress.${profileId}`;

export function loadProgress(profileId: string): Progress {
  const stored = load<Partial<Progress> | null>(key(profileId), null);
  if (!stored || stored.version !== 1) return emptyProgress();
  return { ...emptyProgress(), ...stored };
}

export function saveProgress(profileId: string, progress: Progress): void {
  save(key(profileId), progress);
}
