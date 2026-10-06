import { modKey } from "../lib/hooks";
import { Kbd } from "../ui/primitives";
import type { TourStep } from "./Tour";

export const TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="language"]',
    title: "Choose a language runtime",
    body: "Pick from the languages installed on this server (each shows READY with its toolchain). Each keeps its own draft, so switching never loses your code.",
    placement: "bottom",
  },
  {
    target: '[data-tour="editor"]',
    title: "Write your program",
    body: "A full code editor with syntax colours, folding, bracket matching, autocomplete and a minimap. The live analyzer underlines syntax slips as you type and names the concept at your cursor. Ctrl+S saves the draft in this browser. Saarthi floats in the corner: click it any time.",
    placement: "inside",
  },
  {
    target: '[data-tour="run"]',
    title: "Run it safely",
    body: (
      <>
        Your code is compiled and run in a fresh, isolated sandbox with no network and strict limits. Shortcut: <Kbd>{modKey}</Kbd> +{" "}
        <Kbd>Enter</Kbd>.
      </>
    ),
    placement: "bottom",
  },
  {
    target: '[data-tour="problems"]',
    title: "Read the diagnostics",
    body: 'Errors, warnings and crashes from the last run, pinned to exact lines and numbered. Click a location to jump there; "What does this mean?" gives a plain-language note. The build pipeline above the terminal shows each step as it runs.',
    placement: "left",
  },
  {
    target: '[data-tour="saarthi"]',
    title: "Ask Saarthi",
    body: "Saarthi's panel shows the error, why it happens, the concept behind it and a quick fix. Saarthi, the AI guide, can also explain your exact case from the run's evidence and suggest a patch. You approve it, and a real run verifies it.",
    placement: "left",
  },
  {
    target: '[data-tour="input-tab"]',
    title: "Give your program input",
    body: "If your program reads input (scanf, input(), Scanner, readLine...), type it here before pressing Run.",
    placement: "top",
  },
  {
    target: '[data-tour="palette"]',
    title: "Everything in one place",
    body: (
      <>
        Press <Kbd>{modKey}</Kbd> + <Kbd>K</Kbd> anywhere, even in the editor, for the command palette: run, switch language, load an example,
        ask Saarthi, fold code, change the theme. Type a few letters of what you want; <Kbd>:42</Kbd> jumps to line 42.
      </>
    ),
    placement: "bottom",
  },
  {
    target: '[data-tour="examples"]',
    title: "Learn from examples",
    body: "Load programs that run, fail to compile, crash or hit a limit, for every language, and see how each one is explained. Every clean run earns XP and lights up your language matrix.",
    placement: "bottom",
  },
];
