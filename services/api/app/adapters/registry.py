from __future__ import annotations

from pathlib import Path

from .profile import Grammar, LanguageProfile, load_grammar, load_profile

ADAPTER_DIR = Path(__file__).parent
PROFILE_DIR = ADAPTER_DIR / "profiles"
GRAMMAR_DIR = ADAPTER_DIR / "grammars"

# Order languages appear in the UI; profiles not listed here come after, by id.
PREFERRED_ORDER = ["c", "cpp", "java", "python", "javascript", "typescript", "go", "rust",
                   "csharp", "kotlin", "swift", "php", "ruby", "lua", "bash", "sql",
                   # Lab languages first (microprocessor, compiler design, digital electronics, AI),
                   # then the rest of the Ubuntu 24.04 toolchains.
                   "r", "asm", "lex", "verilog", "prolog", "fortran", "pascal", "cobol", "perl",
                   "lisp", "scheme", "erlang", "elixir", "nim", "d", "ada", "tcl"]


def load_shared_grammars(directory: Path = GRAMMAR_DIR) -> dict[str, Grammar]:
    """Every adapters/grammars/<name>.toml, keyed by file name."""
    return {path.stem: load_grammar(path) for path in sorted(directory.glob("*.toml"))}


class LanguageRegistry:
    """All language profiles, loaded and validated at start-up."""

    def __init__(self, profiles: list[LanguageProfile]) -> None:
        rank = {lang: i for i, lang in enumerate(PREFERRED_ORDER)}
        ordered = sorted(profiles, key=lambda p: (rank.get(p.id, len(rank)), p.id))
        self._profiles = {p.id: p for p in ordered}
        if len(self._profiles) != len(profiles):
            raise ValueError("duplicate language ids in profiles")

    @classmethod
    def from_directory(cls, directory: Path = PROFILE_DIR, grammar_dir: Path = GRAMMAR_DIR) -> LanguageRegistry:
        from ..analysis.blocks import BLOCK_PARSERS  # adapters must not import analysis at module load

        shared = load_shared_grammars(grammar_dir)
        parsers = set(BLOCK_PARSERS)
        return cls([load_profile(p, shared, parsers) for p in sorted(directory.glob("*.toml"))])

    def get(self, language_id: str) -> LanguageProfile | None:
        return self._profiles.get(language_id)

    def all(self) -> list[LanguageProfile]:
        return list(self._profiles.values())
