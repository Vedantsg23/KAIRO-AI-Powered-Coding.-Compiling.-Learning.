import { useCallback, useRef, useState, type ReactNode } from "react";
import { load, save } from "../lib/storage";

/**
 * Two panes with a draggable divider: side by side ("horizontal") or stacked
 * ("vertical"). Keyboard: focus the divider and use the arrow keys. The
 * ratio (share of the first pane) is remembered per browser.
 */
export function SplitPane({
  first,
  second,
  storageKey,
  orientation = "horizontal",
  initial = 0.6,
  min = 0.25,
  max = 0.8,
  label = "Resize panels",
}: {
  first: ReactNode;
  second: ReactNode;
  storageKey: string;
  orientation?: "horizontal" | "vertical";
  initial?: number;
  min?: number;
  max?: number;
  label?: string;
}) {
  const [ratio, setRatio] = useState(() => clamp(load(storageKey, initial), min, max));
  const container = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const horizontal = orientation === "horizontal";

  const update = useCallback(
    (value: number) => {
      const next = clamp(value, min, max);
      setRatio(next);
      save(storageKey, next);
    },
    [min, max, storageKey],
  );

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging || !container.current) return;
    const box = container.current.getBoundingClientRect();
    update(horizontal ? (e.clientX - box.left) / box.width : (e.clientY - box.top) / box.height);
  };

  const size = `${ratio * 100}%`;
  return (
    <div
      ref={container}
      className={`flex h-full min-h-0 w-full min-w-0 ${horizontal ? "flex-row" : "flex-col"} ${dragging ? "select-none" : ""}`}
    >
      <div style={horizontal ? { width: size } : { height: size }} className="min-h-0 min-w-0 shrink-0">
        {first}
      </div>
      <div
        role="separator"
        aria-orientation={horizontal ? "vertical" : "horizontal"}
        aria-label={label}
        aria-valuenow={Math.round(ratio * 100)}
        aria-valuemin={Math.round(min * 100)}
        aria-valuemax={Math.round(max * 100)}
        tabIndex={0}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          setDragging(true);
        }}
        onPointerMove={onPointerMove}
        onPointerUp={() => setDragging(false)}
        onKeyDown={(e) => {
          const back = horizontal ? "ArrowLeft" : "ArrowUp";
          const forward = horizontal ? "ArrowRight" : "ArrowDown";
          if (e.key === back) update(ratio - 0.02);
          if (e.key === forward) update(ratio + 0.02);
        }}
        className={`group relative z-10 shrink-0 ${horizontal ? "w-2 cursor-col-resize" : "h-2 cursor-row-resize"}`}
      >
        <div
          className={`absolute rounded-full transition-colors ${
            horizontal ? "inset-y-6 left-1/2 w-0.5 -translate-x-1/2" : "inset-x-6 top-1/2 h-0.5 -translate-y-1/2"
          } ${dragging ? "bg-brand" : "bg-transparent group-hover:bg-brand/60 group-focus-visible:bg-brand"}`}
        />
      </div>
      <div className="min-h-0 min-w-0 flex-1">{second}</div>
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}
