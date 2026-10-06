import { KeyRound, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/primitives";
import { updatePassword } from "./supabase";

/** Shown when the student comes back from a password-reset email: choose the new password. */
export function NewPasswordDialog({ onDone }: { onDone(): void }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    if (password.length < 8) return setError("Use at least 8 characters.");
    if (password !== confirm) return setError("The two passwords are different.");
    setBusy(true);
    setError(null);
    try {
      await updatePassword(password);
      setSaved(true);
      window.setTimeout(onDone, 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const input =
    "h-10 w-full rounded-md border border-line-strong bg-surface px-3 text-sm text-fg outline-none focus:border-brand";
  return (
    <div className="fixed inset-0 z-[65] grid place-items-center bg-[var(--cd-scrim)] p-4" role="dialog" aria-modal="true" aria-labelledby="new-password-title">
      <div className="w-full max-w-sm rounded-lg border border-line-strong bg-surface p-5 shadow-[var(--cd-shadow)]">
        <h2 id="new-password-title" className="flex items-center gap-2 text-lg font-semibold text-fg">
          <KeyRound size={17} className="text-brand-fg" /> Choose a new password
        </h2>
        <p className="mt-1 text-sm text-muted">You opened the reset link from your email. Pick a new password for your KAIRO account.</p>
        <div className="mt-4 flex flex-col gap-2">
          <input type="password" autoComplete="new-password" placeholder="New password (8+ characters)" aria-label="New password" value={password} onChange={(e) => setPassword(e.target.value)} className={input} />
          <input type="password" autoComplete="new-password" placeholder="Again" aria-label="Repeat the new password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={input} />
        </div>
        {error && (
          <p role="alert" className="mt-2 text-xs text-danger-fg">
            {error}
          </p>
        )}
        {saved && (
          <p role="status" className="mt-2 text-xs text-brand-fg">
            Saved. You are signed in with your new password.
          </p>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={onDone}>Later</Button>
          <Button variant="primary" onClick={() => void save()} disabled={busy || saved}>
            {busy ? <Loader2 size={15} className="animate-spin" /> : null} Save password
          </Button>
        </div>
      </div>
    </div>
  );
}
