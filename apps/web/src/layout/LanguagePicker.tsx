import { Check, ChevronDown, Search, Zap } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { Language } from "../api/types";
import { LIVE_LANGUAGES } from "../live/support";

export const LANGUAGE_BADGE: Record<string, string> = {
  c: "C",
  cpp: "C++",
  java: "Java",
  python: "Py",
  javascript: "JS",
  typescript: "TS",
  go: "Go",
  rust: "Rs",
  csharp: "C#",
  kotlin: "Kt",
  swift: "Swift",
  php: "PHP",
  ruby: "Rb",
  lua: "Lua",
  bash: "Sh",
  sql: "SQL",
  html: "HTML",
  css: "CSS",
  react: "JSX",
  r: "R",
  asm: "ASM",
  lex: "Lex",
  verilog: "V",
  prolog: "Pro",
  fortran: "F90",
  pascal: "Pas",
  cobol: "COB",
  perl: "Pl",
  lisp: "Lisp",
  scheme: "Scm",
  erlang: "Erl",
  elixir: "Ex",
  nim: "Nim",
  d: "D",
  ada: "Ada",
  tcl: "Tcl",
};

/**
 * The 32 languages verified end to end in the sandbox (tests/integration):
 * the 15 original ones, then the lab and Ubuntu-archive toolchains added with
 * the native and extra images. Swift is prepared but not verified.
 */
export const VERIFIED_LANGUAGES = [
  "c", "cpp", "java", "python", "javascript", "typescript", "go", "rust", "csharp", "kotlin", "php", "ruby", "lua", "bash", "sql",
  "r", "asm", "lex", "verilog", "prolog", "fortran", "pascal", "cobol", "perl", "lisp", "scheme", "erlang", "elixir", "nim", "d", "ada", "tcl",
];

export const LANGUAGE_NAMES: Record<string, string> = {
  c: "C", cpp: "C++", java: "Java", python: "Python", javascript: "JavaScript", typescript: "TypeScript", go: "Go", rust: "Rust",
  csharp: "C#", kotlin: "Kotlin", swift: "Swift", php: "PHP", ruby: "Ruby", lua: "Lua", bash: "Bash", sql: "SQL",
  html: "HTML", css: "CSS", react: "React", r: "R", asm: "Assembly (NASM)", lex: "Lex (Flex)", verilog: "Verilog", prolog: "Prolog", fortran: "Fortran", pascal: "Pascal",
  cobol: "COBOL", perl: "Perl", lisp: "Common Lisp", scheme: "Scheme", erlang: "Erlang", elixir: "Elixir", nim: "Nim", d: "D",
  ada: "Ada", tcl: "Tcl",
};

/** Only languages that can run on this server are offered (not installed = not listed). */
export function offeredLanguages(languages: Language[]): Language[] {
  return languages.filter((l) => l.available !== false && (l.status !== "experimental" || l.available === true));
}

export function LanguageBadge({ id, className = "" }: { id: string; className?: string }) {
  return (
    <span
      className={`inline-flex h-5 min-w-8 items-center justify-center rounded border border-brand/35 bg-brand/10 px-1 font-mono text-[10.5px] font-bold text-brand-fg ${className}`}
    >
      {LANGUAGE_BADGE[id] ?? id.slice(0, 3)}
    </span>
  );
}

/** "GCC 13", "OpenJDK 21": the toolchain in a few characters. */
export function toolchainLabel(l: Language): string {
  return `${l.toolchain.name} ${l.toolchain.declaredVersion}`.trim();
}

interface Props {
  languages: Language[] | null;
  value: string;
  onChange(id: string): void;
}

