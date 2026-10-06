import { describe, expect, it } from "vitest";
import { inOrder } from "./completer";

describe("inOrder (ghost text replacing auto-closed brackets)", () => {
  it("finds the characters after the cursor inside the suggestion, in order", () => {
    expect(inOrder('"%d\\n", total);', ")")).toBe(true);
    expect(inOrder("int i = 0; i < n; i++) {", ")")).toBe(true);
    expect(inOrder("a[i])", "])")).toBe(true);
  });

  it("refuses when a character is missing or out of order", () => {
    expect(inOrder("total", ")")).toBe(false);
    expect(inOrder(")]", "])")).toBe(false);
    expect(inOrder("x + y", "x + y + z")).toBe(false);
  });

  it("an empty rest always fits", () => {
    expect(inOrder("anything", "")).toBe(true);
  });
});
