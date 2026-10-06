import { load, save } from "../lib/storage";

export type AvatarId = "rocket" | "planet" | "moon" | "star" | "comet" | "satellite" | "sun" | "telescope";
export type Experience = "new" | "some" | "confident";

/** Who is coding. Guests live in this browser; accounts come from Supabase when it is configured. */
export interface Profile {
  id: string;
  name: string;
  avatar: AvatarId;
  experience: Experience;
  kind: "guest" | "account";
  email?: string;
  createdAt: string;
}

/**
 * Profile emblems: developer glyphs on a colour tile. The ids are the ones
 * stored in existing profiles (they predate the KAIRO design), so they stay.
 */
export const AVATARS: { id: AvatarId; label: string; from: string; to: string }[] = [
  { id: "rocket", label: "Deploy", from: "#34d399", to: "#047857" },
  { id: "planet", label: "Processor", from: "#38bdf8", to: "#1d4ed8" },
  { id: "moon", label: "Terminal", from: "#4b5563", to: "#111827" },
  { id: "star", label: "Braces", from: "#fbbf24", to: "#c2410c" },
  { id: "comet", label: "Bolt", from: "#4ade80", to: "#15803d" },
  { id: "satellite", label: "Signal", from: "#22d3ee", to: "#0e7490" },
  { id: "sun", label: "Code", from: "#a78bfa", to: "#6d28d9" },
  { id: "telescope", label: "Binary", from: "#f472b6", to: "#be185d" },
];

export const EXPERIENCE: { id: Experience; label: string; hint: string }[] = [
  { id: "new", label: "New to coding", hint: "Saarthi explains every step" },
  { id: "some", label: "Some experience", hint: "I know the basics" },
  { id: "confident", label: "Confident", hint: "Just let me code" },
];

const PROFILE_KEY = "cd.profile";
const GUESTS_KEY = "cd.guests";

function isProfile(value: unknown): value is Profile {
  if (!value || typeof value !== "object") return false;
  const p = value as Partial<Profile>;
  return (
    typeof p.id === "string" &&
    typeof p.name === "string" &&
    p.name.length > 0 &&
    AVATARS.some((a) => a.id === p.avatar) &&
    EXPERIENCE.some((e) => e.id === p.experience) &&
    (p.kind === "guest" || p.kind === "account")
  );
}

export function loadProfile(): Profile | null {
  const stored = load<unknown>(PROFILE_KEY, null);
  return isProfile(stored) ? stored : null;
}

export function saveProfile(profile: Profile | null): void {
  if (profile) {
    save(PROFILE_KEY, profile);
    if (profile.kind === "guest") rememberGuest(profile);
  } else {
    try {
      localStorage.removeItem(PROFILE_KEY);
    } catch {
      // storage unavailable
    }
  }
}

/** Guests who used this browser before, newest first, so they can pick up where they left off. */
export function recentGuests(): Profile[] {
  const stored = load<unknown>(GUESTS_KEY, []);
  return Array.isArray(stored) ? stored.filter(isProfile).slice(0, 4) : [];
}

function rememberGuest(profile: Profile): void {
  const others = recentGuests().filter((g) => g.id !== profile.id);
  save(GUESTS_KEY, [profile, ...others].slice(0, 4));
}

/** A display name: trimmed, single spaces, at most 24 characters. */
export function cleanName(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, 24).trim();
}

export function newGuest(name: string, avatar: AvatarId, experience: Experience): Profile {
  const random = Math.random().toString(36).slice(2, 10);
  return {
    id: `guest-${Date.now().toString(36)}-${random}`,
    name: cleanName(name),
    avatar,
    experience,
    kind: "guest",
    createdAt: new Date().toISOString(),
  };
}

export function initials(name: string): string {
  const parts = name.split(" ").filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : name.slice(0, 2)).toUpperCase();
}
