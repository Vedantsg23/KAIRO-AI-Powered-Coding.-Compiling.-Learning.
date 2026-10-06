"""docs/images/readme/hero-{dark,light}.svg: the README's banner (animated).

Saarthi (the app's own avatar artwork, see apps/web/src/mascot/SaarthiMascot.tsx)
floats over its holo-platform next to the KAIRO wordmark.
"""
from svgkit import MONO, PALETTES, SANS, background, chips_flow, svg_doc, t

W, H = 1280, 400

AVATAR = """
<defs>
  <radialGradient id="shell" cx="34%" cy="24%" r="85%"><stop offset="0" stop-color="#ffffff"/><stop offset="0.55" stop-color="#f1f6f3"/><stop offset="1" stop-color="#c9d7cf"/></radialGradient>
  <linearGradient id="visor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1d2b23"/><stop offset="0.5" stop-color="#0a130e"/><stop offset="1" stop-color="#040806"/></linearGradient>
  <radialGradient id="pglow"><stop offset="0" stop-color="#22c55e" stop-opacity="0.55"/><stop offset="1" stop-color="#22c55e" stop-opacity="0"/></radialGradient>
  <linearGradient id="beam" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#22c55e" stop-opacity="0.28"/><stop offset="1" stop-color="#22c55e" stop-opacity="0"/></linearGradient>
  <filter id="blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2"/></filter>
</defs>
<g class="glow"><ellipse cx="60" cy="107" rx="36" ry="9" fill="url(#pglow)"/></g>
<path d="M45 107 L51 86 L69 86 L75 107 Z" fill="url(#beam)"/>
<ellipse cx="60" cy="107" rx="25" ry="5.2" fill="none" stroke="#22c55e" stroke-width="1.6"/>
<ellipse cx="60" cy="107" rx="33" ry="7.2" fill="none" stroke="#22c55e" stroke-opacity="0.45" stroke-dasharray="2 3.5"/>
<ellipse cx="60" cy="107" rx="13" ry="2.6" fill="#22c55e" fill-opacity="0.35"/>
<g class="bob">
  <path d="M45 72 C48 86 54 94 60 96 C66 94 72 86 75 72 Z" fill="url(#shell)" stroke="#aebfb5"/>
  <rect x="57.6" y="80" width="4.8" height="6" rx="2.4" fill="#22c55e"/>
  <ellipse cx="29" cy="80" rx="6.8" ry="7.4" fill="url(#shell)" stroke="#aebfb5"/>
  <g class="wave"><ellipse cx="91" cy="80" rx="6.8" ry="7.4" fill="url(#shell)" stroke="#aebfb5"/></g>
  <line x1="60" y1="19" x2="60" y2="11" stroke="#9fb3a8" stroke-width="2.2" stroke-linecap="round"/>
  <circle cx="60" cy="9.5" r="5" fill="#22c55e" opacity="0.35" filter="url(#blur)"/>
  <circle cx="60" cy="9.5" r="3.1" fill="#22c55e"/>
  <rect x="17.5" y="40" width="9" height="20" rx="4.5" fill="#e4ece7" stroke="#aebfb5"/>
  <rect x="20.3" y="44.5" width="3.4" height="11" rx="1.7" fill="#22c55e"/>
  <rect x="93.5" y="40" width="9" height="20" rx="4.5" fill="#e4ece7" stroke="#aebfb5"/>
  <rect x="96.3" y="44.5" width="3.4" height="11" rx="1.7" fill="#22c55e"/>
  <path d="M60 18 C84 18 97 29 97 49 C97 69 84 79 60 79 C36 79 23 69 23 49 C23 29 36 18 60 18 Z" fill="url(#shell)" stroke="#aebfb5" stroke-width="1.2"/>
  <ellipse cx="43" cy="27.5" rx="11" ry="4.2" fill="#fff" opacity="0.9" transform="rotate(-17 43 27.5)"/>
  <path d="M60 33 C79 33 89 38 89 50 C89 62 79 67 60 67 C41 67 31 62 31 50 C31 38 41 33 60 33 Z" fill="url(#visor)"/>
  <path d="M38 39.5 Q60 33.5 82 39.5" stroke="#fff" stroke-opacity="0.16" stroke-width="2" fill="none" stroke-linecap="round"/>
  <g class="eyes">
    <g filter="url(#blur)" opacity="0.75"><rect x="42" y="43" width="10" height="13" rx="5" fill="#4ade80"/><rect x="68" y="43" width="10" height="13" rx="5" fill="#4ade80"/></g>
    <rect x="42" y="43" width="10" height="13" rx="5" fill="#4ade80"/><rect x="68" y="43" width="10" height="13" rx="5" fill="#4ade80"/>
    <rect x="44.2" y="45" width="3" height="3.4" rx="1.5" fill="#eafff1" opacity="0.9"/><rect x="70.2" y="45" width="3" height="3.4" rx="1.5" fill="#eafff1" opacity="0.9"/>
  </g>
  <path d="M54.5 59.5 Q60 63.5 65.5 59.5" stroke="#4ade80" stroke-width="2" fill="none" stroke-linecap="round"/>
</g>"""

