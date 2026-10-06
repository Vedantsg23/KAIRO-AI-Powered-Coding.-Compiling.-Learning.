import { AlertTriangle, CheckCircle2, Loader2, Monitor, RefreshCw, Smartphone, Terminal, Trash2 } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cssDocument, htmlDocument, reactDocument, studentLine, type PreviewDocument, type PreviewMessage } from "./document";

interface Props {
  languageId: string;
  /** The code to show (the editor's latest text). */
  source: string;
  /** Bumped by Run (Ctrl+Enter): rebuild the preview now. */
  runToken: number;
  /** Live Preview extension: rebuild shortly after typing stops. */
  auto: boolean;
  onReveal(line: number, column?: number): void;
}

interface ConsoleEntry {
  id: number;
  level: "log" | "info" | "warn" | "error" | "debug";
  text: string;
  line: number | null;
  column?: number | null;
}

type Status = "idle" | "building" | "ready" | "failed";

const AUTO_DELAY_MS = 600;
const MAX_ENTRIES = 200;

let entryIds = 0;

/**
 * The preview for HTML, CSS and React: the page in a sandboxed frame (scripts
 * run, but with an opaque origin, so the code cannot reach KAIRO's page or
 * storage) and a console with the page's messages and errors, each linked to
 * its line in the editor when the browser tells us where it happened.
 */
