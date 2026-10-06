import { BookOpenCheck, Crosshair, Map as MapIcon, ShieldCheck, Trophy } from "lucide-react";
import { SaarthiMark } from "../layout/Logo";
import { SaarthiMascot } from "../mascot/SaarthiMascot";
import { Button, Dialog } from "../ui/primitives";

const FEATURES = [
  {
    icon: <ShieldCheck size={18} />,
    title: "Real compilers, safe sandbox",
    body: "32 languages, from C, Java and Python to Assembly, Verilog, Lex and Prolog, run with their real toolchains in a fresh container: no network, strict time and memory limits. HTML, CSS and React get a live preview.",
  },
  {
    icon: <Crosshair size={18} />,
    title: "Diagnostics pinned to the line",
    body: "Compile errors, warnings and crashes are underlined in the editor, each with a plain-language note. The live analyzer flags syntax slips while you type, names the concept you are on, and offers quick fixes.",
  },
  {
    icon: <SaarthiMark size={20} />,
    title: "Saarthi, your AI guide",
    body: "Explains an error using your run's real evidence, suggests a small fix you approve, then re-runs the code to check that it worked.",
  },
  {
    icon: <Trophy size={18} />,
    title: "Progress you can see",
    body: "Every language you run lights up your language matrix. Earn badges, level up and keep your daily streak alive.",
  },
];

export function WelcomeDialog({
  open,
  name,
  onClose,
  onTour,
  onExamples,
}: {
  open: boolean;
  name: string;
  onClose(): void;
  onTour(): void;
  onExamples(): void;
}) {
  return (
    <Dialog open={open} onClose={onClose} labelledBy="welcome-title" width="max-w-xl">
      <div className="cd-scroll overflow-y-auto">
        <div className="relative overflow-hidden border-b border-line bg-raised px-7 pb-6 pt-7">
          <div className="relative flex items-start gap-4">
            <SaarthiMascot size={96} mood="wave" label="Saarthi waving" />
            <div className="min-w-0 pt-1">
              <p className="k-label flex items-center gap-2 !text-brand-fg">
                <span className="h-px w-5 bg-brand" /> System ready · 32 languages
              </p>
              <p className="mt-2 text-sm font-semibold text-brand-fg" data-testid="welcome-greeting">
                Namaste, {name}!
              </p>
              <h2 id="welcome-title" className="text-2xl font-semibold tracking-tight text-fg sm:text-[28px]">
                Welcome to KAIRO
              </h2>
            </div>
          </div>
          <p className="relative mt-3 text-sm text-muted">
            I'm Saarthi, your AI guide. Write code, press Run, and watch it go through the build pipeline. I'll help you see exactly why
            it works, or why it doesn't.
          </p>
        </div>
        <div className="px-7 py-5">
          <ul className="flex flex-col gap-4">
            {FEATURES.map(({ icon, title, body }, i) => (
              <li key={title} className="flex animate-slide-up gap-3" style={{ animationDelay: `${120 + i * 90}ms` }}>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-line bg-surface text-brand-fg">
                  {icon}
                </span>
                <div>
                  <p className="text-sm font-semibold text-fg">{title}</p>
                  <p className="text-xs leading-relaxed text-muted">{body}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={onClose} data-testid="welcome-start">
              Start coding
            </Button>
            <Button onClick={onExamples}>
              <BookOpenCheck size={15} /> Browse examples
            </Button>
            <Button variant="primary" onClick={onTour} data-testid="welcome-tour" data-autofocus>
              <MapIcon size={15} /> Take the 1-minute tour
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