# The wordmark, the same geometry as the app's (layout/Logo.tsx): KA|RO with a green caret for the I.
WORDMARK = """
<g stroke="{fg}" stroke-width="3.2" fill="none" stroke-linecap="square" stroke-linejoin="miter">
  <path d="M1.6 0 V20"/><path d="M15 0 L5 10 L15 20"/><path d="M22 20 L30.5 0 L39 20"/>
  <path d="M58.6 20 V1.6 H66 A4.9 4.9 0 0 1 66 11.4 H58.6 M65 11.4 L72 20"/><rect x="80.6" y="1.6" width="16.2" height="16.8" rx="5.6"/>
</g>
<rect x="46.6" y="-1" width="3.6" height="22" fill="{brand}"/>"""

MARK = """
<rect x="0.75" y="0.75" width="38.5" height="38.5" rx="10" fill="#0b120e" stroke="#22c55e" stroke-width="1.5"/>
<path d="M6 9.5 V6 H9.5 M30.5 6 H34 V9.5 M34 30.5 V34 H30.5 M9.5 34 H6 V30.5" stroke="#22c55e" stroke-opacity="0.45" stroke-width="1.1" fill="none"/>
<path d="M13 10.5 V29.5" stroke="#f2f7f3" stroke-width="3.6"/>
<path d="M26.5 10.5 L17 20 L26.5 29.5" stroke="#22c55e" stroke-width="3.6" fill="none"/>
<rect class="caret" x="28.5" y="26.2" width="4.6" height="3.3" fill="#4ade80"/>"""


def draw(theme: str) -> str:
    p = PALETTES[theme]
    b = [background(W, H, p, theme)]
    cx, cy = 262, 200
    # HUD rings and crosshair behind Saarthi
    b.append(f'<circle cx="{cx}" cy="{cy - 6}" r="150" fill="none" stroke="{p["line"]}" stroke-opacity="0.7"/>')
    b.append(f'<circle cx="{cx}" cy="{cy - 6}" r="182" fill="none" stroke="{p["line"]}" stroke-opacity="0.5" stroke-dasharray="4 7"/>')
    b.append(f'<path d="M{cx - 205} {cy - 6} H{cx + 205} M{cx} {cy - 190} V{cy + 178}" stroke="{p["line"]}" stroke-opacity="0.5"/>')
    b.append(t(70, 44, "SAARTHI · AI GUIDE", 11, p["faint"], 600, MONO, ls=2))
    b.append(f'<circle class="blinkdot" cx="{cx + 142}" cy="40" r="3.5" fill="{p["brand"]}"/>')
    b.append(t(cx + 152, 44, "ONLINE", 11, p["brand_fg"], 700, MONO, ls=2))
    scale = 2.75
    b.append(f'<g transform="translate({cx - 60 * scale},{cy - 58 * scale}) scale({scale})">{AVATAR}</g>')

    x = 560
    b.append(t(x, 92, "B.E. FINAL-YEAR PROJECT · DYPCOEI VARALE · 2026-27", 13, p["brand_fg"], 700, MONO, ls=1.8))
    b.append(f'<g transform="translate({x},118) scale(1.6)">{MARK}</g>')
    b.append(f'<g transform="translate({x + 84},128) scale(2.2)">{WORDMARK.format(fg=p["fg"], brand=p["brand"])}</g>')
    b.append(t(x + 318, 158, "/ COMPILER OS", 14, p["faint"], 600, MONO, ls=2.4))
    b.append(t(x + 2, 228, "AI-Powered Coding. Compiling. Learning.", 30, p["fg"], 600, SANS, ls=-0.6))
    b.append(t(x + 2, 264, "An online compiler for learners: real toolchains in locked-down sandboxes, a live", 16, p["muted"]))
    b.append(t(x + 2, 288, "analyzer that catches slips while you type, and Saarthi, an AI guide whose fixes a run verifies.",
               16, p["muted"]))
    chips, _ = chips_flow(x + 2, 314, 1240, ["15 languages", "Docker sandboxes", "live analyzer", "quick fixes",
                                             "Saarthi AI guide", "verified fixes"], p, "brand", gap=10, size=13)
    b.append(chips)

    style = """
      .bob { animation: bob 3.4s ease-in-out infinite alternate; }
      @keyframes bob { from { transform: translateY(0); } to { transform: translateY(-3.5px); } }
      .glow { transform-box: fill-box; transform-origin: center; animation: glow 3.4s ease-in-out infinite alternate; }
      @keyframes glow { from { opacity: 0.55; transform: scale(0.94); } to { opacity: 1; transform: scale(1.04); } }
      .eyes { transform-box: fill-box; transform-origin: center; animation: blink 5.6s infinite; }
      @keyframes blink { 0%, 95%, 100% { transform: scaleY(1); } 97% { transform: scaleY(0.12); } }
      .caret, .blinkdot { animation: caret 1.1s steps(1) infinite; }
      @keyframes caret { 50% { opacity: 0; } }
      @media (prefers-reduced-motion: reduce) { .bob, .glow, .eyes, .caret, .blinkdot { animation: none !important; } }
    """
    return svg_doc(W, H, "\n".join(b), "KAIRO",
                   "KAIRO: AI-powered coding, compiling and learning. An online compiler for learners with 15 languages, "
                   "Docker sandboxes, a live analyzer with quick fixes, and Saarthi, an AI guide whose fixes are "
                   "verified by a real run. B.E. final-year project, DYPCOEI Varale, 2026-27.", style)
