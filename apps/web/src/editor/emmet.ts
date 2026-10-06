/**
 * The Emmet extension: abbreviations such as ul>li*3 or div.card>h2+p expand
 * with Tab in HTML, CSS (m10 -> margin: 10px;) and React's JSX. Loaded the
 * first time it is needed; JSX abbreviations are only on while the React
 * language is open (plain JavaScript shares the editor mode).
 */
type Mode = "html" | "css" | "jsx";
const active = new Map<Mode, () => void>();
let wanted: Record<Mode, boolean> = { html: false, css: false, jsx: false };
let loaded: Promise<[typeof import("emmet-monaco-es"), typeof import("./monaco")]> | null = null;

export function setEmmet(next: Record<Mode, boolean>) {
  wanted = next;
  for (const mode of ["html", "css", "jsx"] as Mode[]) {
    if (!next[mode] && active.has(mode)) {
      active.get(mode)!();
      active.delete(mode);
    }
  }
  if (!next.html && !next.css && !next.jsx) return;
  loaded ??= Promise.all([import("emmet-monaco-es"), import("./monaco")]);
  void loaded.then(([emmet, { monaco }]) => {
    const m = monaco as never;
    if (wanted.html && !active.has("html")) active.set("html", emmet.emmetHTML(m, ["html"]));
    if (wanted.css && !active.has("css")) active.set("css", emmet.emmetCSS(m, ["css"]));
    if (wanted.jsx && !active.has("jsx")) active.set("jsx", emmet.emmetJSX(m, ["javascript"]));
  });
}
