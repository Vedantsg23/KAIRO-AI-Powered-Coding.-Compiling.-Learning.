import { X } from "lucide-react";
import { useEffect, useRef, type ButtonHTMLAttributes, type KeyboardEvent, type ReactNode } from "react";
import { Scramble } from "../fx/text";

type Variant = "primary" | "ai" | "secondary" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  // Run / build actions: signal green with dark text (7.5:1 in both themes).
  primary:
    "bg-brand text-on-brand font-semibold shadow-[inset_0_-1px_0_rgb(0_0_0/0.12)] hover:brightness-[1.06] hover:glow-brand active:brightness-95 disabled:opacity-50 disabled:hover:brightness-100 disabled:hover:shadow-none",
  // Saarthi actions: reserved cyan.
  ai: "border border-ai/45 bg-ai/10 text-ai-fg hover:border-ai hover:bg-ai/18 disabled:opacity-50",
  secondary: "border border-line-strong bg-surface text-fg hover:border-fg/25 hover:bg-raised disabled:opacity-50",
  ghost: "text-muted hover:bg-fg/6 hover:text-fg disabled:opacity-50",
  danger: "bg-danger text-white hover:brightness-110",
};

export function Button({
  variant = "secondary",
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" | "compact" | "icon" }) {
  const sizing = {
    sm: "h-7 gap-1.5 rounded-md px-2.5 text-xs",
    md: "h-9 gap-2 rounded-md px-3.5 text-sm",
    compact: "h-9 gap-2 rounded-md px-2.5 text-sm sm:px-3", // tighter on phones
    icon: "h-9 w-9 rounded-md",
  }[size];
  return (
    <button
      type="button"
      data-ripple={variant === "primary" || variant === "ai" ? "" : undefined}
      className={`inline-flex shrink-0 items-center justify-center font-medium transition-[background,color,border,box-shadow,filter,transform] duration-200 disabled:cursor-not-allowed ${sizing} ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-line-strong border-b-2 bg-surface px-1.5 py-px font-mono text-[10px] font-semibold text-muted">
      {children}
    </kbd>
  );
}

/** Small monospaced status pill (the design's label-code-caps). */
export function Badge({ children, className = "", title }: { children: ReactNode; className?: string; title?: string }) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded px-1.5 py-px font-mono text-[10.5px] font-semibold tracking-wide uppercase ${className}`}
    >
      {children}
    </span>
  );
}

export function Chip({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-px text-[11px] font-semibold ${className}`}>{children}</span>
  );
}

/** Status dot; `pulse` for live activity. */
export function Dot({ className = "bg-brand", pulse = false }: { className?: string; pulse?: boolean }) {
  return <span aria-hidden className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${className} ${pulse ? "animate-pulse-dot" : ""}`} />;
}

/** Accessible modal shell: focus goes to the first control, Tab stays inside, Esc closes. */
export function Dialog({
  open,
  onClose,
  labelledBy,
  children,
  width = "max-w-lg",
}: {
  open: boolean;
  onClose(): void;
  labelledBy: string;
  children: ReactNode;
  width?: string;
}) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    // querySelector returns the first match in document order, so look for the preferred control first.
    const first =
      panel.current?.querySelector<HTMLElement>("[data-autofocus]") ??
      panel.current?.querySelector<HTMLElement>("button, [href], input, textarea, select");
    first?.focus();
    const onKey = (e: globalThis.KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [open, onClose]);

  const trapTab = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab" || !panel.current) return;
    const items = [...panel.current.querySelectorAll<HTMLElement>("button, [href], input, textarea, select, [tabindex='0']")].filter(
      (el) => !el.hasAttribute("disabled"),
    );
    if (items.length === 0) return;
    const [first, last] = [items[0], items[items.length - 1]];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0 animate-fade-in bg-[var(--cd-scrim)] backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onKeyDown={trapTab}
        className={`cd-glass cd-specular relative flex max-h-[92vh] w-full ${width} animate-pop-in flex-col overflow-hidden rounded-lg border border-line-strong`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 rounded-md p-1.5 text-faint hover:bg-fg/8 hover:text-fg"
        >
          <X size={16} />
        </button>
        {children}
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  art,
  title,
  children,
  className = "",
}: {
  icon?: ReactNode;
  /** A larger illustration shown instead of the icon. */
  art?: ReactNode;
  title: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex h-full min-h-36 flex-col items-center justify-center gap-2 px-6 py-8 text-center ${className}`}>
      {art ?? <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-dashed border-line-strong bg-raised text-faint">{icon}</div>}
      <p className="text-sm font-semibold text-fg">{title}</p>
      {children && <div className="max-w-sm text-xs leading-relaxed text-muted">{children}</div>}
    </div>
  );
}

export interface TabItem<T extends string> {
  id: T;
  label: ReactNode;
  badge?: ReactNode;
  testId?: string;
  tour?: string;
}

/** Accessible tab strip: arrow keys move between tabs, Home/End jump. */
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
  idPrefix,
  className = "",
  right,
}: {
  tabs: TabItem<T>[];
  value: T;
  onChange(id: T): void;
  label: string;
  idPrefix: string;
  className?: string;
  right?: ReactNode;
}) {
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const index = tabs.findIndex((t) => t.id === value);
    let next = -1;
    if (e.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    if (next < 0) return;
    e.preventDefault();
    onChange(tabs[next].id);
    document.getElementById(`${idPrefix}-tab-${tabs[next].id}`)?.focus();
  };
  return (
    <div className={`flex items-center gap-1 border-b border-line bg-raised px-1.5 ${className}`}>
      <div role="tablist" aria-label={label} onKeyDown={onKey} className="flex min-w-0 items-center gap-0.5 overflow-x-auto">
        {tabs.map((t) => {
          const selected = t.id === value;
          return (
            <button
              key={t.id}
              id={`${idPrefix}-tab-${t.id}`}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls={`${idPrefix}-panel`}
              tabIndex={selected ? 0 : -1}
              data-testid={t.testId}
              data-tour={t.tour}
              onClick={() => onChange(t.id)}
              className={`relative flex h-9 shrink-0 items-center gap-1.5 px-2.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.1em] transition-colors ${
                selected ? "text-fg" : "text-faint hover:text-fg"
              }`}
            >
              {t.label}
              {t.badge}
              {selected && <span className="absolute inset-x-2 -bottom-px h-0.5 bg-brand" />}
            </button>
          );
        })}
      </div>
      {right && <div className="ml-auto flex shrink-0 items-center gap-1">{right}</div>}
    </div>
  );
}

/** Mono micro-label (SYSTEM, COMPILER, DIAGNOSTICS...). */
export function Label({ children, className = "", as: Tag = "span", id }: { children: ReactNode; className?: string; as?: "span" | "p" | "h2" | "h3"; id?: string }) {
  return (
    <Tag id={id} className={`k-label ${className}`}>
      {children}
    </Tag>
  );
}

/** A panel's header strip: an index number, a label (it decodes itself on hover) and optional controls on the right. */
export function PanelHead({ index, title, children, className = "" }: { index?: string; title: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <div className={`k-panel-head ${className}`}>
      {index && <span className="k-index">{index}</span>}
      {typeof title === "string" ? <Scramble text={title} className="k-label shrink-0 !text-fg/80" /> : <span className="k-label shrink-0 !text-fg/80">{title}</span>}
      {children && <div className="ml-auto flex min-w-0 items-center gap-1.5">{children}</div>}
    </div>
  );
}
