import { describe, expect, it } from "vitest";
import { applyEvent, BADGES, currentDayStreak, dayKey, emptyProgress, levelFor, type Progress, type ProgressEvent } from "./achievements";

const at = (iso: string) => new Date(iso);
const run = (languageId: string, succeeded: boolean, usedInput = false): ProgressEvent => ({ type: "run", languageId, succeeded, usedInput });

function play(events: [ProgressEvent, Date][], start: Progress = emptyProgress()) {
  let progress = start;
  const unlocked: string[] = [];
  for (const [event, now] of events) {
    const outcome = applyEvent(progress, event, now);
    progress = outcome.progress;
    unlocked.push(...outcome.unlocked.map((b) => b.id));
  }
  return { progress, unlocked };
}

describe("progress", () => {
  it("the first clean run earns First Build, XP and a one-day streak", () => {
    const outcome = applyEvent(emptyProgress(), run("c", true), at("2026-09-27T10:00:00"));
    expect(outcome.unlocked.map((b) => b.id)).toEqual(["first-light"]);
    // run + success + new language + first streak day
    expect(outcome.xpGained).toBe(2 + 10 + 15 + 5);
    expect(outcome.progress.dayStreak).toBe(1);
    expect(outcome.progress.lastDay).toBe("2026-09-27");
    expect(outcome.levelUp).toBeNull(); // 32 XP is still Initiate
  });

  it("a failed run breaks the clean streak, and the next success counts as a fixed error", () => {
    const day = at("2026-09-27T10:00:00");
    const { progress, unlocked } = play([
      [run("python", true), day],
      [run("python", false), day],
      [run("python", true), day],
    ]);
    expect(progress.fixedErrors).toBe(1);
    expect(progress.cleanStreak).toBe(1);
    expect(progress.bestCleanStreak).toBe(1);
    expect(unlocked).toContain("bug-squasher");
    expect(progress.failing).toEqual([]);
  });

  it("a fix in one language does not count for another", () => {
    const day = at("2026-09-27T10:00:00");
    const { progress } = play([
      [run("c", false), day],
      [run("java", true), day],
    ]);
    expect(progress.fixedErrors).toBe(0);
    expect(progress.failing).toEqual(["c"]);
  });

  it("day streaks grow on consecutive days, reset after a gap and are reported as broken", () => {
    const { progress } = play([
      [run("c", true), at("2026-09-25T09:00:00")],
      [run("c", true), at("2026-09-26T21:00:00")],
      [run("c", true), at("2026-09-26T22:00:00")], // same day: no change
      [run("c", true), at("2026-09-27T08:00:00")],
    ]);
    expect(progress.dayStreak).toBe(3);
    expect(progress.bestDayStreak).toBe(3);
    expect(progress.badges["three-day-orbit"]).toBeDefined();
    expect(currentDayStreak(progress, at("2026-09-28T12:00:00"))).toBe(3); // yesterday still counts
    expect(currentDayStreak(progress, at("2026-09-29T12:00:00"))).toBe(0);
    const after = applyEvent(progress, run("c", true), at("2026-09-30T12:00:00")).progress;
    expect(after.dayStreak).toBe(1);
    expect(after.bestDayStreak).toBe(3);
  });

  it("uses local calendar days", () => {
    expect(dayKey(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
    const { progress } = play([
      [run("c", true), new Date(2026, 0, 31, 23, 0)],
      [run("c", true), new Date(2026, 1, 1, 0, 30)], // across a month boundary
    ]);
    expect(progress.dayStreak).toBe(2);
    expect(progress.nightRuns).toBe(1);
    expect(progress.badges["night-owl"]).toBeDefined();
  });

  it("languages, input, Saarthi and examples unlock their badges once", () => {
    const day = at("2026-09-27T12:00:00");
    const { progress, unlocked } = play([
      [run("c", true, true), day],
      [run("python", true), day],
      [run("java", true), day],
      [{ type: "explained" }, day],
      [{ type: "verified" }, day],
      ...Array.from({ length: 5 }, () => [{ type: "example" }, day] as [ProgressEvent, Date]),
      [run("go", true), day],
    ]);
    expect(unlocked.sort()).toEqual(
      ["conversation", "curious-mind", "explorer", "first-light", "polyglot", "trusted-fix"].sort(),
    );
    expect(new Set(unlocked).size).toBe(unlocked.length); // never twice
    expect(progress.languages).toEqual(["c", "python", "java", "go"]);
  });

  it("levels have names, bounds and a fraction", () => {
    expect(levelFor(0)).toMatchObject({ index: 0, name: "Initiate", min: 0, next: 60, fraction: 0 });
    expect(levelFor(59).index).toBe(0);
    expect(levelFor(60)).toMatchObject({ index: 1, name: "Syntax Scout" });
    expect(levelFor(110).fraction).toBeCloseTo(0.5);
    expect(levelFor(100_000)).toMatchObject({ name: "KAIRO Legend", next: null, fraction: 1 });
  });

  it("reports a level-up when an event crosses a threshold", () => {
    const start = { ...emptyProgress(), xp: 55 };
    const outcome = applyEvent(start, run("c", true), at("2026-09-27T12:00:00"));
    expect(outcome.levelUp?.name).toBe("Syntax Scout");
  });

  it("every badge has a unique id and a reachable rule", () => {
    expect(new Set(BADGES.map((b) => b.id)).size).toBe(BADGES.length);
    const maxed: Progress = {
      ...emptyProgress(),
      successes: 100,
      fixedErrors: 1,
      explanations: 1,
      inputRuns: 1,
      examples: 5,
      bestCleanStreak: 15,
      languages: ["a", "b", "c", "d", "e", "f", "g", "h"],
      verifiedFixes: 1,
      bestDayStreak: 7,
      nightRuns: 1,
    };
    for (const badge of BADGES) expect(badge.earned(maxed), badge.id).toBe(true);
    for (const badge of BADGES) expect(badge.earned(emptyProgress()), badge.id).toBe(false);
  });
});
