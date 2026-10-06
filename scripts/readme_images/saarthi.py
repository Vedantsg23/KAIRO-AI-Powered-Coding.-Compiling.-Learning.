"""docs/images/readme/saarthi-loop-{dark,light}.svg: explain, fix, approve, verify (animated)."""
from svgkit import MONO, PALETTES, arrow, arrow_markers, background, chips_flow, pill, svg_doc, t

W, H = 1280, 470
LOOP = 8.0

STEPS = [
    ("Run", "brand", ["Real compiler output", "becomes problems with", "stable codes and lines."]),
    ("Explain", "ai", ["From that run's evidence,", "built on the server: code,", "problems, input, output."]),
    ("Suggest a fix", "ai", ["The smallest whole-line", "patch, shown as a diff,", "tied to the exact code."]),
    ("You decide", "accent", ["Nothing changes until", "you press Apply. One", "Ctrl+Z undoes it."]),
    ("Verify by running", "ok", ["The patched code runs in", "the sandbox. The verdict", "comes from that run."]),
]


def draw(theme: str) -> str:
    p = PALETTES[theme]
    b = [background(W, H, p, theme, seed=9, stars=40 if theme == "dark" else 0)]
    b.append(f"<defs>{arrow_markers(p)}</defs>")
    slot = LOOP / len(STEPS)
    css = []
    for i in range(len(STEPS)):
        a, z = i * slot / LOOP * 100, (i + 1) * slot / LOOP * 100
        css.append(f"@keyframes on{i} {{ 0% {{ opacity: 0; }} {max(a - 0.01, 0):.2f}% {{ opacity: 0; }} {a + 3:.2f}% "
                   f"{{ opacity: 1; }} {z - 1:.2f}% {{ opacity: 1; }} {min(z + 3, 100):.2f}% {{ opacity: 0; }} "
                   f"100% {{ opacity: 0; }} }} .on{i} {{ animation: on{i} {LOOP}s ease-in-out infinite; }}")
    style = " ".join(css) + (" @media (prefers-reduced-motion: reduce) { [class^='on'] { animation: none !important; "
                             "opacity: 0 !important; } }")

    b.append(t(40, 54, "Saarthi: explain, fix, and prove it", 24, p["fg"], 700))
    b.append(t(40, 80, "The AI proposes, the student decides, and a real run in the sandbox gives the verdict. "
                       "The model is never asked whether its own fix worked.", 14, p["muted"]))

    x0, y0, cw, ch, gap = 40, 118, 208, 178, 40
    for i, (title, key, lines) in enumerate(STEPS):
        x = x0 + i * (cw + gap)
        color = p[key]
        b.append(f'<rect x="{x}" y="{y0}" width="{cw}" height="{ch}" rx="16" fill="{p["surface"]}" stroke="{p["line"]}"/>')
        b.append(f'<rect class="on{i}" x="{x - 3}" y="{y0 - 3}" width="{cw + 6}" height="{ch + 6}" rx="18" '
                 f'fill="{color}" fill-opacity="0.08" stroke="{color}" stroke-width="2.5" opacity="0"/>')
        b.append(f'<circle cx="{x + 30}" cy="{y0 + 32}" r="15" fill="{color}" fill-opacity="0.18" stroke="{color}"/>')
        b.append(t(x + 30, y0 + 37, str(i + 1), 14, p["fg"], 800, MONO, "middle"))
        b.append(t(x + 54, y0 + 38, title, 16.5, p["fg"], 700))
        for j, line in enumerate(lines):
            b.append(t(x + 20, y0 + 76 + j * 21, line, 13.2, p["muted"]))
        if i == 4:
            b.append(t(x + 20, y0 + 150, "fixed · improved ·", 11.5, p["ok"], 700, MONO))
            b.append(t(x + 20, y0 + 166, "not fixed · different code", 11.5, p["faint"], 600, MONO))
        if i == 3:
            b.append(t(x + 20, y0 + 158, "the human gate", 11.5, p["accent_fg"], 700, MONO))
        if i < len(STEPS) - 1:
            b.append(arrow(x + cw + 4, y0 + ch / 2, x + cw + gap - 4, y0 + ch / 2, "faint", p))

    # the way back
    yb = y0 + ch + 44
    xl, xr = x0 + cw / 2, x0 + 4 * (cw + gap) + cw / 2
    b.append(f'<path d="M{xr},{y0 + ch + 4} V{yb - 14} Q{xr},{yb} {xr - 14},{yb} H{xl + 14} Q{xl},{yb} {xl},{yb - 14} '
             f'V{y0 + ch + 8}" fill="none" stroke="{p["faint"]}" stroke-width="2" stroke-dasharray="7 6" '
             f'marker-end="url(#ah-faint)"/>')
    b.append(pill(640, yb, "not fixed? explain the new problem, or edit and run again", p, "muted", size=12.5))

    # the guards
    gy = yb + 52
    b.append(t(40, gy + 15, "GUARDS", 11.5, p["faint"], 700, MONO, ls=1.6))
    chips, _ = chips_flow(118, gy, 1240,
                          ["grounded in one stored run", "409 if the code changed since the run",
                           "answers checked against a schema", "your code is data, never instructions",
                           "keys stay on the server", "requests only on a button press"], p, "ai", gap=8, size=12.5)
    b.append(chips)

    return svg_doc(W, H, "\n".join(b), "Saarthi's explain, fix and verify loop",
                   "Five steps: a run produces problems; Saarthi explains one from that run's evidence; it proposes "
                   "the smallest patch as a diff; nothing changes until the student applies it; the patched code "
                   "runs in the sandbox and the verdict comes from that run.", style)
