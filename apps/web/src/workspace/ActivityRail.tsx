import { Blocks, Files, NotebookPen } from "lucide-react";
import { memo } from "react";

export type SideView = "explorer" | "extensions";

interface Props {
  view: SideView;
  /** Whether the side panel is open. */
  open: boolean;
  onSelect(view: SideView): void;
  /** Number of enabled extensions, shown on the icon. */
  extensionsOn: number;
  /** Open or close the Python notebook (in place of the editor). */
  onNotebook?(): void;
  notebookOpen?: boolean;
}

const ITEMS: { id: SideView; label: string; icon: typeof Files; shortcut: string }[] = [
  { id: "explorer", label: "Explorer", icon: Files, shortcut: "Ctrl+Shift+E" },
  { id: "extensions", label: "Extensions", icon: Blocks, shortcut: "Ctrl+Shift+X" },
];

const itemClass = (active: boolean) =>
  `relative grid h-9 w-9 place-items-center rounded-lg transition-colors ${active ? "bg-brand/14 text-brand-fg" : "text-faint hover:bg-fg/6 hover:text-fg"}`;

/** The thin bar on the far left: switch the side panel between the explorer and extensions (click again to hide it), and open the notebook. */
export const ActivityRail = memo(function ActivityRail({ view, open, onSelect, extensionsOn, onNotebook, notebookOpen = false }: Props) {
  return (
    <nav aria-label="Side panels" className="k-panel mr-2 flex w-11 shrink-0 flex-col items-center gap-1 py-2" data-testid="activity-rail">
      {ITEMS.map(({ id, label, icon: Icon, shortcut }) => {
        const active = open && view === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            aria-pressed={active}
            aria-label={`${label} (${shortcut})`}
            title={`${label} (${shortcut})`}
            data-testid={`rail-${id}`}
            className={itemClass(active)}
          >
            {active && <span className="absolute -left-2 h-5 w-[3px] rounded-r bg-brand" aria-hidden />}
            <Icon size={18} strokeWidth={1.8} />
            {id === "extensions" && extensionsOn > 0 && (
              <span className="absolute -right-0.5 -top-0.5 min-w-[15px] rounded-full bg-brand px-1 font-mono text-[8.5px] font-bold leading-[15px] text-on-brand">
                {extensionsOn}
              </span>
            )}
          </button>
        );
      })}
      {onNotebook && (
        <>
          <span className="my-1 h-px w-6 bg-line" aria-hidden />
          <button
            type="button"
            onClick={onNotebook}
            aria-pressed={notebookOpen}
            aria-label={notebookOpen ? "Close the notebook" : "Python notebook (Jupyter-style)"}
            title={notebookOpen ? "Back to the code editor" : "Python notebook: cells, outputs and its own terminal"}
            data-testid="rail-notebook"
            className={itemClass(notebookOpen)}
          >
            {notebookOpen && <span className="absolute -left-2 h-5 w-[3px] rounded-r bg-brand" aria-hidden />}
            <NotebookPen size={18} strokeWidth={1.8} />
          </button>
        </>
      )}
    </nav>
  );
});
