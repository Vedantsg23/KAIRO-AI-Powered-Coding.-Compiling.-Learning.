import { CheckCircle2, Wrench } from "lucide-react";
import { useCallback, useRef } from "react";
import { Tilt, useParallax } from "../fx/pointer";
import { SaarthiMascot, type MascotMood } from "../mascot/SaarthiMascot";

/**
 * The entry page's centrepiece: Saarthi floating over its holo-platform
 * inside a HUD frame, with three cards showing what KAIRO does (a live
 * diagnostic, Saarthi's quick fix, a verified run). The layers drift with
 * the pointer at different depths and the cards tilt towards it.
 * Decorative: the same facts are in the page text.
 */
export function HeroStage({ mood, size = 250, onSaarthi }: { mood: MascotMood; size?: number; onSaarthi?(el: Element): void }) {
  const host = useRef<HTMLDivElement>(null);
  useParallax(useCallback(() => host.current, []));
  return (
    <div ref={host} className="relative mx-auto aspect-[16/11] w-full max-w-[720px] sm:aspect-[16/10]" data-testid="hero-stage" aria-hidden>
      {/* HUD rings and crosshair (the deepest layer) */}
      <div className="absolute inset-0" data-depth="-8">
        <div className="absolute left-1/2 top-[46%] aspect-square w-[44%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-line-strong/70" />
        <div className="absolute left-1/2 top-[46%] aspect-square w-[58%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-line-strong/60" />
        <div className="absolute left-1/2 top-[46%] h-px w-[92%] -translate-x-1/2 bg-gradient-to-r from-transparent via-line-strong to-transparent" />
        <div className="absolute left-1/2 top-[6%] h-[80%] w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-line-strong to-transparent" />
        <span className="k-label absolute left-[6%] top-[4%] !text-[9.5px]">Saarthi · AI guide</span>
        <span className="k-label absolute right-[6%] top-[4%] flex items-center gap-1.5 !text-[9.5px] !text-brand-fg">
          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-brand" /> Online
        </span>
      </div>

      {/* Clicking Saarthi makes it jump out and say hello (the nav's "Saarthi AI" does the same from the keyboard). */}
      <div className="absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2">
        <div data-depth="10" className={onSaarthi ? "cursor-pointer" : ""} onClick={(e) => onSaarthi?.(e.currentTarget)} data-testid="hero-saarthi">
          <SaarthiMascot size={size} mood={mood} label="Saarthi, your AI guide" />
        </div>
      </div>

      {/* A live diagnostic */}
      <div className="absolute left-0 top-[12%] w-[31%] min-w-[168px] max-sm:top-[2%]" data-depth="22">
        <Tilt className="rounded-md">
          <div className="k-drift rounded-md border border-line bg-surface/95 shadow-[var(--cd-shadow)]">
            <div className="flex items-center justify-between border-b border-line px-2.5 py-1.5">
              <span className="font-mono text-[10px] font-semibold text-muted">main.cpp</span>
              <span className="rounded border border-danger/35 bg-danger/10 px-1 font-mono text-[8.5px] font-bold text-danger-fg">E · SYNTAX</span>
            </div>
            <pre className="px-2.5 py-2 font-mono text-[11px] leading-[1.55] text-fg">
              <span className="text-faint">13 </span>
              <span className="font-bold text-brand-fg">int</span> total = <span className="text-info-fg">0</span>
              {"\n"}
              <span className="text-faint">14 </span>
              <span className="underline decoration-danger decoration-wavy underline-offset-2">cout</span> {"<<"} total;
            </pre>
            <p className="border-t border-line px-2.5 py-1 font-mono text-[9.5px] text-danger-fg">Missing ';' at 13:14</p>
          </div>
        </Tilt>
      </div>

      {/* Saarthi's quick fix */}
      <div className="absolute right-0 top-[34%] w-[29%] min-w-[160px] max-sm:top-[56%]" data-depth="-16">
        <Tilt className="rounded-md">
          <div className="k-drift-slow rounded-md border border-line bg-surface/95 p-2.5 shadow-[var(--cd-shadow)]">
            <p className="k-label !text-[9px] !text-ai-fg">Saarthi · quick fix</p>
            <p className="mt-1 text-[11.5px] leading-snug text-fg">Statements end with ';'. Add it to line 13.</p>
            <span className="mt-2 inline-flex items-center gap-1 rounded bg-brand px-2 py-1 font-mono text-[10px] font-bold text-on-brand">
              <Wrench size={10} /> [ ADD ; ]
            </span>
          </div>
        </Tilt>
      </div>

      {/* A verified run */}
      <div className="absolute bottom-[4%] left-[3%] w-[32%] min-w-[172px] max-sm:hidden" data-depth="16">
        <Tilt className="rounded-md">
          <div className="k-drift rounded-md border border-line bg-surface/95 px-2.5 py-2 font-mono text-[10.5px] shadow-[var(--cd-shadow)]">
            <p className="text-faint">
              <span className="text-brand-fg">$</span> ./main
            </p>
            <p className="text-fg">Total: 400</p>
            <p className="mt-1 flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-wider text-brand-fg">
              <CheckCircle2 size={11} /> Exit 0 · verified by a real run
            </p>
          </div>
        </Tilt>
      </div>
    </div>
  );
}
