/**
 * Browser languages: HTML, CSS and React run in the browser itself, in a
 * sandboxed preview frame, not on the server. They need no sandbox image, so
 * they also work when the KAIRO server is unreachable (and in the demo page).
 *
 * They look like the server's languages to the rest of the app (same Language
 * shape), with a single "Preview" step; App.tsx sends their Run to the
 * preview panel instead of the API.
 */
import type { Language } from "../api/types";

const PREVIEW_LIMITS = { wallTimeMs: 0, memoryMb: 0, outputKb: 64 };

function browserLanguage(id: string, displayName: string, editorMode: string, sourceFile: string, what: string): Language {
  return {
    id,
    displayName,
    editorMode,
    sourceFile,
    toolchain: { name: "Browser", declaredVersion: "preview", image: "browser" },
    steps: [{ name: "run", kind: "run", label: "Preview", argv: [what], limits: PREVIEW_LIMITS }],
    status: "stable",
    available: true,
  };
}

export const BROWSER_LANGUAGES: Language[] = [
  browserLanguage("html", "HTML", "html", "index.html", "rendered in a sandboxed frame of this page"),
  browserLanguage("css", "CSS", "css", "styles.css", "applied to a sample page in a sandboxed frame"),
  browserLanguage("react", "React", "javascript", "App.jsx", "JSX compiled in the browser (Sucrase), React 18 in a sandboxed frame"),
];

const IDS = new Set(BROWSER_LANGUAGES.map((l) => l.id));

export function isBrowserLanguage(id: string | null | undefined): boolean {
  return !!id && IDS.has(id);
}

/**
 * The server's languages with the browser languages added after TypeScript
 * (or at the end). They are added only once, whatever the server lists.
 */
export function withBrowserLanguages(languages: Language[]): Language[] {
  const server = languages.filter((l) => !IDS.has(l.id));
  const at = server.findIndex((l) => l.id === "typescript");
  const index = at >= 0 ? at + 1 : server.length;
  return [...server.slice(0, index), ...BROWSER_LANGUAGES, ...server.slice(index)];
}
