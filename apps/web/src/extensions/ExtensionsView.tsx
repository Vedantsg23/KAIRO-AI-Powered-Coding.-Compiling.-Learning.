import { ArrowLeft, Blocks, Check, Minus, Plus, Search, Server } from "lucide-react";
import { memo, useMemo, useState } from "react";
import { Spot } from "../fx/pointer";
import { PanelHead } from "../ui/primitives";
import { CATEGORIES, EXTENSIONS, type ExtensionDef, type ExtensionsState } from "./registry";

interface Props {
  extensions: ExtensionsState;
  /** The current language (KAIRO id) and its name, for the "For C" filter. */
  languageId: string;
  languageName: string;
  /** Whether the KAIRO server (sandbox + AI) is reachable. */
  serverUp: boolean;
}

function Toggle({ on, onChange, label, testId }: { on: boolean; onChange(on: boolean): void; label: string; testId?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      data-testid={testId}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!on);
      }}
      className={`relative inline-flex h-[18px] w-8 shrink-0 items-center rounded-full border transition-colors ${
        on ? "border-brand bg-brand" : "border-line-strong bg-fg/8"
      }`}
    >
      <span className={`absolute h-3 w-3 rounded-full shadow transition-transform ${on ? "translate-x-[15px] bg-on-brand" : "translate-x-[2px] bg-muted"}`} />
    </button>
  );
}

function Tile({ ext, size = 34 }: { ext: ExtensionDef; size?: number }) {
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-lg font-mono text-[11px] font-bold text-white shadow-sm"
      style={{ width: size, height: size, background: `linear-gradient(135deg, ${ext.tint}, color-mix(in oklab, ${ext.tint} 60%, black))` }}
    >
      {ext.mark}
    </span>
  );
}

/**
 * The Extensions view: every built-in extension with a switch, a search box,
 * filters and a details page. Choices apply at once and are remembered.
 */
