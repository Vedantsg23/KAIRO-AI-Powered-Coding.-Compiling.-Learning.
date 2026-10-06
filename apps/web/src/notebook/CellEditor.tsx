import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { NOTEBOOK_SCHEME, registerIntellisense } from "../editor/intellisense/providers";
import { liveProblemsToMarkers, MONACO_SEVERITY } from "../editor/markers";
import { monaco } from "../editor/monaco";
import type { Theme } from "../lib/hooks";
import type { LiveProblem } from "../live/analyze";

export interface CellEditorHandle {
  focus(position?: "start" | "end"): void;
  /** The text in the editor right now (the notebook's state can be a keystroke behind it). */
  getValue(): string | null;
  /** Apply a quick fix (one undo step). */
  applyEdits(edits: { startLine: number; startColumn: number; endLine: number; endColumn: number; text: string }[]): void;
}

interface Props {
  cellId: string;
  value: string;
  language: "python" | "markdown";
  theme: Theme;
  fontSize: number;
  /** Live problems of this cell's text (syntax errors, typos, tips). */
  problems: LiveProblem[];
  /** Accessible name of the editor ("Code cell 2"). */
  label: string;
  onChange(value: string): void;
  /** Shift+Enter: run and go to the next cell; Ctrl+Enter: run and stay; Alt+Enter: run and insert a cell below. */
  onRun(mode: "next" | "stay" | "insert"): void;
  onFocus(): void;
  /** Esc: leave the editor (Jupyter's command mode). */
  onEscape(): void;
  /** Arrow up on the first line / down on the last line: move to the cell above or below. */
  onEdge(direction: -1 | 1): void;
}

const LINE_HEIGHT_RATIO = 1.6;
const MAX_HEIGHT = 640;

