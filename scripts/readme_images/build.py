"""Draw the README's diagrams: python3 scripts/readme_images/build.py

Writes docs/images/readme/{hero,architecture,run-journey,sandbox-layers,saarthi-loop}-{dark,light}.svg.
The README shows the dark or light file to match the reader's GitHub theme. Edit the
text or numbers in the module for a diagram, then run this again.
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))

import architecture
import hero
import journey
import layers
import saarthi

OUT = pathlib.Path(__file__).resolve().parents[2] / "docs" / "images" / "readme"
DIAGRAMS = {"hero": hero, "architecture": architecture, "run-journey": journey,
            "sandbox-layers": layers, "saarthi-loop": saarthi}

if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for name, module in DIAGRAMS.items():
        for theme in ("dark", "light"):
            (OUT / f"{name}-{theme}.svg").write_text(module.draw(theme))
            print("wrote", OUT / f"{name}-{theme}.svg")
