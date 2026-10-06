import { useEffect, useState } from "react";
import { KairoMark } from "../layout/Logo";

/**
 * The transition into the workspace: two panels sweep across the screen,
 * the KAIRO mark pulses in the middle, and the panels part to reveal the
 * console. It never takes a click (pointer-events: none) and is skipped
 * with motion off.
 */
export function Curtain({ onDone }: { onDone(): void }) {
  const [phase, setPhase] = useState<"in" | "out">("in");
  useEffect(() => {
    const out = window.setTimeout(() => setPhase("out"), 520);
    const done = window.setTimeout(onDone, 1250);
    return () => {
      window.clearTimeout(out);
      window.clearTimeout(done);
    };
  }, [onDone]);
  return (
    <div className="k-curtain" data-phase={phase} aria-hidden data-testid="curtain">
      <div className="k-curtain-panel k-curtain-a" />
      <div className="k-curtain-panel k-curtain-b" />
      <div className="k-curtain-mark">
        <KairoMark size={64} animated />
        <span className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-on-brand">Launching workspace</span>
      </div>
    </div>
  );
}
