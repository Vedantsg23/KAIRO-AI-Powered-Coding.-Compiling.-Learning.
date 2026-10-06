import {
  AlignLeft,
  BookOpen,
  FoldVertical,
  Gauge,
  Hash,
  Keyboard,
  LogOut,
  MessageSquareText,
  Moon,
  NotebookPen,
  PanelLeft,
  PanelRight,
  PartyPopper,
  Play,
  Replace,
  Save,
  Scissors,
  ScrollText,
  Search,
  Sparkles,
  Sun,
  Terminal,
  Trophy,
  UnfoldVertical,
  Upload,
  Volume2,
  VolumeX,
  Wrench,
  Zap,
} from "lucide-react";
import type { Language } from "../api/types";
import type { OutputTab } from "../execution/OutputPanel";
import { LANGUAGE_BADGE, toolchainLabel } from "../layout/LanguagePicker";
import { modKey, type Theme } from "../lib/hooks";
import { outcomeLabel, type Example } from "../onboarding/examples";
import type { Command } from "./CommandPalette";

/** Everything the palette can do, handed over by the workspace when the palette opens. */
export interface CommandContext {
  canRun: boolean;
  busy: boolean;
  run(): void;
  save(): void;
  /** Format document, with the name of the formatter that will run. */
  format?: { label: string; run(): void };
  /** Explain the selected problem (only when Saarthi is set up and a current run exists). */
  explain: (() => void) | null;
  /** The live analyzer's quick fix for the problem at the cursor, if it has one. */
  quickFix: { label: string; line: number; apply(): void } | null;
  openSaarthi(): void;
  askSaarthi(): void;
  trick(): void;
  editorAction(actionId: string): void;
  languages: Language[];
  activeId: string;
  switchLanguage(id: string): void;
  examples: Example[];
  compileLabel: string;
  loadExample(example: Example, runNow: boolean): void;
  openExamples(): void;
  theme: Theme;
  toggleTheme(): void;
  explorer?: { open: boolean; toggle(): void };
  dock?: { open: boolean; toggle(): void };
  /** The Jupyter-style Python notebook. */
  notebook?: { open: boolean; toggle(): void };
  showTab(tab: OutputTab): void;
  /** Small screens: show the diagnostics tab. */
  showDiagnostics?: () => void;
  motion: boolean;
  toggleMotion(): void;
  sound: boolean;
  toggleSound(): void;
  tour(): void;
  shortcuts(): void;
  profile(): void;
  signOut: { label: string; run(): void };
}

const mono = (text: string) => <span className="font-mono text-[9.5px] font-bold">{text}</span>;

