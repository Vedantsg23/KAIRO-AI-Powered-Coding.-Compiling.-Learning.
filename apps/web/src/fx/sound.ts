import { useCallback, useEffect, useState } from "react";
import { load, save } from "../lib/storage";

/**
 * Optional interface sounds, synthesised with Web Audio (no audio files):
 * a soft tick for actions, a rising chime for a clean run or a verified fix,
 * a low blip for an error. Off unless the student switches them on in the
 * profile card; nothing plays before a user gesture.
 */
export type Sound = "tick" | "success" | "error" | "fix";

const KEY = "k.sound";
let context: AudioContext | null = null;

export function soundOn(): boolean {
  return load(KEY, false);
}

const listeners = new Set<(on: boolean) => void>();

export function setSoundOn(on: boolean): void {
  save(KEY, on);
  for (const listener of listeners) listener(on);
  if (on) play("tick");
}

/** The sound setting as React state (the profile card and the command palette share it). */
export function useSound(): [boolean, () => void] {
  const [on, setOn] = useState(soundOn);
  useEffect(() => {
    listeners.add(setOn);
    return () => void listeners.delete(setOn);
  }, []);
  return [on, useCallback(() => setSoundOn(!soundOn()), [])];
}

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  context ??= new Ctor();
  if (context.state === "suspended") void context.resume();
  return context;
}

function tone(ctx: AudioContext, frequency: number, start: number, length: number, type: OscillatorType, peak: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + length + 0.02);
}

export function play(sound: Sound): void {
  if (!soundOn()) return;
  const ctx = audio();
  if (!ctx) return;
  const t = ctx.currentTime + 0.01;
  switch (sound) {
    case "tick":
      tone(ctx, 1320, t, 0.05, "square", 0.025);
      break;
    case "success":
      tone(ctx, 660, t, 0.14, "sine", 0.08);
      tone(ctx, 990, t + 0.09, 0.2, "sine", 0.07);
      tone(ctx, 1320, t + 0.18, 0.28, "sine", 0.05);
      break;
    case "fix":
      tone(ctx, 880, t, 0.08, "triangle", 0.06);
      tone(ctx, 1175, t + 0.07, 0.14, "triangle", 0.05);
      break;
    case "error":
      tone(ctx, 196, t, 0.16, "sawtooth", 0.035);
      tone(ctx, 147, t + 0.1, 0.22, "sawtooth", 0.03);
      break;
  }
}
