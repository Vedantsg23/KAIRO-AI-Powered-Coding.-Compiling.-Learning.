// One pointer listener for the whole page. Things that look at the pointer
// (Saarthi's eyes, the entry page's eye) subscribe; updates are batched to
// one per animation frame and never re-render React.
const watchers = new Set<(x: number, y: number) => void>();
let frame = 0;
let last = { x: 0, y: 0 };

function onPointer(e: PointerEvent) {
  last = { x: e.clientX, y: e.clientY };
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    for (const watch of watchers) watch(last.x, last.y);
  });
}

export function watchPointer(fn: (x: number, y: number) => void): () => void {
  if (watchers.size === 0) window.addEventListener("pointermove", onPointer, { passive: true });
  watchers.add(fn);
  return () => {
    watchers.delete(fn);
    if (watchers.size === 0) window.removeEventListener("pointermove", onPointer);
  };
}

/** Direction from an element's centre to the pointer, scaled to -1..1 (full strength beyond `reach` px). */
export function lookAt(element: Element, x: number, y: number, reach = 220, yBias = 0.5): { dx: number; dy: number } {
  const box = element.getBoundingClientRect();
  const dx = x - (box.left + box.width / 2);
  const dy = y - (box.top + box.height * yBias);
  const distance = Math.hypot(dx, dy) || 1;
  const pull = Math.min(1, distance / reach);
  return { dx: (dx / distance) * pull, dy: (dy / distance) * pull };
}
