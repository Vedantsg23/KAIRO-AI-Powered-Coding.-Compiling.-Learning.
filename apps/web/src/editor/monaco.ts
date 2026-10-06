// Monaco is bundled locally (no CDN), with the editor features and the
// syntax definitions of every language KAIRO offers. Each language's
// tokenizer is a small chunk loaded the first time that language is shown.
// JavaScript, TypeScript, React (JSX), HTML and CSS also get Monaco's real
// language services (completions with types, hovers, signature help and
// errors while typing); they run in their own workers, started on first use.
import "monaco-editor/features/register.all";
import "monaco-editor/languages/definitions/clojure/register";
import "monaco-editor/languages/definitions/css/register";
import "monaco-editor/languages/definitions/elixir/register";
import "monaco-editor/languages/definitions/fsharp/register";
import "monaco-editor/languages/definitions/html/register";
import "monaco-editor/languages/definitions/markdown/register";
import "monaco-editor/languages/definitions/pascal/register";
import "monaco-editor/languages/definitions/perl/register";
import "monaco-editor/languages/definitions/r/register";
import "monaco-editor/languages/definitions/scheme/register";
import "monaco-editor/languages/definitions/systemverilog/register"; // registers "verilog" too
import "monaco-editor/languages/definitions/tcl/register";
import "monaco-editor/languages/definitions/vb/register";
import "monaco-editor/languages/features/css/register";
import "monaco-editor/languages/features/html/register";
import "monaco-editor/languages/features/json/register";
import {
  JsxEmit,
  ModuleKind,
  ScriptTarget,
  javascriptDefaults,
  typescriptDefaults,
} from "monaco-editor/languages/features/typescript/register";
import "monaco-editor/languages/definitions/cpp/register"; // registers "c" and "cpp"
import "monaco-editor/languages/definitions/csharp/register";
import "monaco-editor/languages/definitions/go/register";
import "monaco-editor/languages/definitions/java/register";
import "monaco-editor/languages/definitions/javascript/register";
import "monaco-editor/languages/definitions/kotlin/register";
import "monaco-editor/languages/definitions/lua/register";
import "monaco-editor/languages/definitions/php/register";
import "monaco-editor/languages/definitions/python/register";
import "monaco-editor/languages/definitions/ruby/register";
import "monaco-editor/languages/definitions/rust/register";
import "monaco-editor/languages/definitions/shell/register";
import "monaco-editor/languages/definitions/sql/register";
import "monaco-editor/languages/definitions/swift/register";
import "monaco-editor/languages/definitions/typescript/register";
import * as monaco from "monaco-editor/editor/editor.api";
import EditorWorker from "monaco-editor/editor/editor.worker?worker";
import CssWorker from "monaco-editor/languages/features/css/css.worker?worker";
import HtmlWorker from "monaco-editor/languages/features/html/html.worker?worker";
import JsonWorker from "monaco-editor/languages/features/json/json.worker?worker";
import TsWorker from "monaco-editor/languages/features/typescript/ts.worker?worker";
import { registerExtraLanguages } from "./languages";
import { NODE_LITE } from "./nodeLite";

self.MonacoEnvironment = {
  getWorker: (_moduleId: string, label: string) => {
    if (label === "typescript" || label === "javascript") return new TsWorker();
    if (label === "css" || label === "scss" || label === "less") return new CssWorker();
    if (label === "html" || label === "handlebars" || label === "razor") return new HtmlWorker();
    if (label === "json") return new JsonWorker();
    return new EditorWorker();
  },
};

registerExtraLanguages(monaco);

