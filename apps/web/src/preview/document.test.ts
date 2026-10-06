import { describe, expect, it } from "vitest";
import type { Language } from "../api/types";
import { captureScript, cssDocument, htmlDocument, reactDocument, studentLine } from "./document";
import { BROWSER_LANGUAGES, isBrowserLanguage, withBrowserLanguages } from "./languages";

describe("preview documents", () => {
  it("puts the capture script after the doctype, on the student's first line", () => {
    const doc = htmlDocument("<!doctype html>\n<html><body><h1>Hi</h1></body></html>", "t1");
    expect(doc.html.startsWith("<!doctype html><script>")).toBe(true);
    // The student's second line is still the document's second line.
    expect(doc.html.split("\n")[1]).toBe("<html><body><h1>Hi</h1></body></html>");
    expect(captureScript("t1")).not.toContain("\n");
  });

  it("wraps a fragment and keeps the CSS inside its style element", () => {
    expect(htmlDocument("<p>hello</p>", "t").html.endsWith("<p>hello</p>")).toBe(true);
    const css = cssDocument("body { color: red }\n/* </style><script>alert(1)</script> */", "t");
    expect(css.html).toContain("body { color: red }");
    expect(css.html).not.toContain("</style><script>alert(1)");
    expect(css.html).toContain("KAIRO Cafe");
  });

  it("maps errors in React code to the student's lines", () => {
    const doc = reactDocument("line1\nline2\nline3", "t", "/*react*/", "/*react-dom*/");
    const lines = doc.html.split("\n");
    expect(lines[doc.codeLine! - 1].endsWith("line1")).toBe(true);
    const at = (line: number) => doc.codeLine! + line - 1;
    expect(studentLine({ line: at(2) }, doc, 3)).toBe(2);
    // A stack frame in the student's code wins over the error's own line (inside React).
    expect(studentLine({ line: 1, stack: `TypeError: x\n    at App (about:srcdoc:${at(3)}:12)\n    at r (about:srcdoc:2:9)` }, doc, 3)).toBe(3);
    // Lines outside the student's code are not mapped.
    expect(studentLine({ line: 2 }, doc, 3)).toBeNull();
    expect(studentLine({ line: 4 }, cssDocument("a{}", "t"), 1)).toBeNull();
  });

  it("does not let the code end its own script element", () => {
    const doc = reactDocument('const s = "</script><b>x</b>";', "t", "", "");
    expect(doc.html).not.toContain('"</script><b>');
  });
});

describe("browser languages", () => {
  const server = (id: string) => ({ ...BROWSER_LANGUAGES[0], id, displayName: id }) as Language;

  it("are added once, after TypeScript", () => {
    const list = withBrowserLanguages([server("c"), server("typescript"), server("go"), server("html")]);
    expect(list.map((l) => l.id)).toEqual(["c", "typescript", "html", "css", "react", "go"]);
    expect(withBrowserLanguages([]).map((l) => l.id)).toEqual(["html", "css", "react"]);
    expect(isBrowserLanguage("react")).toBe(true);
    expect(isBrowserLanguage("javascript")).toBe(false);
  });
});
