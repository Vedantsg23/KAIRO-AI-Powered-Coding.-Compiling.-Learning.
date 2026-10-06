import { describe, expect, it } from "vitest";
import { fuzzyFilter, fuzzyScore } from "./fuzzy";

describe("fuzzy matching", () => {
  it("matches characters in order, case-insensitively", () => {
    expect(fuzzyScore("rn", "Run code")).not.toBeNull();
    expect(fuzzyScore("RUN", "run code")).not.toBeNull();
    expect(fuzzyScore("nr", "Run")).toBeNull();
    expect(fuzzyScore("", "anything")).toBe(0);
  });

  it("ranks word starts, whole substrings and short texts first", () => {
    const commands = ["Switch to Python", "Load example: Hello, input", "Run code", "Show the explorer", "Switch to dark theme"];
    expect(fuzzyFilter(commands, "run", (c) => c)[0]).toBe("Run code");
    expect(fuzzyFilter(commands, "py", (c) => c)[0]).toBe("Switch to Python");
    expect(fuzzyFilter(commands, "dark", (c) => c)).toEqual(["Switch to dark theme"]);
    expect(fuzzyFilter(commands, "sw py", (c) => c)[0]).toBe("Switch to Python");
  });

  it("drops scattered matches far weaker than the best one", () => {
    const commands = ["Fold all blocks", "Run example: Factorial with recursion Examples sample load", "Unfold all blocks"];
    expect(fuzzyFilter(commands, "fold", (c) => c)).toEqual(["Fold all blocks", "Unfold all blocks"]);
  });

  it("keeps the original order when the query is empty", () => {
    const items = ["b", "a", "c"];
    expect(fuzzyFilter(items, "  ", (x) => x)).toEqual(items);
  });
});
