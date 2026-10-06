/**
 * KAIRO's extensions. Every entry here switches a real feature of the
 * workspace on or off (nothing is downloaded: they ship with the app, the
 * way VS Code's built-in extensions do). Choices are saved in this browser.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { load, save } from "../lib/storage";

export type ExtensionCategory = "Language packs" | "Code quality" | "Formatters" | "Editor" | "Themes" | "AI" | "Preview" | "Notebooks" | "Keymaps";

export interface ExtensionDef {
  id: string;
  name: string;
  category: ExtensionCategory;
  /** One line, shown in the list. */
  summary: string;
  /** What it does in KAIRO, shown on the details page. */
  details: string[];
  /** Languages it applies to (KAIRO ids); empty = every language. */
  languages: string[];
  enabledByDefault: boolean;
  /** Needs the KAIRO server (formatters in the sandbox, AI). */
  needsServer?: boolean;
  /** Keyboard shortcut shown on the details page. */
  shortcut?: string;
  /** Two letters for the icon tile. */
  mark: string;
  /** Tile colour: a CSS colour or token. */
  tint: string;
  version: string;
}

const pack = (id: string, name: string, languages: string[], mark: string, tint: string, extra: string[] = []): ExtensionDef => ({
  id: `pack-${id}`,
  name,
  category: "Language packs",
  summary: `Language pack: IntelliSense, snippets, hovers and parameter hints.`,
  details: [
    `Completions while you type: names declared in your file, ${name}'s keywords and types, and its standard library with signatures.`,
    "Members after . :: or -> for well-known modules and objects.",
    "Hover a library name to read what it does; parameter hints appear inside ( ).",
    "Snippets: type for, while, if, main, func, class… and press Tab to jump between the blanks.",
    ...extra,
  ],
  languages,
  enabledByDefault: true,
  mark,
  tint,
  version: "1.0.0",
});