// JavaScript runs on Node.js in the sandbox and TypeScript is compiled with
// `tsc --strict` there, so the editor checks against ES2022 plus a small set
// of Node.js declarations (console, process, require, timers...). React files
// (App.jsx) run in the browser preview, with the DOM and JSX.
const common = {
  target: ScriptTarget.ESNext,
  allowNonTsExtensions: true,
  moduleResolution: 2 /* NodeJs */,
  module: ModuleKind.CommonJS,
  noEmit: true,
  esModuleInterop: true,
  allowJs: true,
  lib: ["es2022", "dom"],
  jsx: JsxEmit.ReactJSX,
};
javascriptDefaults.setCompilerOptions({ ...common, checkJs: true });
typescriptDefaults.setCompilerOptions({ ...common, strict: true });
const ignore = {
  // 80001: "may be converted to an ES module"; 7016: no types for a require()d module;
  // 2580/2591: "cannot find name require/process" style hints superseded by NODE_LITE.
  diagnosticCodesToIgnore: [80001, 80002, 80004, 80005, 80006, 80007, 7016, 7044, 2686],
};
javascriptDefaults.setDiagnosticsOptions({ noSemanticValidation: false, noSyntaxValidation: false, ...ignore });
typescriptDefaults.setDiagnosticsOptions({ noSemanticValidation: false, noSyntaxValidation: false, ...ignore });
javascriptDefaults.addExtraLib(NODE_LITE, "file:///node_modules/@types/kairo-node/index.d.ts");
typescriptDefaults.addExtraLib(NODE_LITE, "file:///node_modules/@types/kairo-node/index.d.ts");
javascriptDefaults.setEagerModelSync(true);
typescriptDefaults.setEagerModelSync(true);

/** React's types, added only when a React file is opened (they are large). */
let reactTypes: Promise<void> | null = null;
export function ensureReactTypes(): Promise<void> {
  reactTypes ??= import("./reactTypes").then(({ REACT_LITE }) => {
    javascriptDefaults.addExtraLib(REACT_LITE, "file:///node_modules/@types/react/index.d.ts");
    typescriptDefaults.addExtraLib(REACT_LITE, "file:///node_modules/@types/react/index.d.ts");
  });
  return reactTypes;
}

// Colours follow the KAIRO tokens (src/index.css): white "signal" theme with
// green keywords and warm strings, and a graphite dark theme.
monaco.editor.defineTheme("kairo-light", {
  base: "vs",
  inherit: true,
  rules: [
    { token: "comment", foreground: "6b7a71", fontStyle: "italic" },
    { token: "keyword", foreground: "107a3a", fontStyle: "bold" },
    { token: "string", foreground: "a14e07" },
    { token: "number", foreground: "1d4ed8" },
    { token: "type", foreground: "0b7185" },
    { token: "type.identifier", foreground: "0b7185" },
    { token: "annotation", foreground: "6d28d9" },
    { token: "variable.predefined", foreground: "6d28d9" },
    { token: "operator", foreground: "435049" },
    { token: "delimiter", foreground: "5f6b64" },
  ],
  colors: {
    "editor.background": "#ffffff",
    "editorGutter.background": "#ffffff",
    "editor.foreground": "#0b1510",
    "editor.lineHighlightBackground": "#f1f7f3",
    "editor.lineHighlightBorder": "#00000000",
    "editorLineNumber.foreground": "#a3b1a8",
    "editorLineNumber.activeForeground": "#0b1510",
    "editorCursor.foreground": "#16a34a",
    "editor.selectionBackground": "#22c55e38",
    "editor.inactiveSelectionBackground": "#22c55e1f",
    "editorIndentGuide.background1": "#0b15100f",
    "editorIndentGuide.activeBackground1": "#0b151029",
    "editorBracketMatch.background": "#22c55e1f",
    "editorBracketMatch.border": "#16a34a88",
    "editorError.foreground": "#dc2626",
    "editorWarning.foreground": "#d97706",
    "editorInfo.foreground": "#2563eb",
    "editorWidget.background": "#ffffff",
    "editorWidget.border": "#e2e8e4",
    "editorHoverWidget.background": "#ffffff",
    "editorHoverWidget.border": "#c9d3cc",
    "editorSuggestWidget.background": "#ffffff",
    "editorSuggestWidget.border": "#c9d3cc",
    "editorSuggestWidget.selectedBackground": "#22c55e24",
    "minimap.background": "#fbfcfb",
    "minimapSlider.background": "#0b151014",
    "minimapSlider.hoverBackground": "#0b151024",
    "scrollbarSlider.background": "#0b151014",
    "scrollbarSlider.hoverBackground": "#0b151029",
  },
});

