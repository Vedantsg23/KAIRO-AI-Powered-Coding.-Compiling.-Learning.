import { CornerDownLeft, Search } from "lucide-react";
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { fuzzyFilter } from "../lib/fuzzy";
import { modKey } from "../lib/hooks";

export interface Command {
  id: string;
  title: string;
  group: string;
  /** Shown on the right: a shortcut or a detail. */
  hint?: string;
  icon?: ReactNode;
  /** Extra words to match on. */
  keywords?: string;
  disabled?: boolean;
  run(): void;
}

/**
 * Monaco's Ctrl+K chords, by their second key. Ctrl+K opens the palette, so
 * when it was opened from the editor, the second key of a chord runs the
 * editor action it always did (Ctrl+K Ctrl+C still comments the line).
 */
export const EDITOR_CHORDS: Record<string, string> = {
  c: "editor.action.addCommentLine",
  u: "editor.action.removeCommentLine",
  "0": "editor.foldAll",
  j: "editor.unfoldAll",
  "[": "editor.foldRecursively",
  "]": "editor.unfoldRecursively",
  l: "editor.toggleFold",
  "/": "editor.foldAllBlockComments",
  "1": "editor.foldLevel1",
  "2": "editor.foldLevel2",
  "3": "editor.foldLevel3",
  "4": "editor.foldLevel4",
  "5": "editor.foldLevel5",
  "6": "editor.foldLevel6",
  "7": "editor.foldLevel7",
  "8": "editor.foldAllMarkerRegions",
  "9": "editor.unfoldAllMarkerRegions",
  x: "editor.action.trimTrailingWhitespace",
  d: "editor.action.moveSelectionToNextFindMatch",
  i: "editor.action.showHover",
};

/**
 * The command palette (Ctrl+K): every action of the console in one searchable
 * list, with fuzzy matching, arrow keys and Enter. ":42" jumps to line 42.
 */
export function CommandPalette({
  open,
  onClose,
  commands,
  onGoToLine,
  onEditorAction,
}: {
  open: boolean;
  onClose(): void;
  commands: Command[];
  onGoToLine(line: number): void;
  /** Set when the palette was opened from the editor: completes Monaco's Ctrl+K chords. */
  onEditorAction?(actionId: string): void;
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();

  const shown = useMemo<Command[]>(() => {
    const jump = /^:(\d{1,6})$/.exec(query.trim());
    if (jump) {
      const line = Number(jump[1]);
      return [{ id: "go-to-line", title: `Go to line ${line}`, group: "Editor", hint: "↵", run: () => onGoToLine(line) }];
    }
    return fuzzyFilter(
      commands.filter((c) => !c.disabled),
      query,
      (c) => `${c.title} ${c.group} ${c.keywords ?? ""}`,
    ).slice(0, 60);
  }, [commands, query, onGoToLine]);

  // Focus moves to the search box in the same task that opens the palette,
  // so a fast second key (Ctrl+K Ctrl+C) already lands in the palette.
  useLayoutEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
    const previous = document.activeElement as HTMLElement | null;
    input.current?.focus();
    return () => previous?.focus?.();
  }, [open]);
  useEffect(() => setActive(0), [query]);
  useEffect(() => {
    document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, listId]);

  if (!open) return null;

  const choose = (command: Command | undefined) => {
    if (!command) return;
    onClose();
    // After the palette closes, so focus lands where the command puts it.
    window.setTimeout(() => command.run(), 0);
  };

  let lastGroup = "";
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-3 pt-[12vh]" data-testid="command-palette">
      <div className="absolute inset-0 animate-fade-in bg-[var(--cd-scrim)] backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="k-hud cd-glass relative flex max-h-[70vh] w-full max-w-xl animate-pop-in flex-col overflow-hidden rounded-lg border border-line-strong"
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && !e.altKey) {
            const key = e.key.toLowerCase();
            if (key === "k" && !e.shiftKey) {
              e.preventDefault(); // Ctrl+K again closes the palette
              onClose();
              return;
            }
            const action = onEditorAction && !query ? EDITOR_CHORDS[key] : undefined;
            if (action) {
              e.preventDefault();
              onClose();
              window.setTimeout(() => onEditorAction?.(action), 0);
              return;
            }
          }
          if (e.key === "Escape") {
            e.preventDefault();
            onClose();
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => Math.min(shown.length - 1, i + 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => Math.max(0, i - 1));
          } else if (e.key === "Enter") {
            e.preventDefault();
            choose(shown[active]);
          } else if (e.key === "Tab") {
            e.preventDefault(); // focus stays in the palette
          }
        }}
      >
        <div className="flex items-center gap-2.5 border-b border-line px-3.5">
          <Search size={16} className="text-brand-fg" aria-hidden />
          <input
            ref={input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, a language or an example (:42 goes to line 42)"
            aria-label="Search commands"
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={shown[active] ? `${listId}-${active}` : undefined}
            className="h-12 w-full bg-transparent text-[15px] text-fg outline-none placeholder:text-faint"
            data-testid="command-input"
          />
          <kbd className="rounded border border-line-strong border-b-2 bg-surface px-1.5 py-px font-mono text-[10px] font-semibold text-muted">Esc</kbd>
        </div>
        <ul id={listId} role="listbox" aria-label="Commands" className="cd-scroll min-h-0 flex-1 overflow-y-auto p-1.5">
          {shown.map((command, i) => {
            const header = command.group !== lastGroup && !query.trim() ? command.group : null;
            lastGroup = command.group;
            return (
              <li key={command.id} role="presentation">
                {header && <p className="k-label px-2 pb-1 pt-2.5 !text-[9.5px]">{header}</p>}
                <div
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  data-testid={`command-${command.id}`}
                  onMouseMove={() => setActive(i)}
                  onClick={() => choose(command)}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-md border px-2.5 py-2 text-sm ${
                    i === active ? "border-brand/40 bg-brand/10 text-fg" : "border-transparent text-muted"
                  }`}
                >
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded ${i === active ? "text-brand-fg" : "text-faint"}`} aria-hidden>
                    {command.icon}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{command.title}</span>
                  {command.hint && <span className="shrink-0 font-mono text-[10.5px] text-faint">{command.hint}</span>}
                  {i === active && <CornerDownLeft size={13} className="shrink-0 text-brand-fg" aria-hidden />}
                </div>
              </li>
            );
          })}
          {shown.length === 0 && <li className="px-3 py-6 text-center text-sm text-faint">Nothing matches "{query}"</li>}
        </ul>
        <div className="flex items-center justify-between gap-2 border-t border-line bg-raised px-3 py-2 font-mono text-[10px] text-faint">
          <span>↑↓ move · ↵ run · esc close</span>
          <span>{modKey} K</span>
        </div>
      </div>
    </div>
  );
}
