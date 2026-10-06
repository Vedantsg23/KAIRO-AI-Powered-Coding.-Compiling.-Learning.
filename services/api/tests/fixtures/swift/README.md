# Swift fixtures (experimental, not captured yet)

These programs have no `.result.json` files yet: the Swift toolchain image
could not be built in the development environment. Once the image exists:

    .venv/bin/python scripts/capture_fixtures.py swift

Review every captured result against `grammars/swiftc.toml` and
`grammars/swift-runtime.toml`, add the expectations to
`tests/test_golden_languages.py`, and only then mark the Swift profile
`status = "stable"`.