export function LanguagePicker({ languages, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const button = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const listId = useId();

  const offered = useMemo(() => offeredLanguages(languages ?? []), [languages]);
  const unavailable = useMemo(() => (languages ?? []).filter((l) => !offered.includes(l)), [languages, offered]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return offered;
    return offered.filter(
      (l) =>
        l.displayName.toLowerCase().includes(q) ||
        l.id.includes(q) ||
        (LANGUAGE_BADGE[l.id] ?? "").toLowerCase() === q ||
        l.toolchain.name.toLowerCase().includes(q),
    );
  }, [offered, query]);
  const current = languages?.find((l) => l.id === value) ?? null;

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(Math.max(0, offered.findIndex((l) => l.id === value)));
    requestAnimationFrame(() => search.current?.focus());
    const onDown = (e: MouseEvent) => {
      if (!popup.current?.contains(e.target as Node) && !button.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open, offered, value]);

  useEffect(() => setActive(0), [query]);
  useEffect(() => {
    document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, listId]);

  const choose = (id: string) => {
    onChange(id);
    setOpen(false);
    button.current?.focus();
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(shown.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(shown.length - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (shown[active]) choose(shown[active].id);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      button.current?.focus();
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div className="relative" data-tour="language">
      <button
        ref={button}
        type="button"
        data-testid="language-picker"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={current ? `Language: ${current.displayName}. Change language` : "Choose a language"}
        disabled={!languages}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={`group flex h-9 items-center gap-2 rounded-md border bg-surface pl-2 pr-2 text-sm font-semibold text-fg transition-colors hover:border-brand/60 disabled:opacity-60 ${
          open ? "border-brand/70" : "border-line-strong"
        }`}
      >
        <span className="k-label hidden !text-[9.5px] xl:inline">Language</span>
        {current ? <LanguageBadge id={current.id} /> : <span className="h-5 w-8 animate-pulse rounded bg-raised" />}
        <span className="hidden sm:inline">{current?.displayName ?? "Loading..."}</span>
        {current && <span className="hidden font-mono text-[10.5px] font-medium text-faint lg:inline">{toolchainLabel(current)}</span>}
        {current && (
          <span className="hidden items-center gap-1 font-mono text-[9.5px] font-bold tracking-wider text-brand-fg 2xl:flex" aria-hidden>
            <span className="h-1.5 w-1.5 rounded-full bg-brand" /> READY
          </span>
        )}
        <ChevronDown size={14} className={`text-faint transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          ref={popup}
          className="cd-glass cd-specular absolute left-0 top-11 z-40 w-[min(25rem,calc(100vw-1.5rem))] animate-pop-in overflow-hidden rounded-lg border border-line-strong"
          onKeyDown={onKey}
        >
          <div className="flex items-center justify-between gap-2 border-b border-line bg-raised px-3 py-2">
            <span className="k-label">Language runtimes</span>
            <span className="font-mono text-[10.5px] font-semibold text-brand-fg" data-testid="language-count">
              {offered.length}/{languages?.length ?? 0} READY
            </span>
          </div>
          <div className="flex items-center gap-2 border-b border-line px-3">
            <Search size={14} className="text-faint" />
            <input
              ref={search}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search languages, compilers..."
              aria-label="Search languages"
              aria-controls={listId}
              aria-activedescendant={shown[active] ? `${listId}-${active}` : undefined}
              className="h-10 w-full bg-transparent text-sm text-fg outline-none placeholder:text-faint"
              data-testid="language-search"
            />
          </div>
          <div className="cd-scroll max-h-[min(60vh,28rem)] overflow-y-auto p-1.5">
            <ul id={listId} role="listbox" aria-label="Languages">
              {shown.map((l, i) => {
                const selected = l.id === value;
                return (
                  <li
                    key={l.id}
                    id={`${listId}-${i}`}
                    role="option"
                    aria-selected={selected}
                    data-testid={`language-option-${l.id}`}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => choose(l.id)}
                    className={`flex cursor-pointer items-center gap-2.5 rounded-md border px-2 py-1.5 ${
                      i === active ? "border-brand/40 bg-brand/8" : "border-transparent"
                    }`}
                  >
                    <LanguageBadge id={l.id} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-fg">{l.displayName}</span>
                      <span className="block font-mono text-[10.5px] text-faint">{toolchainLabel(l)}</span>
                    </span>
                    {l.status === "experimental" && (
                      <span className="rounded bg-warn/15 px-1.5 py-px font-mono text-[9.5px] font-bold uppercase tracking-wider text-warn-fg">beta</span>
                    )}
                    {LIVE_LANGUAGES.has(l.id) && (
                      <span title="Live analyzer: syntax checked while you type" className="text-brand-fg">
                        <Zap size={12} />
                      </span>
                    )}
                    <span className="flex w-16 items-center justify-end gap-1 font-mono text-[9.5px] font-bold tracking-wider text-brand-fg">
                      <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden />
                      READY
                    </span>
                    <Check size={14} className={selected ? "text-brand-fg" : "invisible"} />
                  </li>
                );
              })}
              {shown.length === 0 && <li className="px-3 py-4 text-center text-xs text-faint">No language matches "{query}"</li>}
            </ul>
            {unavailable.length > 0 && !query && (
              <>
                <p className="k-label mt-2 border-t border-line px-2 pb-1 pt-2.5">Not installed on this server</p>
                <ul aria-label="Not installed on this server">
                  {unavailable.map((l) => (
                    <li
                      key={l.id}
                      aria-disabled="true"
                      data-testid={`language-unavailable-${l.id}`}
                      title="Its sandbox image is not built on this server, so it cannot run here"
                      className="flex items-center gap-2.5 rounded-md px-2 py-1.5 opacity-60"
                    >
                      <LanguageBadge id={l.id} className="!border-line-strong !bg-raised !text-faint" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-muted">{l.displayName}</span>
                        <span className="block font-mono text-[10.5px] text-faint">{toolchainLabel(l)}</span>
                      </span>
                      <span className="flex items-center gap-1 font-mono text-[9.5px] font-bold tracking-wider text-faint">
                        <span className="h-1.5 w-1.5 rounded-full border border-faint" aria-hidden />
                        OFFLINE
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-line bg-raised px-3 py-2 font-mono text-[10px] text-faint">
            <span className="flex items-center gap-1">
              <Zap size={11} className="text-brand-fg" /> live analyzer
            </span>
            <span>↑↓ move · ↵ select · esc close</span>
          </div>
        </div>
      )}
    </div>
  );
}
