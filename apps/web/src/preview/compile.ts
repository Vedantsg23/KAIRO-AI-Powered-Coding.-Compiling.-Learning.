/**
 * JSX to plain JavaScript for the React preview, in the browser (Sucrase:
 * small and fast, keeps line numbers). Loaded on demand with React's UMD
 * builds, so none of it is downloaded until a React preview runs.
 */
import { transform } from "sucrase";
import reactDom from "../../node_modules/react-dom/umd/react-dom.production.min.js?raw";
import react from "../../node_modules/react/umd/react.production.min.js?raw";

export const REACT_RUNTIME = { react, reactDom };

export type CompileResult = { ok: true; code: string } | { ok: false; message: string; line: number | null; column: number | null };

export function compileJsx(source: string): CompileResult {
  try {
    const out = transform(source, { transforms: ["jsx", "imports"], production: true, jsxRuntime: "classic" });
    return { ok: true, code: out.code };
  } catch (error) {
    const e = error as Error & { loc?: { line: number; column: number } };
    return {
      ok: false,
      message: (e.message || String(error)).replace(/\s*\(\d+:\d+\)$/, ""),
      line: e.loc?.line ?? null,
      column: e.loc?.column ?? null,
    };
  }
}
