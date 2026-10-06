"""docs/images/readme/architecture-{dark,light}.svg: the system at a glance."""
from svgkit import MONO, PALETTES, arrow, arrow_markers, background, card, chips_flow, pill, svg_doc, t, zone

W, H = 1280, 1060


def draw(theme: str) -> str:
    p = PALETTES[theme]
    b = [background(W, H, p, theme, seed=11, stars=60 if theme == "dark" else 0)]
    b.append(f"<defs>{arrow_markers(p)}</defs>")

    # Header and legend
    b.append(t(40, 56, "How KAIRO fits together", 26, p["fg"], 700))
    b.append(t(40, 82, "Three processes and one rule: student code only ever runs inside a locked-down, "
                       "throwaway container.", 14, p["muted"]))
    lx = 902
    b.append(arrow(lx, 42, lx + 40, 42, "brand", p))
    b.append(t(lx + 52, 46.5, "request and response", 12.5, p["muted"]))
    b.append(arrow(lx, 64, lx + 40, 64, "accent", p))
    b.append(t(lx + 52, 68.5, "live snapshots (WebSocket)", 12.5, p["muted"]))
    b.append(arrow(lx, 86, lx + 40, 86, "ai", p, dashed=True))
    b.append(t(lx + 52, 90.5, "only when a student asks Saarthi", 12.5, p["muted"]))

    # Tier 1: the browser
    b.append(zone(40, 112, 940, 178, "STUDENT'S BROWSER", p, "brand"))
    b.append(card(60, 152, 410, 122, "Web app", "React 18 · TypeScript · Vite · Tailwind",
                  ["Monaco editor, pipeline, diagnostics, terminal",
                   "Saarthi panel: explain, suggest a fix, verify",
                   "Profiles, XP, badges, streaks; two themes"], p, "brand"))
    b.append(card(486, 152, 262, 122, "Live check", "Web Worker · WebAssembly",
                  ["Tree-sitter, 14 grammars", "Quick fixes and concepts", "Never contacts a server"], p, "brand"))
    b.append(card(764, 152, 196, 122, "Browser storage", "per profile",
                  ["Guest profile, XP", "Drafts per language", "Theme and settings"], p, "brand"))
    b.append(card(1020, 112, 220, 178, "Ways to run it", "same containers everywhere",
                  ["Docker Compose", "GitHub Codespaces", "make runner / api / web", "CI builds every image"],
                  p, "faint"))

    # Browser <-> API
    b.append(arrow(140, 278, 140, 410, "brand", p))
    b.append(arrow(300, 410, 300, 278, "accent", p))
    b.append(arrow(460, 278, 460, 410, "ai", p, dashed=True))
    b.append(pill(140, 331, "POST · GET", p, "fg", mono=True))
    b.append(pill(300, 331, "live snapshots", p, "fg"))
    b.append(pill(460, 331, "/assistant/* on a click", p, "fg", mono=True))

    # Tier 2: the API
    b.append(zone(40, 372, 940, 316, "API SERVER (FASTAPI) · NEVER RUNS CODE", p, "ai"))
    b.append(card(60, 414, 440, 112, "REST + WebSocket API", "/api/v1 · OpenAPI docs at /docs",
                  ["executions · languages · health", "assistant: explain · fix · verify · ask"], p, "info"))
    b.append(card(516, 414, 444, 112, "Saarthi service", "the AI guide, on the server",
                  ["Evidence from one stored run, never from the browser",
                   "Checked answers; a fix is verified by a real run"], p, "ai"))
    b.append(card(60, 542, 290, 130, "Execution service", "admission control",
                  ["64 KB source cap, SHA-256", "Queue of 20, 4 dispatchers", "A snapshot per state change"],
                  p, "accent"))
    b.append(card(366, 542, 290, 130, "Language profiles", "16 TOML files, no code",
                  ["Commands as argument arrays", "Limits, error grammars, codes", "One image per toolchain"],
                  p, "faint"))
    b.append(card(672, 542, 288, 130, "Diagnostics", "one format for 15 toolchains",
                  ["Match lines and whole blocks", "Classify into stable codes", "A crash never looks like OK"],
                  p, "danger"))

    # Side: AI provider and state
    b.append(card(1020, 414, 220, 112, "AI provider", "optional",
                  ["Claude API, or any", "OpenAI-compatible server"], p, "ai"))
    b.append(arrow(962, 470, 1018, 470, "ai", p, dashed=True))
    b.append(t(990, 461, "HTTPS", 10.5, p["ai_fg"], 700, MONO, "middle"))
    b.append(card(1020, 542, 220, 130, "In memory", "for now",
                  ["Up to 500 executions", "Saarthi's pending fixes", "Database: next milestone"], p, "faint"))

    # API <-> runner
    b.append(arrow(130, 674, 130, 810, "brand", p))
    b.append(arrow(290, 810, 290, 674, "accent", p))
    b.append(pill(130, 729, "JobSpec + token", p, "fg"))
    b.append(pill(290, 729, "progress, result", p, "fg"))

    # Tier 3: the runner and the sandboxes
    b.append(zone(40, 770, 940, 266, "RUNNER · THE ONLY PROCESS WITH DOCKER ACCESS", p, "info"))
    b.append(card(60, 812, 300, 208, "Runner", "internal HTTP · NDJSON events",
                  ["Re-checks every job: image", "allow-list, limit ceilings,", "file names, environment",
                   "Removes everything after", "Reaps any leftovers"], p, "info"))
    b.append(arrow(362, 916, 386, 916, "info", p))
    b.append(card(388, 812, 140, 208, "Docker", "daemon", ["via its socket", "one fresh", "container", "per step"],
                  p, "info"))
    b.append(arrow(530, 916, 546, 916, "info", p))

    # Sandbox card with its two steps and the rules every container gets
    x, y, w, h = 548, 812, 412, 208
    b.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="14" fill="{p["surface"]}" stroke="{p["brand"]}" '
             f'stroke-opacity="0.7"/>')
    b.append(f'<circle cx="{x + 20}" cy="{y + 24}" r="5.5" fill="{p["brand"]}"/>'
             f'<circle cx="{x + 20}" cy="{y + 24}" r="10" fill="{p["brand"]}" fill-opacity="0.18"/>')
    b.append(t(x + 36, y + 30, "Sandbox containers", 16.5, p["fg"], 700))
    b.append(t(x + 20, y + 52, "9 images · a fresh container per step", 11.5, p["faint"], 500, MONO))
    for bx, label in ((x + 20, "compile / check"), (x + 226, "run")):
        b.append(f'<rect x="{bx}" y="{y + 64}" width="166" height="34" rx="9" fill="{p["raised"]}" '
                 f'stroke="{p["line"]}"/>')
        b.append(t(bx + 83, y + 86, label, 13, p["fg"], 600, MONO, "middle"))
    b.append(arrow(x + 188, y + 81, x + 224, y + 81, "brand", p))
    chips, _ = chips_flow(x + 20, y + 108, x + w - 14,
                          ["no network", "read-only root", "user 10001", "no capabilities",
                           "64 KB output", "time · CPU · memory · PIDs"], p, "brand", gap=6, row_h=26, size=11.5)
    b.append(chips)

    b.append(card(1020, 770, 220, 266, "Networks", "Docker Compose",
                  ["internal: API and runner", "only, no internet", "egress: API to the AI", "provider only",
                   "sandboxes: no network", "app on 127.0.0.1:8080"], p, "brand"))

    return svg_doc(W, H, "\n".join(b), "KAIRO architecture",
                   "The browser (web app, live check worker, storage) talks to the FastAPI server over HTTP and a "
                   "WebSocket. The API never runs code: it sends job specs to the runner, the only process with "
                   "Docker access, which starts a fresh hardened container per step. Saarthi calls the AI provider "
                   "only when a student asks.")
