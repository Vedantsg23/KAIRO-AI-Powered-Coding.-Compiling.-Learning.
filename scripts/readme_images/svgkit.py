"""Small helpers shared by the README diagram generators."""
from __future__ import annotations

import html

SANS = "'Geist', 'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif"
MONO = "'JetBrains Mono', 'Cascadia Code', 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace"

# The app's KAIRO palette (apps/web/src/index.css), per theme: graphite dark
# and the white "signal" light theme; green = build/success, cyan = Saarthi.
PALETTES = {
    "dark": {
        "bg0": "#070707", "bg1": "#101211", "surface": "#111111", "raised": "#171717",
        "sunken": "#0c0c0c", "line": "#2e2e2e", "line_soft": "#1f1f1f", "fg": "#e8e8e8",
        "muted": "#a8a8a8", "faint": "#8a8a8a", "brand": "#22c55e", "brand_fg": "#4ade80",
        "ai": "#22d3ee", "ai_fg": "#67e8f9", "accent": "#f59e0b", "accent_fg": "#fbbf24",
        "danger": "#ef4444", "danger_fg": "#f87171", "info": "#3b82f6", "info_fg": "#60a5fa",
        "ok": "#22c55e", "grid": "rgba(255,255,255,0.04)", "shadow": "rgba(0,0,0,0.5)",
    },
    "light": {
        "bg0": "#f3f6f4", "bg1": "#fbfcfb", "surface": "#ffffff", "raised": "#f7f9f8",
        "sunken": "#f0f4f1", "line": "#c9d3cc", "line_soft": "#e2e8e4", "fg": "#0b1510",
        "muted": "#435049", "faint": "#5f6b64", "brand": "#16a34a", "brand_fg": "#137a3a",
        "ai": "#0891b2", "ai_fg": "#0b7185", "accent": "#d97706", "accent_fg": "#a14e07",
        "danger": "#dc2626", "danger_fg": "#b91c1c", "info": "#2563eb", "info_fg": "#1d4ed8",
        "ok": "#16a34a", "grid": "rgba(11,21,16,0.05)", "shadow": "rgba(9,30,18,0.12)",
    },
}


def esc(s: str) -> str:
    return html.escape(s, quote=True)


def text_width(s: str, size: float, mono: bool = False, bold: bool = False) -> float:
    """Rough advance width, good enough to size pills and wrap labels."""
    per = 0.61 if mono else (0.56 if bold else 0.53)
    return len(s) * size * per


def t(x, y, s, size=13, fill="#000", weight=400, family=SANS, anchor="start", ls=0.0, extra=""):
    spacing = f' letter-spacing="{ls}"' if ls else ""
    return (f'<text x="{x:.1f}" y="{y:.1f}" font-family="{family}" font-size="{size}" font-weight="{weight}" '
            f'fill="{fill}" text-anchor="{anchor}"{spacing}{extra}>{esc(s)}</text>')


def arrow_markers(p: dict, names=("brand", "accent", "ai", "info", "faint", "danger")) -> str:
    out = []
    for n in names:
        out.append(
            f'<marker id="ah-{n}" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" '
            f'orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="{p[n]}"/></marker>')
    return "".join(out)


def arrow(x1, y1, x2, y2, color_key, p, dashed=False, width=2.2, both=False):
    dash = ' stroke-dasharray="7 6"' if dashed else ""
    start = f' marker-start="url(#ah-{color_key})"' if both else ""
    return (f'<path d="M{x1:.1f},{y1:.1f} L{x2:.1f},{y2:.1f}" stroke="{p[color_key]}" stroke-width="{width}" '
            f'fill="none"{dash} marker-end="url(#ah-{color_key})"{start}/>')