/** The palette's command list, grouped in the order the groups are shown. */
export function buildCommands(c: CommandContext): Command[] {
  const commands: Command[] = [];
  const add = (command: Command) => commands.push(command);

  // ------------------------------------------------------------------ Run
  add({ id: "run", group: "Run", title: "Run the program", hint: `${modKey} ↵`, icon: <Play size={15} />, keywords: "compile execute build", disabled: !c.canRun || c.busy, run: c.run });
  if (c.quickFix) {
    const fix = c.quickFix;
    add({ id: "quick-fix", group: "Run", title: `Quick fix: ${fix.label}`, hint: `line ${fix.line}`, icon: <Wrench size={15} />, keywords: "repair live analyzer", run: fix.apply });
  }
  add({ id: "save", group: "Run", title: "Save the draft now", hint: `${modKey} S`, icon: <Save size={15} />, run: c.save });
  if (c.format) add({ id: "format", group: "Editor", title: `Format document (${c.format.label})`, hint: "⇧ Alt F", icon: <AlignLeft size={15} />, keywords: "prettier clang-format black gofmt shfmt beautify indent", run: c.format.run });
  if (c.explain) add({ id: "explain", group: "Run", title: "Explain the selected problem", hint: `${modKey} ⇧ ↵`, icon: <Sparkles size={15} />, keywords: "saarthi why error", run: c.explain });

  // -------------------------------------------------------------- Saarthi
  add({ id: "saarthi-open", group: "Saarthi", title: "Open Saarthi's panel", icon: <Sparkles size={15} />, keywords: "ai guide assistant", run: c.openSaarthi });
  add({ id: "saarthi-ask", group: "Saarthi", title: "Ask Saarthi a question", icon: <MessageSquareText size={15} />, keywords: "ai chat help", run: c.askSaarthi });
  add({ id: "saarthi-trick", group: "Saarthi", title: "Make Saarthi do a trick", icon: <PartyPopper size={15} />, keywords: "fun spin mascot", run: c.trick });

  // --------------------------------------------------------------- Editor
  add({ id: "find", group: "Editor", title: "Find in the code", hint: `${modKey} F`, icon: <Search size={15} />, keywords: "search", run: () => c.editorAction("actions.find") });
  add({ id: "replace", group: "Editor", title: "Find and replace", hint: `${modKey} H`, icon: <Replace size={15} />, run: () => c.editorAction("editor.action.startFindReplaceAction") });
  add({ id: "go-to-line-help", group: "Editor", title: "Go to a line: type : and its number", hint: ":42", icon: <Hash size={15} />, keywords: "jump line number", run: () => c.editorAction("editor.action.gotoLine") });
  add({ id: "comment", group: "Editor", title: "Toggle line comment", hint: `${modKey} /`, icon: mono("//"), keywords: "comment uncomment", run: () => c.editorAction("editor.action.commentLine") });
  add({ id: "fold-all", group: "Editor", title: "Fold all blocks", hint: `${modKey} K ${modKey} 0`, icon: <FoldVertical size={15} />, keywords: "collapse", run: () => c.editorAction("editor.foldAll") });
  add({ id: "unfold-all", group: "Editor", title: "Unfold all blocks", hint: `${modKey} K ${modKey} J`, icon: <UnfoldVertical size={15} />, keywords: "expand", run: () => c.editorAction("editor.unfoldAll") });
  add({ id: "select-all-matches", group: "Editor", title: "Select every occurrence of the word", hint: `${modKey} ⇧ L`, icon: <Zap size={15} />, keywords: "multi cursor rename", run: () => c.editorAction("editor.action.selectHighlights") });
  add({ id: "trim", group: "Editor", title: "Trim trailing whitespace", hint: `${modKey} K ${modKey} X`, icon: <Scissors size={15} />, run: () => c.editorAction("editor.action.trimTrailingWhitespace") });

  // ------------------------------------------------------------ Languages
  for (const l of c.languages) {
    if (l.id === c.activeId) continue;
    add({ id: `lang-${l.id}`, group: "Languages", title: `Switch to ${l.displayName}`, hint: toolchainLabel(l), icon: mono(LANGUAGE_BADGE[l.id] ?? l.id), keywords: `${l.id} language runtime`, run: () => c.switchLanguage(l.id) });
  }

  // ------------------------------------------------------------- Examples
  add({ id: "examples", group: "Examples", title: "Open the example gallery", icon: <BookOpen size={15} />, keywords: "samples programs", run: c.openExamples });
  for (const example of c.examples) {
    const outcome = outcomeLabel(example.outcome, c.compileLabel);
    add({ id: `example-${example.id}`, group: "Examples", title: `Load example: ${example.title}`, hint: outcome, icon: <Upload size={15} />, keywords: "sample", run: () => c.loadExample(example, false) });
    add({ id: `example-run-${example.id}`, group: "Examples", title: `Run example: ${example.title}`, hint: outcome, icon: <Play size={15} />, keywords: "sample load", disabled: !c.canRun || c.busy, run: () => c.loadExample(example, true) });
  }

  // ----------------------------------------------------------------- View
  add({ id: "theme", group: "View", title: c.theme === "dark" ? "Switch to the light theme" : "Switch to the dark theme", icon: c.theme === "dark" ? <Sun size={15} /> : <Moon size={15} />, keywords: "colour color mode appearance", run: c.toggleTheme });
  if (c.explorer) {
    const explorer = c.explorer;
    add({ id: "explorer", group: "View", title: explorer.open ? "Hide the explorer" : "Show the explorer", icon: <PanelLeft size={15} />, keywords: "files sidebar", run: explorer.toggle });
  }
  if (c.notebook) {
    const notebook = c.notebook;
    add({ id: "notebook", group: "View", title: notebook.open ? "Close the notebook (back to the editor)" : "Open the Python notebook", icon: <NotebookPen size={15} />, keywords: "jupyter ipynb cells python notebook", run: notebook.toggle });
  }
  if (c.dock) {
    const dock = c.dock;
    add({ id: "dock", group: "View", title: dock.open ? "Hide Saarthi's panel" : "Show Saarthi's panel", icon: <PanelRight size={15} />, keywords: "ai sidebar", run: dock.toggle });
  }
  if (c.showDiagnostics) add({ id: "diagnostics", group: "View", title: "Show the diagnostics", icon: <Zap size={15} />, keywords: "problems errors", run: c.showDiagnostics });
  add({ id: "tab-output", group: "View", title: "Show the terminal", icon: <Terminal size={15} />, keywords: "output stdout", run: () => c.showTab("output") });
  add({ id: "tab-input", group: "View", title: "Edit the program's input (stdin)", icon: <Keyboard size={15} />, keywords: "stdin scanf", run: () => c.showTab("input") });
  add({ id: "tab-log", group: "View", title: "Show the build log", icon: <ScrollText size={15} />, keywords: "compiler output", run: () => c.showTab("log") });
  add({ id: "tab-details", group: "View", title: "Show the run details", icon: <Gauge size={15} />, keywords: "time limits", run: () => c.showTab("details") });
  add({ id: "motion", group: "View", title: c.motion ? "Turn animations off" : "Turn animations on", icon: <Sparkles size={15} />, keywords: "motion reduce", run: c.toggleMotion });
  add({ id: "sound", group: "View", title: c.sound ? "Turn interface sounds off" : "Turn interface sounds on", icon: c.sound ? <VolumeX size={15} /> : <Volume2 size={15} />, keywords: "audio mute", run: c.toggleSound });

  // ----------------------------------------------------------------- Help
  add({ id: "tour", group: "Help", title: "Take the tour", icon: <Sparkles size={15} />, keywords: "guide onboarding", run: c.tour });
  add({ id: "shortcuts", group: "Help", title: "Keyboard shortcuts", hint: "?", icon: <Keyboard size={15} />, keywords: "keys", run: c.shortcuts });
  add({ id: "profile", group: "Help", title: "Open your profile and badges", icon: <Trophy size={15} />, keywords: "xp level streak", run: c.profile });
  add({ id: "sign-out", group: "Help", title: c.signOut.label, icon: <LogOut size={15} />, keywords: "logout account", run: c.signOut.run });

  return commands;
}