export const ExtensionsView = memo(function ExtensionsView({ extensions, languageId, languageName, serverUp }: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "enabled" | "language">("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return EXTENSIONS.filter((e) => {
      if (filter === "enabled" && !extensions.enabled(e.id)) return false;
      if (filter === "language" && e.languages.length > 0 && !e.languages.includes(languageId)) return false;
      if (!q) return true;
      return `${e.name} ${e.summary} ${e.category} ${e.languages.join(" ")}`.toLowerCase().includes(q);
    });
  }, [query, filter, extensions, languageId]);

  const open = openId ? EXTENSIONS.find((e) => e.id === openId) ?? null : null;
  const enabledCount = EXTENSIONS.filter((e) => extensions.enabled(e.id)).length;

  if (open) {
    const on = extensions.enabled(open.id);
    return (
      <aside className="k-panel h-full" aria-label={`Extension: ${open.name}`} data-testid="extension-details">
        <Spot />
        <PanelHead index="01" title="Extension">
          <button type="button" onClick={() => setOpenId(null)} className="flex items-center gap-1 rounded px-1 text-[11px] text-muted hover:text-fg" data-testid="extension-back">
            <ArrowLeft size={13} /> Back
          </button>
        </PanelHead>
        <div className="cd-scroll min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
          <div className="flex items-start gap-3">
            <Tile ext={open} size={46} />
            <div className="min-w-0">
              <h3 className="text-[14px] font-semibold leading-tight text-fg">{open.name}</h3>
              <p className="mt-0.5 font-mono text-[10px] text-faint">
                KAIRO · v{open.version} · {open.category}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-line bg-raised px-3 py-2">
            <span className="text-[12px] font-medium text-fg">{on ? "Enabled" : "Disabled"}</span>
            <Toggle on={on} onChange={(v) => extensions.set(open.id, v)} label={`${on ? "Disable" : "Enable"} ${open.name}`} testId={`extension-details-toggle`} />
          </div>
          {open.needsServer && !serverUp && (
            <p className="flex items-start gap-1.5 rounded-lg border border-warn/40 bg-warn/10 px-2.5 py-2 text-[11.5px] leading-snug text-warn-fg">
              <Server size={13} className="mt-0.5 shrink-0" /> Needs the KAIRO server, which is not reachable right now.
            </p>
          )}
          <p className="text-[12.5px] leading-relaxed text-muted">{open.summary}</p>
          <ul className="space-y-1.5">
            {open.details.map((d) => (
              <li key={d} className="flex gap-2 text-[12px] leading-snug text-fg">
                <Check size={13} className="mt-0.5 shrink-0 text-brand-fg" aria-hidden />
                <span>{d}</span>
              </li>
            ))}
          </ul>
          {open.shortcut && (
            <p className="text-[11.5px] text-muted">
              Shortcut: <kbd className="rounded border border-line bg-raised px-1.5 py-0.5 font-mono text-[10.5px] text-fg">{open.shortcut}</kbd>
            </p>
          )}
          <div className="flex flex-wrap gap-1">
            {(open.languages.length ? open.languages : ["every language"]).map((l) => (
              <span key={l} className="rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-muted">
                {l}
              </span>
            ))}
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="k-panel h-full" aria-label="Extensions" data-testid="extensions-view">
      <Spot />
      <PanelHead index="01" title="Extensions">
        <span className="font-mono text-[10px] text-faint" data-testid="extensions-count">
          {enabledCount}/{EXTENSIONS.length} on
        </span>
      </PanelHead>
      <div className="space-y-2 border-b border-line p-2">
        <label className="flex items-center gap-1.5 rounded-md border border-line bg-surface px-2 focus-within:border-brand">
          <Search size={13} className="text-faint" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search extensions"
            aria-label="Search extensions"
            data-testid="extensions-search"
            className="h-7 min-w-0 flex-1 bg-transparent text-[12px] text-fg outline-none placeholder:text-faint"
          />
        </label>
        <div className="flex gap-1" role="tablist" aria-label="Filter extensions">
          {(
            [
              ["all", "All"],
              ["enabled", "Enabled"],
              ["language", `For ${languageName || "this file"}`],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={filter === id}
              onClick={() => setFilter(id)}
              className={`truncate rounded-full border px-2 py-0.5 text-[10.5px] font-medium ${
                filter === id ? "border-brand bg-brand/12 text-brand-fg" : "border-line text-muted hover:text-fg"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="cd-scroll min-h-0 flex-1 overflow-y-auto" data-testid="extensions-list">
        {CATEGORIES.map((category) => {
          const items = list.filter((e) => e.category === category);
          if (items.length === 0) return null;
          return (
            <section key={category} aria-label={category}>
              <p className="k-label sticky top-0 z-[1] bg-surface/95 px-3 pb-1 pt-2 backdrop-blur">{category}</p>
              <ul>
                {items.map((e) => {
                  const on = extensions.enabled(e.id);
                  return (
                    <li key={e.id}>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setOpenId(e.id)}
                        onKeyDown={(ev) => {
                          if (ev.key === "Enter" || ev.key === " ") {
                            ev.preventDefault();
                            setOpenId(e.id);
                          }
                        }}
                        data-testid={`extension-${e.id}`}
                        className={`group flex cursor-pointer items-start gap-2.5 px-3 py-2 transition-colors hover:bg-fg/4 ${on ? "" : "opacity-70"}`}
                      >
                        <Tile ext={e} />
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-1 text-[12.5px] font-semibold leading-snug text-fg">
                            {e.name}
                            {e.needsServer && <Server size={11} className="shrink-0 text-faint" aria-label="needs the server" />}
                          </p>
                          <p className="line-clamp-2 text-[11px] leading-snug text-muted">{e.summary}</p>
                        </div>
                        <Toggle on={on} onChange={(v) => extensions.set(e.id, v)} label={`${on ? "Disable" : "Enable"} ${e.name}`} testId={`extension-toggle-${e.id}`} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
        {list.length === 0 && <p className="px-3 py-6 text-center text-[12px] text-faint">No extension matches "{query}".</p>}
        <div className="flex items-center justify-between border-t border-line px-3 py-2.5" data-testid="font-size">
          <span className="flex items-center gap-1.5 text-[12px] text-muted">
            <Blocks size={13} aria-hidden /> Editor font size
          </span>
          <span className="flex items-center gap-1">
            <button type="button" aria-label="Smaller font" onClick={() => extensions.setFontSize(extensions.fontSize - 1)} className="rounded border border-line p-0.5 text-muted hover:text-fg">
              <Minus size={12} />
            </button>
            <span className="w-7 text-center font-mono text-[11.5px] text-fg" data-testid="font-size-value">
              {extensions.fontSize}
            </span>
            <button type="button" aria-label="Larger font" onClick={() => extensions.setFontSize(extensions.fontSize + 1)} className="rounded border border-line p-0.5 text-muted hover:text-fg">
              <Plus size={12} />
            </button>
          </span>
        </div>
      </div>
    </aside>
  );
});