export const EXTENSIONS: ExtensionDef[] = [
  pack("c", "C / C++", ["c", "cpp"], "C", "#3b82f6", ["#include completion for the standard headers.", "Turbo C habits (conio.h, getch, void main) explained with GCC-friendly fixes."]),
  pack("java", "Java", ["java"], "J", "#ea580c", ["Scanner, System.out, String, Math, collections and more."]),
  pack("python", "Python", ["python"], "Py", "#2563eb", ["Built-ins, string/list/dict methods and the math, random, collections, itertools modules."]),
  pack("web", "JS · TS · React · HTML · CSS", ["javascript", "typescript", "react", "html", "css"], "JS", "#ca8a04", [
    "Powered by the TypeScript language service: real types, members, signatures and errors while you type.",
    "HTML and CSS completions, colour previews and validation.",
  ]),
  pack("go", "Go", ["go"], "Go", "#0891b2"),
  pack("rust", "Rust", ["rust"], "Rs", "#b45309"),
  pack("dotnet", "C# · VB.NET · F#", ["csharp", "vbnet", "fsharp"], "C#", "#7c3aed"),
  pack("kotlin", "Kotlin", ["kotlin"], "Kt", "#8b5cf6"),
  pack("scripting", "PHP · Ruby · Lua · Perl · Tcl", ["php", "ruby", "lua", "perl", "tcl"], "Rb", "#dc2626"),
  pack("shell", "Bash & SQL", ["bash", "sql"], "$_", "#475569"),
  pack("data", "R & Octave", ["r", "octave"], "R", "#1d4ed8"),
  pack("classic", "Fortran · Pascal · COBOL · Ada", ["fortran", "pascal", "cobol", "ada"], "F", "#0f766e"),
  pack("systems", "Assembly · D · Nim · Swift", ["asm", "d", "nim", "swift"], "As", "#57534e"),
  pack("functional", "Haskell · Lisp · Clojure · Elixir…", ["haskell", "lisp", "scheme", "clojure", "elixir", "erlang"], "λ", "#9333ea"),
  pack("logic", "Prolog · Lex · Verilog", ["prolog", "lex", "verilog"], "Pl", "#be185d"),
  {
    id: "typo-guard",
    name: "Typo Guard",
    category: "Code quality",
    summary: "Catches misspelt names while you type: pritnf → printf, Sytem → System.",
    details: [
      "Compares every name that is not declared in your file with the language's keywords, types and library, and with your own names.",
      "Also checks #include headers, Python modules and Java imports.",
      "Each finding has a one-click fix (or press Ctrl+. in the editor).",
      "Conservative on purpose: very short names and names you use several times are left alone.",
    ],
    languages: [],
    enabledByDefault: true,
    shortcut: "Ctrl+.",
    mark: "Ty",
    tint: "#d97706",
    version: "1.0.0",
  },
  {
    id: "saarthi-tips",
    name: "Saarthi Tips",
    category: "Code quality",
    summary: "Beginner slips that still compile: scanf without &, 1/2 == 0, stray ';', string ==…",
    details: [
      "scanf without & before a variable, reading a variable before it has a value, one-past-the-end array loops (C/C++).",
      "A ';' right after for/while/if, an assignment inside a condition, whole-number division (1/2 is 0).",
      "Loops whose variable never changes (may run forever).",
      "Java strings compared with ==, Python input() used as a number, Turbo C headers GCC does not have.",
    ],
    languages: [],
    enabledByDefault: true,
    mark: "Tp",
    tint: "#0ea5e9",
    version: "1.0.0",
  },
  {
    id: "error-lens",
    name: "Error Lens",
    category: "Code quality",
    summary: "Shows each problem's message at the end of its line.",
    details: ["Errors, warnings and tips appear right next to the code, coloured by severity, so you do not need to hover."],
    languages: [],
    enabledByDefault: false,
    mark: "EL",
    tint: "#ef4444",
    version: "1.0.0",
  },
  {
    id: "complexity-lens",
    name: "Complexity Lens",
    category: "Code quality",
    summary: "An estimate of each function's running time above it: O(n), O(n²), O(2ⁿ).",
    details: [
      "Counts nested loops and recursive calls in each function and shows a rough Big-O estimate.",
      "It is a teaching aid, not a proof: loops that stop early or recursion that halves n are not detected.",
    ],
    languages: [],
    enabledByDefault: true,
    mark: "O",
    tint: "#10b981",
    version: "1.0.0",
  },
  {
    id: "todo-highlight",
    name: "TODO Highlight",
    category: "Code quality",
    summary: "Highlights TODO, FIXME and NOTE comments.",
    details: ["Marks TODO, FIXME, HACK and NOTE in your comments so unfinished work stands out."],
    languages: [],
    enabledByDefault: false,
    mark: "TD",
    tint: "#f59e0b",
    version: "1.0.0",
  },
  {
    id: "prettier",
    name: "Prettier Formatter",
    category: "Formatters",
    summary: "Formats JavaScript, TypeScript, React (JSX), HTML and CSS.",
    details: [
      "Runs Prettier 3 in your browser (loaded the first time you format): press Shift+Alt+F, or Format document in the command palette.",
      "One undo step: Ctrl+Z puts your layout back.",
    ],
    languages: ["javascript", "typescript", "react", "html", "css"],
    enabledByDefault: true,
    shortcut: "Shift+Alt+F",
    mark: "Pr",
    tint: "#c026d3",
    version: "3.x",
  },
  {
    id: "sandbox-format",
    name: "Sandbox Formatters",
    category: "Formatters",
    summary: "clang-format, black, gofmt and more, run in the sandbox.",
    details: [
      "C, C++, Java and C# with clang-format 18; Python with Black; Go with gofmt; Bash with shfmt. Press Shift+Alt+F.",
      "Your code is formatted in the same isolated sandbox that runs programs: it is only reformatted, never run, and nothing is kept.",
      "Code that does not parse is left as it is, and the formatter says which line it could not read.",
    ],
    languages: ["c", "cpp", "java", "csharp", "python", "go", "bash"],
    enabledByDefault: true,
    needsServer: true,
    shortcut: "Shift+Alt+F",
    mark: "{}",
    tint: "#64748b",
    version: "1.0.0",
  },
  {
    id: "format-on-save",
    name: "Format on Save",
    category: "Formatters",
    summary: "Formats the file when you press Ctrl+S.",
    details: ["Uses Prettier or the sandbox formatter for the current language, then saves the draft. Languages without a formatter are just saved."],
    languages: [],
    enabledByDefault: false,
    shortcut: "Ctrl+S",
    mark: "FS",
    tint: "#94a3b8",
    version: "1.0.0",
  },
  {
    id: "emmet",
    name: "Emmet",
    category: "Editor",
    summary: "Type ul>li*3 and press Tab to expand it into HTML.",
    details: [
      "Abbreviations for HTML, CSS and React's JSX: ul>li*3, div.card>h2+p, m10 → margin: 10px;",
      "Type the abbreviation, then press Tab (or pick it from the suggestions).",
    ],
    languages: ["html", "css", "react"],
    enabledByDefault: true,
    shortcut: "Tab",
    mark: "Em",
    tint: "#16a34a",
    version: "1.0.0",
  },
  {
    id: "vim",
    name: "Vim Keymap",
    category: "Keymaps",
    summary: "Vim keys in the editor (normal, insert and visual modes).",
    details: [
      "Adds Vim's normal, insert and visual modes and its motions (hjkl, w, b, dd, yy, p, u, :w...) to the code editor, powered by monaco-vim.",
      "The current mode shows under the editor. Press i to type, Esc for normal mode.",
    ],
    languages: [],
    enabledByDefault: false,
    mark: "Vi",
    tint: "#15803d",
    version: "0.4",
  },
  {
    id: "minimap",
    name: "Minimap",
    category: "Editor",
    summary: "A zoomed-out map of the file beside the scrollbar.",
    details: ["Shown on wide screens."],
    languages: [],
    enabledByDefault: true,
    mark: "Mm",
    tint: "#6366f1",
    version: "1.0.0",
  },
  {
    id: "word-wrap",
    name: "Word Wrap",
    category: "Editor",
    summary: "Wraps long lines to the editor's width.",
    details: ["Long lines continue on the next visual line instead of scrolling sideways."],
    languages: [],
    enabledByDefault: false,
    mark: "Ww",
    tint: "#0d9488",
    version: "1.0.0",
  },
  {
    id: "sticky-scroll",
    name: "Sticky Scroll",
    category: "Editor",
    summary: "Keeps the current function and loop headers pinned while you scroll.",
    details: ["Shows which function, class or loop you are in at the top of the editor."],
    languages: [],
    enabledByDefault: false,
    mark: "St",
    tint: "#0284c7",
    version: "1.0.0",
  },
  {
    id: "bracket-colors",
    name: "Bracket Pair Colors",
    category: "Editor",
    summary: "Colours matching brackets so nesting is easy to follow.",
    details: ["Each nesting level of (), [] and {} gets its own colour."],
    languages: [],
    enabledByDefault: true,
    mark: "()",
    tint: "#e11d48",
    version: "1.0.0",
  },
  {
    id: "whitespace",
    name: "Render Whitespace",
    category: "Editor",
    summary: "Shows spaces and tabs as faint dots and arrows.",
    details: ["Helpful for Python and Makefiles, where indentation matters."],
    languages: [],
    enabledByDefault: false,
    mark: "··",
    tint: "#71717a",
    version: "1.0.0",
  },
  {
    id: "theme-midnight",
    name: "Midnight Theme",
    category: "Themes",
    summary: "A deep blue editor theme.",
    details: ["Changes the editor's colours only; KAIRO keeps its own theme."],
    languages: [],
    enabledByDefault: false,
    mark: "Mn",
    tint: "#1e3a8a",
    version: "1.0.0",
  },
  {
    id: "theme-paper",
    name: "Paper Theme",
    category: "Themes",
    summary: "A warm, low-contrast light editor theme.",
    details: ["Changes the editor's colours only; KAIRO keeps its own theme."],
    languages: [],
    enabledByDefault: false,
    mark: "Pa",
    tint: "#a16207",
    version: "1.0.0",
  },
  {
    id: "theme-contrast",
    name: "High Contrast Theme",
    category: "Themes",
    summary: "Maximum contrast for the editor (follows light/dark).",
    details: ["Uses Monaco's high-contrast themes for readability."],
    languages: [],
    enabledByDefault: false,
    mark: "HC",
    tint: "#000000",
    version: "1.0.0",
  },
  {
    id: "ai-autocomplete",
    name: "Saarthi Autocomplete",
    category: "AI",
    summary: "AI suggestions in grey as you type; press Tab to accept.",
    details: [
      "When you pause typing, Saarthi suggests the next line or two from your code. Tab accepts, Esc dismisses.",
      "Needs an AI model on the server (Gemini, Claude, OpenAI or a local Ollama). Your code is sent to that model only while this is on.",
    ],
    languages: [],
    enabledByDefault: false,
    needsServer: true,
    shortcut: "Tab",
    mark: "AI",
    tint: "#06b6d4",
    version: "1.0.0",
  },
  {
    id: "live-preview",
    name: "Live Preview",
    category: "Preview",
    summary: "HTML, CSS and React pages update while you type.",
    details: ["The preview re-renders a moment after you stop typing. Console messages from the page show in the terminal."],
    languages: ["html", "css", "react"],
    enabledByDefault: true,
    mark: "LP",
    tint: "#f97316",
    version: "1.0.0",
  },
  {
    id: "notebooks",
    name: "Jupyter Notebooks",
    category: "Notebooks",
    summary: "Python notebooks with code and Markdown cells and their own terminal.",
    details: [
      "Open it from the notebook button on the left bar (or the command palette). Run a cell with Shift+Enter.",
      "Printed output, the Out[n] value of the last line and tracebacks appear under each cell; errors get a quick note and Saarthi can explain them.",
      "Its own terminal: a run log, input for input(), and a Python console that sees the notebook's variables.",
      "Open and save .ipynb files (Jupyter, VS Code, Colab). Cells run in the sandbox: each run replays the code cells from the top in a fresh interpreter.",
      "Standard library only: the sandbox has no network, so pip packages and plotting libraries are not available.",
    ],
    languages: ["notebook"],
    enabledByDefault: true,
    needsServer: true,
    shortcut: "Shift+Enter",
    mark: "Nb",
    tint: "#f97316",
    version: "1.0.0",
  },
];

