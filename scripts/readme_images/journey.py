"""docs/images/readme/run-journey-{dark,light}.svg: one real run, animated.

The numbers are those of a real run of the C starter program on the
development stack (27 Sep 2026, 2 vCPUs): state changes at 0, 5, 83, 336, 581
and 583 ms; compile step 192 ms and run step 175 ms of wall time.
"""
from svgkit import MONO, PALETTES, background, svg_doc, t

W, H = 1280, 404
LOOP = 9.0  # seconds
X0, SPAN = 100, 1080
STATIONS = [  # label, detail, real time label, arrival (s) in the animation
    ("Press Run", "editor text + input", "0 ms", 0.0),
    ("API", "64 KB check · SHA-256", "QUEUED · 0 ms", 0.5),
    ("Runner", "policy check · workspace", "STARTING · 5 ms", 0.9),
    ("Compile", "gcc in a fresh container", "COMPILING · 83 ms", 2.0),
    ("Execute", "read-only · no network", "RUNNING · 336 ms", 4.3),
    ("Diagnostics", "grammar → stable codes", "581 ms", 6.4),
    ("Result", "exit 0 · output · +XP", "SUCCEEDED · 583 ms", 6.9),
]
MS = 583  # Run to result
PX_PER_MS = SPAN / MS


def pct(seconds: float) -> str:
    return f"{seconds / LOOP * 100:.2f}%"


