import { useCallback, useEffect, useState } from "react";
import { loadProfile, saveProfile, type Profile } from "../profile/profile";
import { authConfigured, profileFromSession, signOut as supabaseSignOut, watchSession } from "./supabase";

export interface AuthState {
  /** False only while an account session is being restored. */
  ready: boolean;
  profile: Profile | null;
  /** The student arrived from a password-reset email and should choose a new password. */
  recovery: boolean;
  endRecovery(): void;
  enterAsGuest(profile: Profile): void;
  signOut(): Promise<void>;
}

/** The current coder: a signed-in account (when Supabase is configured) or a guest profile. */
export function useAuth(): AuthState {
  const [guest, setGuest] = useState<Profile | null>(() => loadProfile());
  const [account, setAccount] = useState<Profile | null>(null);
  const [ready, setReady] = useState(!authConfigured);
  const [recovery, setRecovery] = useState(false);

  useEffect(
    () =>
      watchSession((session, recovering) => {
        setAccount(session ? profileFromSession(session) : null);
        if (recovering) setRecovery(true);
        setReady(true);
      }),
    [],
  );

  const enterAsGuest = useCallback((profile: Profile) => {
    saveProfile(profile);
    setGuest(profile);
  }, []);

  const signOut = useCallback(async () => {
    saveProfile(null);
    setGuest(null);
    if (account) await supabaseSignOut();
    setAccount(null);
  }, [account]);

  const endRecovery = useCallback(() => setRecovery(false), []);

  return { ready, profile: account ?? guest, recovery, endRecovery, enterAsGuest, signOut };
}