export const CATEGORIES: ExtensionCategory[] = ["Language packs", "Code quality", "Formatters", "AI", "Preview", "Notebooks", "Editor", "Keymaps", "Themes"];

const THEMES = ["theme-midnight", "theme-paper", "theme-contrast"];

export interface ExtensionsState {
  enabled: (id: string) => boolean;
  set(id: string, on: boolean): void;
  /** The pack that serves a language (null if none). */
  packFor(languageId: string): ExtensionDef | null;
  fontSize: number;
  setFontSize(size: number): void;
}

const STORAGE = "k.extensions";

export function useExtensions(): ExtensionsState {
  const [state, setState] = useState<Record<string, boolean>>(() => load<Record<string, boolean>>(STORAGE, {}));
  const [fontSize, setFontSizeState] = useState<number>(() => load<number>("k.fontSize", 14));
  useEffect(() => void save(STORAGE, state), [state]);
  useEffect(() => void save("k.fontSize", fontSize), [fontSize]);
  const enabled = useCallback(
    (id: string) => {
      if (id in state) return state[id];
      return EXTENSIONS.find((e) => e.id === id)?.enabledByDefault ?? false;
    },
    [state],
  );
  const set = useCallback((id: string, on: boolean) => {
    setState((all) => {
      const next = { ...all, [id]: on };
      // Only one editor theme at a time.
      if (on && THEMES.includes(id)) for (const t of THEMES) if (t !== id) next[t] = false;
      return next;
    });
  }, []);
  return useMemo(
    () => ({
      enabled,
      set,
      packFor: (languageId: string) => EXTENSIONS.find((e) => e.category === "Language packs" && e.languages.includes(languageId)) ?? null,
      fontSize,
      setFontSize: (size: number) => setFontSizeState(Math.max(11, Math.min(22, size))),
    }),
    [enabled, set, fontSize],
  );
}
