"""docs/images/readme/sandbox-layers-{dark,light}.svg: defence in depth around a student's program."""
from svgkit import MONO, PALETTES, background, chips_flow, svg_doc, t

W, H = 1280, 668

LAYERS = [
    ("1", "API admission", "before anything is queued", "info",
     ["source ≤ 64 KB", "input ≤ 16 KB", "known language, image installed", "queue ≤ 20, then 503",
      "exact SHA-256 snapshot"]),
    ("2", "Runner policy", "before any container starts", "accent",
     ["shared token", "image allow-list", "ceilings: 60 s · 1024 MB · 256 PIDs", "fixed file names",
      "no LD_* or DYLD_* variables", "argument arrays, never a shell"]),
    ("3", "The container", "every step gets a fresh one", "brand",
     ["network: none", "read-only root", "read-only workspace while running", "user 10001",
      "all capabilities dropped", "no-new-privileges", "tini as PID 1", "seccomp + AppArmor defaults"]),
    ("4", "Limits per step", "enforced by the kernel", "danger",
     ["wall clock", "CPU time", "memory, swap off", "processes", "64 KB output per stream",
      "/tmp 16 MB, noexec", "no core dumps", "256 open files"]),
]


def draw(theme: str) -> str:
    p = PALETTES[theme]
    b = [background(W, H, p, theme, seed=3, stars=40 if theme == "dark" else 0)]
    b.append(t(40, 54, "Four walls around every program", 24, p["fg"], 700))
    b.append(t(40, 80, "Each layer checks again, so one mistake is not enough. Six hostile programs (endless loop, memory "
                       "hog, process bomb, network, workspace write, output flood) are contained in all 15 languages.", 14,
               p["muted"]))

    x, y, w, h = 40, 104, 1200, 540
    inset = 34
    for i, (num, name, when, key, items) in enumerate(LAYERS):
        b.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{26 - i * 3}" fill="{p[key]}" '
                 f'fill-opacity="0.06" stroke="{p[key]}" stroke-opacity="0.55" stroke-width="1.5"/>')
        b.append(f'<circle cx="{x + 30}" cy="{y + 30}" r="13" fill="{p[key]}"/>')
        b.append(t(x + 30, y + 35, num, 13, p["bg0"] if theme == "dark" else "#ffffff", 800, MONO, "middle"))
        b.append(t(x + 52, y + 36, name, 17, p["fg"], 700))
        b.append(t(x + w - 24, y + 36, when, 12.5, p[key + "_fg"] if key + "_fg" in p else p[key], 600, MONO, "end"))
        svg, bottom = chips_flow(x + 24, y + 52, x + w - 24, items, p, key, gap=8, row_h=30, size=12.5)
        b.append(svg)
        band = bottom - y + 10
        x, y, w, h = x + inset, y + band, w - 2 * inset, h - band - inset / 2

    # the program itself, in the middle
    pw, ph = 300, 56
    px, py = 640 - pw / 2, y + (h - ph) / 2
    b.append(f'<rect x="{px}" y="{py}" width="{pw}" height="{ph}" rx="12" fill="{p["raised"]}" stroke="{p["fg"]}" '
             f'stroke-opacity="0.35"/>')
    b.append(t(640, py + 24, "the student's program", 15, p["fg"], 700, anchor="middle"))
    b.append(t(640, py + 43, "main.c · Main.java · main.py · ...", 12, p["muted"], 500, MONO, "middle"))

    return svg_doc(W, H, "\n".join(b), "Four layers of protection around every program",
                   "Nested layers: API admission (size limits, known language, bounded queue, SHA-256 snapshot); "
                   "runner policy (token, image allow-list, limit ceilings, no shell); the container (no network, "
                   "read-only file system, unprivileged user, no capabilities); and kernel-enforced limits on time, "
                   "memory, processes and output.")
