/**
 * "Just signed in": set when the student leaves the entry page (as a guest,
 * or on the way to Google/GitHub/Microsoft/phone/email sign-in), and used by
 * the workspace to show Saarthi's big welcome once. Kept in sessionStorage so
 * it survives the sign-in provider's redirect but not a new tab; a mark older
 * than ten minutes is ignored.
 *
 * Reading does not clear the mark (React may run an effect twice while
 * developing); the workspace clears it with doneWelcome() when it greets.
 */
const KEY = "kairo.welcome";
const FRESH_MS = 10 * 60_000;

export function markWelcome(): void {
  try {
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    /* storage blocked: no welcome, nothing else changes */
  }
}

export function welcomeDue(): boolean {
  try {
    const at = Number(sessionStorage.getItem(KEY));
    if (!at) return false;
    if (Date.now() - at > FRESH_MS) {
      sessionStorage.removeItem(KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function doneWelcome(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