monaco.editor.defineTheme("kairo-dark", {
  base: "vs-dark",
  inherit: true,
  rules: [
    { token: "comment", foreground: "6f7a74", fontStyle: "italic" },
    { token: "keyword", foreground: "4ade80" },
    { token: "string", foreground: "fcd34d" },
    { token: "number", foreground: "93c5fd" },
    { token: "type", foreground: "67e8f9" },
    { token: "type.identifier", foreground: "67e8f9" },
    { token: "annotation", foreground: "c4b5fd" },
    { token: "variable.predefined", foreground: "c4b5fd" },
    { token: "operator", foreground: "a8a8a8" },
    { token: "delimiter", foreground: "8a8a8a" },
  ],
  colors: {
    "editor.background": "#0c0c0c",
    "editorGutter.background": "#0c0c0c",
    "editor.foreground": "#e8e8e8",
    "editor.lineHighlightBackground": "#141814",
    "editor.lineHighlightBorder": "#00000000",
    "editorLineNumber.foreground": "#4b524e",
    "editorLineNumber.activeForeground": "#e8e8e8",
    "editorCursor.foreground": "#4ade80",
    "editor.selectionBackground": "#22c55e33",
    "editor.inactiveSelectionBackground": "#22c55e1c",
    "editorIndentGuide.background1": "#ffffff0d",
    "editorIndentGuide.activeBackground1": "#ffffff26",
    "editorBracketMatch.background": "#22c55e1f",
    "editorBracketMatch.border": "#4ade8077",
    "editorError.foreground": "#f87171",
    "editorWarning.foreground": "#fbbf24",
    "editorInfo.foreground": "#60a5fa",
    "editorWidget.background": "#121212",
    "editorWidget.border": "#2a2a2a",
    "editorHoverWidget.background": "#121212",
    "editorHoverWidget.border": "#2e2e2e",
    "editorSuggestWidget.background": "#121212",
    "editorSuggestWidget.border": "#2a2a2a",
    "editorSuggestWidget.selectedBackground": "#22c55e26",
    "minimap.background": "#0a0a0a",
    "minimapSlider.background": "#ffffff10",
    "minimapSlider.hoverBackground": "#ffffff1f",
    "scrollbarSlider.background": "#ffffff14",
    "scrollbarSlider.hoverBackground": "#ffffff29",
  },
});

// Extension themes (Extensions view): editor colours only.
monaco.editor.defineTheme("kairo-midnight", {
  base: "vs-dark",
  inherit: true,
  rules: [
    { token: "comment", foreground: "5c6e99", fontStyle: "italic" },
    { token: "keyword", foreground: "7dd3fc" },
    { token: "string", foreground: "a5f3fc" },
    { token: "number", foreground: "f9a8d4" },
    { token: "type", foreground: "c4b5fd" },
    { token: "type.identifier", foreground: "c4b5fd" },
  ],
  colors: {
    "editor.background": "#0b1226",
    "editorGutter.background": "#0b1226",
    "editor.foreground": "#dbe4ff",
    "editor.lineHighlightBackground": "#121c3a",
    "editorLineNumber.foreground": "#3a4a78",
    "editorLineNumber.activeForeground": "#dbe4ff",
    "editorCursor.foreground": "#7dd3fc",
    "editor.selectionBackground": "#3b82f640",
    "editorWidget.background": "#0f1830",
    "editorSuggestWidget.background": "#0f1830",
    "editorSuggestWidget.selectedBackground": "#1e3a8a80",
  },
});
monaco.editor.defineTheme("kairo-paper", {
  base: "vs",
  inherit: true,
  rules: [
    { token: "comment", foreground: "9a8c73", fontStyle: "italic" },
    { token: "keyword", foreground: "8a4b0f", fontStyle: "bold" },
    { token: "string", foreground: "4d7c0f" },
    { token: "number", foreground: "9d174d" },
    { token: "type", foreground: "1e40af" },
  ],
  colors: {
    "editor.background": "#fbf7ee",
    "editorGutter.background": "#fbf7ee",
    "editor.foreground": "#3b3226",
    "editor.lineHighlightBackground": "#f3ecdc",
    "editorLineNumber.foreground": "#c2b59b",
    "editorCursor.foreground": "#8a4b0f",
    "editor.selectionBackground": "#d9c49f66",
    "editorWidget.background": "#fbf7ee",
    "editorSuggestWidget.background": "#fbf7ee",
  },
});

export { monaco };
