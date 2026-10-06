"""Language adapters.

An adapter is a declarative TOML profile in adapters/profiles/ plus a sandbox
image in infra/containers/. The profile holds everything language-specific:
file conventions, the trusted compile/run argument arrays, limits, ordered
output grammars and classification rules. The rest of the platform (editor,
API, runner, normalizer) is language-independent.
"""
