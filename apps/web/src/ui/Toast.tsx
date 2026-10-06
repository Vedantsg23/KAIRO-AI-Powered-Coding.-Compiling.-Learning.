import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type Tone = "info" | "success" | "error";

interface ToastItem {
  id: number;
  tone: Tone;
  title: string;
  body?: string;
  action?: { label: string; onClick(): void };
}

interface ToastApi {
  show(toast: Omit<ToastItem, "id">, timeoutMs?: number): void;
}

const ToastContext = createContext<ToastApi>({ show: () => undefined });

export const useToast = () => useContext(ToastContext);

const ICONS = {
  info: <Info size={16} className="text-info-fg" />,
  success: <CheckCircle2 size={16} className="text-brand-fg" />,
  error: <AlertTriangle size={16} className="text-danger-fg" />,
};

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const dismiss = useCallback((id: number) => setToasts((all) => all.filter((t) => t.id !== id)), []);
  const show = useCallback(
    (toast: Omit<ToastItem, "id">, timeoutMs = 6000) => {
      const id = nextId++;
      setToasts((all) => [...all.slice(-2), { ...toast, id }]);
      window.setTimeout(() => dismiss(id), timeoutMs);
    },
    [dismiss],
  );
  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-10 right-4 z-[60] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className="cd-glass pointer-events-auto flex animate-slide-up gap-3 rounded-lg border border-line-strong p-3"
          >
            <div className="mt-0.5">{ICONS[t.tone]}</div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-fg">{t.title}</p>
              {t.body && <p className="mt-0.5 text-xs text-muted">{t.body}</p>}
              {t.action && (
                <button
                  type="button"
                  className="mt-1.5 text-xs font-semibold text-brand-fg hover:underline"
                  onClick={() => {
                    t.action?.onClick();
                    dismiss(t.id);
                  }}
                >
                  {t.action.label}
                </button>
              )}
            </div>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => dismiss(t.id)}
              className="self-start rounded p-0.5 text-faint hover:text-fg"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