def draw(theme: str) -> str:
    p = PALETTES[theme]
    step = SPAN / (len(STATIONS) - 1)
    b = [background(W, H, p, theme, seed=5, stars=40 if theme == "dark" else 0)]

    # Keyframes: the packet travels, dwelling where real time passes.
    moves = [(0.0, 0), (0.5, 1), (0.9, 2), (1.6, 2), (2.0, 3), (3.9, 3), (4.3, 4), (6.1, 4), (6.4, 5), (6.6, 5),
             (6.9, 6), (LOOP, 6)]
    packet = " ".join(f"{pct(s)} {{ transform: translateX({i * step:.1f}px); }}" for s, i in moves)
    # The sweep on the time axis follows the real clock during the dwells.
    sweep_pts = [(0.0, 0), (0.9, 5), (1.6, 83), (2.0, 83), (3.9, 336), (4.3, 336), (6.1, 581), (6.4, 581),
                 (6.6, 583), (LOOP, 583)]
    sweep = " ".join(f"{pct(s)} {{ transform: translateX({ms * PX_PER_MS:.1f}px); }}" for s, ms in sweep_pts)
    lit = []
    for i, (_, _, _, arrive) in enumerate(STATIONS):
        before = max(arrive - 0.01, 0)
        frames = (f"0% {{ opacity: {1 if arrive == 0 else 0}; }} {pct(before)} {{ opacity: {1 if arrive == 0 else 0}; }} "
                  f"{pct(arrive)} {{ opacity: 1; }} 96% {{ opacity: 1; }} 100% {{ opacity: 0.0; }}")
        lit.append(f"@keyframes lit{i} {{ {frames} }} .lit{i} {{ animation: lit{i} {LOOP}s ease-out infinite; }}")
    states = [("QUEUED", 0.5, 0.9), ("STARTING", 0.9, 2.0), ("COMPILING", 2.0, 4.3), ("RUNNING", 4.3, 6.6),
              ("SUCCEEDED", 6.9, LOOP)]
    state_css = []
    for i, (_, a, z) in enumerate(states):
        state_css.append(
            f"@keyframes st{i} {{ 0% {{ opacity: 0; }} {pct(max(a - 0.01, 0))} {{ opacity: 0; }} {pct(a)} {{ opacity: 1; }} "
            f"{pct(min(z - 0.01, LOOP * 0.999))} {{ opacity: 1; }} {pct(min(z, LOOP))} {{ opacity: {1 if z == LOOP else 0}; }} "
            f"100% {{ opacity: 0; }} }} .st{i} {{ animation: st{i} {LOOP}s linear infinite; }}")
    burst = (f"@keyframes burst {{ 0%, {pct(6.85)} {{ transform: scale(0.2); opacity: 0; }} {pct(7.0)} {{ opacity: 1; }} "
             f"{pct(7.8)} {{ transform: scale(1.35); opacity: 0; }} 100% {{ transform: scale(1.35); opacity: 0; }} }}")
    style = f"""
      @keyframes packet {{ {packet} }}
      @keyframes sweep {{ {sweep} }}
      @keyframes fade {{ 0% {{ opacity: 0; }} 3% {{ opacity: 1; }} 95% {{ opacity: 1; }} 100% {{ opacity: 0; }} }}
      {burst}
      .packet {{ animation: packet {LOOP}s ease-in-out infinite, fade {LOOP}s linear infinite; }}
      .sweep {{ animation: sweep {LOOP}s linear infinite; }}
      .burst {{ transform-box: fill-box; transform-origin: center; animation: burst {LOOP}s ease-out infinite; }}
      {' '.join(lit)}
      {' '.join(state_css)}
      @media (prefers-reduced-motion: reduce) {{
        .packet, .sweep, .burst, [class^="lit"], [class^="st"] {{ animation: none !important; }}
        .packet {{ transform: translateX({SPAN}px); }}
        .sweep {{ transform: translateX({SPAN}px); }}
        .st0, .st1, .st2, .st3 {{ opacity: 0; }}
      }}
    """

    # Header and the live state read-out
    b.append(t(40, 54, "One run, start to finish", 24, p["fg"], 700))
    b.append(t(40, 80, "A real C run from the demo recording: GCC 13.3.0 on the 2-vCPU development machine, "
                       "583 ms from Run to result (shown 12 times slower).", 14, p["muted"]))
    b.append(f'<rect x="1004" y="30" width="236" height="58" rx="12" fill="{p["surface"]}" stroke="{p["line"]}"/>')
    b.append(t(1020, 52, "execution.state", 11.5, p["faint"], 500, MONO))
    colors = [p["accent_fg"], p["info_fg"], p["brand_fg"], p["brand_fg"], p["ok"]]
    for i, (name, _, _) in enumerate(states):
        b.append(f'<g class="st{i}" opacity="{1 if i == 4 else 0}">' + t(1020, 76, name, 17, colors[i], 700, MONO)
                 + "</g>")

    # The track and the stations
    y = 172
    b.append(f'<path d="M{X0},{y} H{X0 + SPAN}" stroke="{p["line"]}" stroke-width="4" stroke-linecap="round"/>')
    for i, (label, detail, when, _) in enumerate(STATIONS):
        x = X0 + i * step
        b.append(f'<circle cx="{x:.1f}" cy="{y}" r="22" fill="{p["surface"]}" stroke="{p["line"]}" stroke-width="2"/>')
        b.append(f'<g class="lit{i}"><circle cx="{x:.1f}" cy="{y}" r="22" fill="{p["brand"]}" fill-opacity="0.16" '
                 f'stroke="{p["brand"]}" stroke-width="2.5"/>'
                 f'<circle cx="{x:.1f}" cy="{y}" r="30" fill="none" stroke="{p["brand"]}" stroke-opacity="0.25" '
                 f'stroke-width="6"/></g>')
        b.append(t(x, y + 5, str(i + 1), 14, p["fg"], 700, MONO, "middle"))
        b.append(t(x, y + 54, label, 15.5, p["fg"], 700, anchor="middle"))
        b.append(t(x, y + 74, detail, 12, p["muted"], anchor="middle"))
        b.append(t(x, y + 94, when, 11.5, p["brand_fg"] if i == 6 else p["faint"], 600, MONO, "middle"))
    # the celebration at the end
    rx = X0 + SPAN
    rays = "".join(
        f'<path d="M{rx + dx * 34:.1f},{y + dy * 34:.1f} L{rx + dx * 48:.1f},{y + dy * 48:.1f}" '
        f'stroke="{p["accent"]}" stroke-width="3" stroke-linecap="round"/>'
        for dx, dy in [(1, 0), (0.7, -0.7), (0, -1), (-0.7, -0.7), (-1, 0), (-0.7, 0.7), (0, 1), (0.7, 0.7)])
    b.append(f'<g class="burst" opacity="0">{rays}</g>')
    # the packet
    b.append(f'<g class="packet"><circle cx="{X0}" cy="{y}" r="15" fill="{p["brand"]}" fill-opacity="0.25"/>'
             f'<circle cx="{X0}" cy="{y}" r="8" fill="{p["brand"]}"/></g>')

    # The time axis: where the 583 ms went
    ay = 324
    segs = [(0, 5, "accent", ""), (5, 83, "info", "prepare 78 ms"),
            (83, 336, "brand", "compile step 253 ms (gcc 192 ms)"),
            (336, 581, "ok", "run step 245 ms (program 175 ms)"), (581, 583, "danger", "")]
    for a, z, key, label in segs:
        x1, x2 = X0 + a * PX_PER_MS, X0 + z * PX_PER_MS
        b.append(f'<rect x="{x1:.1f}" y="{ay}" width="{max(x2 - x1, 2):.1f}" height="16" rx="3" fill="{p[key] if key != "ok" else p["ok"]}" '
                 f'fill-opacity="0.8"/>')
        if label:
            b.append(t((x1 + x2) / 2, ay - 8, label, 12, p["muted"], 600, anchor="middle"))
    for ms in (0, 100, 200, 300, 400, 500, 583):
        x = X0 + ms * PX_PER_MS
        b.append(f'<path d="M{x:.1f},{ay + 20} v6" stroke="{p["faint"]}" stroke-width="1.5"/>')
        b.append(t(x, ay + 40, f"{ms} ms", 11, p["faint"], 500, MONO, "middle"))
    b.append(f'<g class="sweep"><path d="M{X0},{ay - 4} v24" stroke="{p["fg"]}" stroke-width="2.5" '
             f'stroke-linecap="round"/></g>')

    return svg_doc(W, H, "\n".join(b), "One KAIRO run, start to finish",
                   "An animation of a real C run: the request reaches the API (queued at 0 ms), the runner starts "
                   "(5 ms), a fresh container compiles the program (83 to 336 ms), another runs it (336 to 581 ms), "
                   "the output is turned into diagnostics and the result is shown at 583 ms.", style)
