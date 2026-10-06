def load(text):
    try:
        return int(text)
    except ValueError as e:
        raise RuntimeError("could not load settings") from e

load("x")
