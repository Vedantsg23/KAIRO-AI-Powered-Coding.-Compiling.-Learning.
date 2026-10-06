/**
 * Languages with a live syntax check (a Tree-sitter grammar compiled to
 * WebAssembly, bundled with the app). SQL and Swift have no grammar build
 * that works with the Tree-sitter runtime used here, so for them problems
 * appear when the code is run.
 */
export const LIVE_LANGUAGES = new Set([
  "c",
  "cpp",
  "java",
  "python",
  "javascript",
  "typescript",
  "go",
  "rust",
  "csharp",
  "kotlin",
  "php",
  "ruby",
  "lua",
  "bash",
]);

/** Pause after the last keystroke before re-checking. */
export const LIVE_DEBOUNCE_MS = 150;
