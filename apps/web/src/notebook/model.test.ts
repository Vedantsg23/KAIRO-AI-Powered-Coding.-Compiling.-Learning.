import { describe, expect, it } from "vitest";
import { applyRun, cellsUpTo, fromIpynb, newCell, parseRun, plainLog, runSource, toIpynb, type Notebook } from "./model";

const RS = "\x1e";
const cell = (n: number) => `\n${RS}KAIRO-CELL ${n}${RS}\n`;
const result = (n: number) => `\n${RS}KAIRO-RESULT ${n}${RS}\n`;
const error = (n: number, line: number, summary: string) => `\n${RS}KAIRO-ERROR ${n} ${line} ${summary}${RS}\n`;

// What infra/containers/python/notebook.py prints for three cells, the third failing.
const STDOUT = `${cell(1)}hello\n${result(1)}42\n${cell(2)}${result(2)}9.16\n${cell(3)}partial\n`;
const STDERR = `${cell(1)}${cell(2)}${cell(3)}Traceback (most recent call last):\n  File "<cell 3>", line 2, in <module>\nNameError: name 'y' is not defined\n${error(3, 2, "NameError: name 'y' is not defined")}`;

describe("parseRun", () => {
  it("puts every output, Out[n] value and error under its cell", () => {
    const outputs = parseRun(STDOUT, STDERR);
    expect([...outputs.keys()]).toEqual([1, 2, 3]);
    expect(outputs.get(1)).toMatchObject({ stdout: "hello", result: "42", error: null, stderr: "" });
    expect(outputs.get(2)).toMatchObject({ stdout: "", result: "9.16" });
    const third = outputs.get(3)!;
    expect(third.stdout).toBe("partial");
    expect(third.result).toBeNull();
    expect(third.error).toMatchObject({ line: 2, summary: "NameError: name 'y' is not defined" });
    expect(third.error!.traceback).toContain('File "<cell 3>", line 2');
    expect(third.stderr).toBe("");
  });

  it("keeps warnings printed to stderr by a cell that did not fail", () => {
    const outputs = parseRun(`${cell(1)}ok\n`, `${cell(1)}Note: line 1 skipped\n`);
    expect(outputs.get(1)).toMatchObject({ stdout: "ok", stderr: "Note: line 1 skipped", error: null });
  });

  it("shows the run without its markers in the terminal", () => {
    const log = plainLog(STDOUT);
    expect(log).not.toContain(RS);
    expect(log).toContain("── cell 1 ──");
    expect(log).toContain("Out[1]: 42");
  });
});

describe("applyRun", () => {
  const notebook = (): Notebook => ({
    name: "t.ipynb",
    cells: [newCell("markdown", "# Title"), newCell("code", "x = 1"), newCell("code", "x + 1"), newCell("code", "y"), newCell("code", "print('later')")],
  });

  it("replays the code cells from the top and numbers the ones that ran", () => {
    const nb = notebook();
    const ran = cellsUpTo(nb, 3).map((c) => ({ id: c.id, source: c.source }));
    expect(ran.map((r) => r.source)).toEqual(["x = 1", "x + 1", "y"]);
    expect(JSON.parse(runSource(ran.map((r) => r.source)))).toEqual({ cells: ["x = 1", "x + 1", "y"] });
    const outputs = parseRun(`${cell(1)}${cell(2)}${result(2)}2\n${cell(3)}`, `${cell(1)}${cell(2)}${cell(3)}${error(3, 1, "NameError: name 'y' is not defined")}`);
    const { notebook: after, counter } = applyRun(nb, ran, outputs, { state: "RUNTIME_ERROR", summary: "It crashed", truncated: false }, 4);
    expect(counter).toBe(7);
    expect(after.cells.map((c) => c.count)).toEqual([null, 5, 6, 7, null]);
    expect(after.cells[2].output?.result).toBe("2");
    expect(after.cells[3].output?.error?.summary).toContain("NameError");
    expect(after.cells[4].output).toBeNull(); // not part of this run
    expect(after.cells[1].ranSource).toBe("x = 1");
  });

  it("marks cells after the one that stopped as not run, and blames the time limit on the running cell", () => {
    const nb = notebook();
    const ran = cellsUpTo(nb, 4).map((c) => ({ id: c.id, source: c.source }));
    const outputs = parseRun(`${cell(1)}${cell(2)}`, `${cell(1)}${cell(2)}`);
    const { notebook: after } = applyRun(nb, ran, outputs, { state: "TIMEOUT", summary: "Stopped after 10 s", truncated: false, code: "LIMIT_TIMEOUT", category: "timeout" }, 0);
    expect(after.cells[2].output?.error).toMatchObject({ summary: "Stopped after 10 s", code: "LIMIT_TIMEOUT" });
    expect(after.cells[3].output?.note).toMatch(/Not run/);
    expect(after.cells[3].count).toBeNull();
    expect(after.cells[4].output?.note).toMatch(/Not run/);
  });

  it("says when the output was cut at the limit", () => {
    const nb = notebook();
    const ran = cellsUpTo(nb, 1).map((c) => ({ id: c.id, source: c.source }));
    const { notebook: after } = applyRun(nb, ran, parseRun(`${cell(1)}spam\nspam`, cell(1)), { state: "RUNTIME_ERROR", summary: "Too much output", truncated: true }, 0);
    expect(after.cells[1].output?.note).toMatch(/cut/);
  });
});