/** A cell's code: a Monaco editor that grows with its text, with Jupyter's run keys. */
export const CellEditor = forwardRef<CellEditorHandle, Props>(function CellEditor(props, ref) {
  const host = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const latest = useRef(props);
  latest.current = props;
  const lineHeight = Math.round(props.fontSize * LINE_HEIGHT_RATIO);
  const [height, setHeight] = useState(() => Math.max(1, props.value.split("\n").length) * lineHeight + 16);

  useEffect(() => {
    registerIntellisense();
    const p = latest.current;
    const uri = monaco.Uri.from({ scheme: NOTEBOOK_SCHEME, path: `/cell-${p.cellId}.${p.language === "python" ? "py" : "md"}` });
    monaco.editor.getModel(uri)?.dispose();
    const model = monaco.editor.createModel(p.value, p.language, uri);
    model.setEOL(monaco.editor.EndOfLineSequence.LF); // never "\r\n" (Windows defaults to it for empty text)
    const editor = monaco.editor.create(host.current!, {
      model,
      theme: p.theme === "dark" ? "kairo-dark" : "kairo-light",
      automaticLayout: true,
      fontFamily: '"JetBrains Mono Variable", "JetBrains Mono", "Cascadia Code", "Fira Code", Consolas, monospace',
      fontSize: p.fontSize,
      lineHeight,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      scrollbar: { vertical: "hidden", horizontal: "auto", alwaysConsumeMouseWheel: false, verticalScrollbarSize: 0 },
      overviewRulerLanes: 0,
      hideCursorInOverviewRuler: true,
      overviewRulerBorder: false,
      lineNumbers: p.language === "python" ? "on" : "off",
      lineNumbersMinChars: 2,
      lineDecorationsWidth: 6,
      glyphMargin: false,
      folding: false,
      renderLineHighlight: "none",
      wordWrap: p.language === "markdown" ? "on" : "off",
      padding: { top: 8, bottom: 8 },
      tabSize: 4,
      insertSpaces: true,
      fixedOverflowWidgets: true,
      contextmenu: true,
      quickSuggestions: p.language === "python" ? { other: true, comments: false, strings: false } : false,
      suggestOnTriggerCharacters: p.language === "python",
      inlineSuggest: { enabled: true },
      lightbulb: { enabled: "onCode" as never },
      guides: { indentation: true },
      "semanticHighlighting.enabled": false,
      ariaLabel: p.label,
    });
    editorRef.current = editor;
    const sizeSub = editor.onDidContentSizeChange(() => setHeight(Math.min(MAX_HEIGHT, editor.getContentHeight())));
    setHeight(Math.min(MAX_HEIGHT, editor.getContentHeight()));
    const changeSub = model.onDidChangeContent(() => latest.current.onChange(model.getValue()));
    const focusSub = editor.onDidFocusEditorText(() => latest.current.onFocus());
    const K = monaco.KeyCode;
    const M = monaco.KeyMod;
    editor.addCommand(M.Shift | K.Enter, () => latest.current.onRun("next"));
    editor.addCommand(M.CtrlCmd | K.Enter, () => latest.current.onRun("stay"));
    editor.addCommand(M.Alt | K.Enter, () => latest.current.onRun("insert"));
    // Esc leaves the cell unless a widget (suggestions, find) is open: Monaco closes those first.
    editor.addCommand(K.Escape, () => latest.current.onEscape(), "!suggestWidgetVisible && !findWidgetVisible && !parameterHintsVisible && !inlineSuggestionVisible");
    const keySub = editor.onKeyDown((e) => {
      if (e.keyCode !== K.UpArrow && e.keyCode !== K.DownArrow) return;
      if (e.shiftKey || e.altKey || e.ctrlKey || e.metaKey) return;
      const pos = editor.getPosition();
      if (!pos) return;
      if (e.keyCode === K.UpArrow && pos.lineNumber === 1) {
        e.preventDefault();
        latest.current.onEdge(-1);
      } else if (e.keyCode === K.DownArrow && pos.lineNumber === model.getLineCount()) {
        e.preventDefault();
        latest.current.onEdge(1);
      }
    });
    return () => {
      sizeSub.dispose();
      changeSub.dispose();
      focusSub.dispose();
      keySub.dispose();
      editor.dispose();
      model.dispose();
      editorRef.current = null;
    };
    // The editor is created once per cell; later prop changes are applied below.
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    const model = editor?.getModel();
    if (!editor || !model) return;
    if (model.getLanguageId() !== props.language) {
      monaco.editor.setModelLanguage(model, props.language);
      editor.updateOptions({ lineNumbers: props.language === "python" ? "on" : "off", wordWrap: props.language === "markdown" ? "on" : "off" });
    }
  }, [props.language]);

  useEffect(() => {
    editorRef.current?.updateOptions({ fontSize: props.fontSize, lineHeight, theme: props.theme === "dark" ? "kairo-dark" : "kairo-light" });
  }, [props.fontSize, props.theme, lineHeight]);

  // The text is only ever changed here (typing, quick fixes through applyEdits): `value` is
  // read once when the editor is created, so a render a keystroke behind can never put old text back.

  const shown = useRef("");
  useEffect(() => {
    const model = editorRef.current?.getModel();
    if (!model) return;
    const markers = liveProblemsToMarkers(props.problems).map((m) => ({
      severity: MONACO_SEVERITY[m.severity],
      message: m.message,
      code: m.code,
      source: m.source,
      startLineNumber: m.startLineNumber,
      startColumn: m.startColumn,
      endLineNumber: m.endLineNumber,
      endColumn: m.endColumn,
    }));
    const key = JSON.stringify(markers);
    if (key === shown.current) return;
    shown.current = key;
    monaco.editor.setModelMarkers(model, "live", markers);
  }, [props.problems]);

  useImperativeHandle(ref, () => ({
    focus(position) {
      const editor = editorRef.current;
      const model = editor?.getModel();
      if (!editor || !model) return;
      if (position === "start") editor.setPosition({ lineNumber: 1, column: 1 });
      if (position === "end") {
        const line = model.getLineCount();
        editor.setPosition({ lineNumber: line, column: model.getLineMaxColumn(line) });
      }
      editor.focus();
    },
    getValue() {
      return editorRef.current?.getModel()?.getValue() ?? null;
    },
    applyEdits(edits) {
      const editor = editorRef.current;
      if (!editor || edits.length === 0) return;
      editor.pushUndoStop();
      editor.executeEdits(
        "kairo-fix",
        edits.map((e) => ({ range: new monaco.Range(e.startLine, e.startColumn, e.endLine, e.endColumn), text: e.text, forceMoveMarkers: true })),
      );
      editor.pushUndoStop();
      editor.focus();
    },
  }));

  return <div ref={host} style={{ height }} className="w-full" data-testid="nb-cell-editor" />;
});