def pill(cx, cy, label, p, color_key="muted", size=12, mono=False, fill=None, stroke=None):
    w = text_width(label, size, mono) + 22
    h = size + 12
    fam = MONO if mono else SANS
    return (f'<rect x="{cx - w / 2:.1f}" y="{cy - h / 2:.1f}" width="{w:.1f}" height="{h}" rx="{h / 2}" '
            f'fill="{fill or p["surface"]}" stroke="{stroke or p["line"]}"/>'
            + t(cx, cy + size * 0.36, label, size, p[color_key], 600, fam, "middle"))


def chip(x, y, label, p, color_key, size=12.0):
    """A small rounded tag; returns (svg, width)."""
    w = text_width(label, size) + 20
    h = 22
    return (f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h}" rx="11" fill="{p[color_key]}" '
            f'fill-opacity="0.12" stroke="{p[color_key]}" stroke-opacity="0.45"/>'
            + t(x + w / 2, y + 15, label, size, p["fg"], 500, SANS, "middle")), w


def chips_flow(x0, y0, x_max, labels, p, color_key, gap=8, row_h=28, size=12.0):
    out, x, y = [], x0, y0
    for label in labels:
        w = text_width(label, size) + 20
        if x + w > x_max and x > x0:
            x, y = x0, y + row_h
        svg, w = chip(x, y, label, p, color_key, size)
        out.append(svg)
        x += w + gap
    return "".join(out), y + row_h


def card(x, y, w, h, title, sub, bullets, p, dot="brand", title_size=16.5, bullet_size=13.2):
    out = [
        f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="14" fill="{p["surface"]}" stroke="{p["line"]}"/>',
        f'<circle cx="{x + 20}" cy="{y + 24}" r="5.5" fill="{p[dot]}"/>',
        f'<circle cx="{x + 20}" cy="{y + 24}" r="10" fill="{p[dot]}" fill-opacity="0.18"/>',
        t(x + 36, y + 30, title, title_size, p["fg"], 700),
    ]
    if sub:
        out.append(t(x + 20, y + 52, sub, 11.5, p["faint"], 500, MONO))
    by = y + (74 if sub else 56)
    for b in bullets:
        out.append(f'<circle cx="{x + 23}" cy="{by - 4.5}" r="2.2" fill="{p[dot]}"/>')
        out.append(t(x + 33, by, b, bullet_size, p["muted"]))
        by += bullet_size + 7
    return "".join(out)


def zone(x, y, w, h, label, p, color_key):
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="20" fill="{p[color_key]}" fill-opacity="0.055" '
            f'stroke="{p[color_key]}" stroke-opacity="0.45" stroke-dasharray="6 6"/>'
            + t(x + w - 20, y + 26, label, 11.5, p[color_key + "_fg"] if color_key + "_fg" in p else p[color_key],
                700, MONO, "end", ls=1.6))


def background(w, h, p, theme, seed=7, stars=0, grid=32):
    """The console canvas: a soft gradient and a fine grid (`seed` and `stars` are kept for old callers)."""
    lines = [f'<path d="M{x} 0 V{h}" stroke="{p["grid"]}"/>' for x in range(grid, w, grid)]
    lines += [f'<path d="M0 {y} H{w}" stroke="{p["grid"]}"/>' for y in range(grid, h, grid)]
    return "".join([
        (f'<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{p["bg1"]}"/>'
         f'<stop offset="1" stop-color="{p["bg0"]}"/></linearGradient>'
         f'<clipPath id="bgclip"><rect width="{w}" height="{h}" rx="24"/></clipPath></defs>'),
        f'<rect width="{w}" height="{h}" rx="24" fill="url(#bg)"/>',
        f'<g clip-path="url(#bgclip)">{"".join(lines)}</g>',
        f'<rect x="0.5" y="0.5" width="{w - 1}" height="{h - 1}" rx="23.5" fill="none" stroke="{p["line_soft"]}"/>',
    ])


def svg_doc(w, h, body, title, desc, style=""):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img" '
            f'aria-labelledby="title desc">\n<title id="title">{esc(title)}</title>\n<desc id="desc">{esc(desc)}</desc>\n'
            + (f"<style>{style}</style>\n" if style else "") + body + "\n</svg>\n")