describe(".ipynb", () => {
  it("round-trips cells, outputs and execution counts", () => {
    const nb: Notebook = {
      name: "Marks.ipynb",
      cells: [
        newCell("markdown", "# Marks\nSome **text**"),
        { ...newCell("code", "marks = [1, 2]\nsum(marks)"), count: 3, output: { stdout: "hi", stderr: "", result: "3", error: null } },
        { ...newCell("code", "1/0"), count: 4, output: { stdout: "", stderr: "", result: null, error: { line: 1, summary: "ZeroDivisionError: division by zero", traceback: "Traceback..." } } },
      ],
    };
    const text = toIpynb(nb);
    const data = JSON.parse(text);
    expect(data.nbformat).toBe(4);
    expect(data.cells[1].source).toEqual(["marks = [1, 2]\n", "sum(marks)"]);
    expect(data.cells[1].outputs.map((o: { output_type: string }) => o.output_type)).toEqual(["stream", "execute_result"]);
    expect(data.cells[2].outputs[0]).toMatchObject({ output_type: "error", ename: "ZeroDivisionError", evalue: "division by zero" });

    const back = fromIpynb(text, "Marks.ipynb");
    expect(back.cells.map((c) => [c.type, c.source])).toEqual(nb.cells.map((c) => [c.type, c.source]));
    expect(back.cells[1]).toMatchObject({ count: 3, output: { stdout: "hi", result: "3" } });
    expect(back.cells[2].output?.error?.summary).toBe("ZeroDivisionError: division by zero");
  });

  it("reads notebooks written by Jupyter, and rejects files that are not notebooks", () => {
    const jupyter = JSON.stringify({
      nbformat: 4,
      nbformat_minor: 5,
      metadata: {},
      cells: [
        { cell_type: "code", execution_count: 1, metadata: {}, source: ["print('a')\n", "1 + 1"], outputs: [{ output_type: "stream", name: "stdout", text: ["a\n"] }, { output_type: "execute_result", execution_count: 1, data: { "text/plain": ["2"] }, metadata: {} }] },
        { cell_type: "raw", metadata: {}, source: "raw text" },
      ],
    });
    const nb = fromIpynb(jupyter, "lab");
    expect(nb.name).toBe("lab.ipynb");
    expect(nb.cells[0]).toMatchObject({ type: "code", source: "print('a')\n1 + 1", count: 1, output: { stdout: "a", result: "2" } });
    expect(nb.cells[1].type).toBe("markdown");
    expect(() => fromIpynb('{"hello": 1}')).toThrow(/no notebook cells/);
  });
});