export const PreviewPanel = memo(function PreviewPanel({ languageId, source, runToken, auto, onReveal }: Props) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [doc, setDoc] = useState<(PreviewDocument & { token: string; lines: number }) | null>(null);
  const [entries, setEntries] = useState<ConsoleEntry[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [narrow, setNarrow] = useState(false);
  const [showConsole, setShowConsole] = useState(true);
  const latest = useRef(source);
  latest.current = source;
  const generation = useRef(0);
  /** The text of the page shown (or being built): typing rebuilds only when the text differs. */
  const built = useRef<string | null>(null);

  const build = useCallback(async () => {
    const text = latest.current;
    built.current = text;
    const gen = ++generation.current;
    const token = `${gen}-${Math.random().toString(36).slice(2, 8)}`;
    setStatus("building");
    let next: PreviewDocument;
    if (languageId === "react") {
      const { compileJsx, REACT_RUNTIME } = await import("./compile");
      if (gen !== generation.current) return;
      const compiled = compileJsx(text);
      if (!compiled.ok) {
        setEntries([{ id: ++entryIds, level: "error", text: `JSX: ${compiled.message}`, line: compiled.line, column: compiled.column }]);
        setStatus("failed");
        return; // keep showing the last page that compiled
      }
      next = reactDocument(compiled.code, token, REACT_RUNTIME.react, REACT_RUNTIME.reactDom);
    } else if (languageId === "css") {
      next = cssDocument(text, token);
    } else {
      next = htmlDocument(text, token);
    }
    setEntries([]);
    setDoc({ ...next, token, lines: text.split("\n").length });
  }, [languageId]);

  // Run (and the first show) rebuilds at once; typing rebuilds after a pause when Live Preview is on.
  useEffect(() => void build(), [runToken, languageId, build]);
  useEffect(() => {
    // Not on the first show (the page was just built from this text), so a click
    // in the page right after it appears is never lost to a second build.
    if (!auto || source === built.current) return;
    const timer = setTimeout(() => void build(), AUTO_DELAY_MS);
    return () => clearTimeout(timer);
  }, [source, auto, build]);

  // Messages from the frame: only from our frame and only for the current page.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data as PreviewMessage | null;
      if (!data || data.__kairo !== "preview" || !doc || data.token !== doc.token) return;
      if (event.source !== frame.current?.contentWindow) return;
      if (data.kind === "ready") {
        setStatus((s) => (s === "building" ? "ready" : s));
        return;
      }
      const isError = data.kind === "error";
      const line = isError ? studentLine(data, doc, doc.lines) : null;
      setEntries((all) => [
        ...all.slice(-(MAX_ENTRIES - 1)),
        { id: ++entryIds, level: isError ? "error" : (data.level ?? "log"), text: String(data.text ?? ""), line },
      ]);
      if (isError) setStatus("failed");
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [doc]);

  const errors = useMemo(() => entries.filter((e) => e.level === "error").length, [entries]);

  return (
    <section className="flex h-full min-h-0 flex-col" aria-label="Preview" data-testid="preview-panel">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-line px-3">
        <span className="font-mono text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted">Preview</span>
        <span
          className={`flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] ${
            status === "failed" ? "border-danger/40 bg-danger/10 text-danger-fg" : status === "ready" ? "border-brand/40 bg-brand/10 text-brand-fg" : "border-line text-faint"
          }`}
          data-testid="preview-status"
          data-status={status}
        >
          {status === "building" ? <Loader2 size={11} className="animate-spin" /> : status === "failed" ? <AlertTriangle size={11} /> : <CheckCircle2 size={11} />}
          {status === "building" ? "rendering" : status === "failed" ? `${errors || 1} error${errors > 1 ? "s" : ""}` : status === "ready" ? "live" : "waiting"}
        </span>
        <span className="hidden text-[11px] text-faint sm:inline">{auto ? "updates as you type" : "Run (Ctrl+Enter) to update"}</span>
        <span className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => setNarrow((v) => !v)}
            aria-pressed={narrow}
            title={narrow ? "Full width" : "Phone width (375 px)"}
            aria-label={narrow ? "Show at full width" : "Show at phone width"}
            className="rounded p-1 text-muted hover:bg-fg/6 hover:text-fg"
            data-testid="preview-width"
          >
            {narrow ? <Monitor size={14} /> : <Smartphone size={14} />}
          </button>
          <button
            type="button"
            onClick={() => setShowConsole((v) => !v)}
            aria-pressed={showConsole}
            title="Console"
            aria-label={showConsole ? "Hide the console" : "Show the console"}
            className={`flex items-center gap-1 rounded px-1.5 py-1 text-[11px] hover:bg-fg/6 ${showConsole ? "text-fg" : "text-muted"}`}
            data-testid="preview-console-toggle"
          >
            <Terminal size={13} /> {entries.length}
          </button>
          <button
            type="button"
            onClick={() => void build()}
            title="Refresh the preview (Ctrl+Enter)"
            aria-label="Refresh the preview"
            className="rounded p-1 text-muted hover:bg-fg/6 hover:text-fg"
            data-testid="preview-refresh"
          >
            <RefreshCw size={14} />
          </button>
        </span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="relative min-h-0 flex-1 overflow-auto bg-[repeating-conic-gradient(var(--cd-line)_0_25%,transparent_0_50%)] bg-[length:16px_16px]">
          {doc ? (
            <iframe
              ref={frame}
              key={doc.token}
              title="Preview of your page"
              srcDoc={doc.html}
              // Scripts run, but without same-origin access: no cookies, storage or page of KAIRO.
              sandbox="allow-scripts allow-modals allow-forms"
              className={`block h-full border-0 bg-white ${narrow ? "mx-auto w-[375px] max-w-full shadow-lg" : "w-full"}`}
              data-testid="preview-frame"
            />
          ) : (
            <p className="p-4 text-[12px] text-faint">Preparing the preview…</p>
          )}
        </div>
        {showConsole && (
          <div className="max-h-[38%] min-h-[64px] shrink-0 overflow-auto border-t border-line bg-surface" data-testid="preview-console" aria-label="Console" role="log">
            <div className="sticky top-0 flex items-center justify-between bg-surface/95 px-3 py-1 backdrop-blur">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-faint">Console</span>
              {entries.length > 0 && (
                <button type="button" onClick={() => setEntries([])} className="flex items-center gap-1 text-[10.5px] text-faint hover:text-fg" aria-label="Clear the console">
                  <Trash2 size={11} /> Clear
                </button>
              )}
            </div>
            {entries.length === 0 ? (
              <p className="px-3 pb-2 font-mono text-[11.5px] text-faint">console.log() output and errors from the page appear here.</p>
            ) : (
              <ul className="px-1 pb-1 font-mono text-[11.5px]">
                {entries.map((e) => (
                  <li
                    key={e.id}
                    className={`flex items-start gap-2 rounded px-2 py-0.5 ${
                      e.level === "error" ? "bg-danger/8 text-danger-fg" : e.level === "warn" ? "bg-warn/10 text-warn-fg" : "text-fg"
                    }`}
                    data-level={e.level}
                  >
                    <span className="min-w-0 flex-1 whitespace-pre-wrap break-words">{e.text}</span>
                    {e.line != null && (
                      <button
                        type="button"
                        onClick={() => onReveal(e.line!, e.column ?? 1)}
                        className="shrink-0 underline decoration-dotted underline-offset-2 hover:text-fg"
                        data-testid="preview-error-line"
                      >
                        line {e.line}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  );
});
