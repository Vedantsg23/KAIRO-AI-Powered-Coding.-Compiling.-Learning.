/**
 * Python notebooks: cells, their outputs, the Jupyter .ipynb format, and the
 * parsing of a run of the notebook runner (infra/containers/python/notebook.py).
 *
 * A notebook runs in the sandbox like any program ("notebook" profile): each
 * run starts a fresh interpreter and replays the code cells from the first
 * one to the cell being run. The runner prints a marker before each cell's
 * output, so the output can be split back into cells here.
 */

export type CellType = "code" | "markdown";

export interface CellOutput {
  stdout: string;
  stderr: string;
  /** repr of the cell's last expression (Out[n]), if any. */
  result: string | null;
  error: CellError | null;
  /** Why the output is incomplete or missing ("Not run: ...", "Output cut at ..."). */
  note?: string;
}

export interface CellError {
  /** Line in the cell (0: no position, e.g. the time limit). */
  line: number;
  summary: string;
  traceback: string;
  /** The diagnostic code the server gave it (NB_NAME_ERROR, LIMIT_TIMEOUT...), when known. */
  code?: string;
  category?: string;
}

export interface Cell {
  id: string;
  type: CellType;
  source: string;
  /** Output of the last run that included this cell (null: not run yet). */
  output: CellOutput | null;
  /** In [n]: the run counter when the cell last ran. */
  count: number | null;
  /** The source the output belongs to (an edited cell's output is stale). */
  ranSource?: string;
}

export interface Notebook {
  name: string;
  cells: Cell[];
}

let seq = 0;
export const cellId = () => `c${Date.now().toString(36)}${(seq++).toString(36)}`;

export function newCell(type: CellType = "code", source = ""): Cell {
  return { id: cellId(), type, source, output: null, count: null };
}

export const STARTER_NOTEBOOK: Notebook = {
  name: "Untitled.ipynb",
  cells: [
    newCell("markdown", "# My first notebook\nRun a cell with **Shift+Enter**. Cells share their variables, like in Jupyter."),
    newCell("code", 'marks = [72, 88, 95, 64, 81]\nprint("Total:", sum(marks))\nsum(marks) / len(marks)'),
    newCell("code", "best = max(marks)\nf\"Best mark: {best}\""),
  ],
};

const MARK = "\x1e";
const CELL = new RegExp(`\\n?${MARK}KAIRO-CELL (\\d+)${MARK}\\n`, "g");
const RESULT = new RegExp(`\\n?${MARK}KAIRO-RESULT (\\d+)${MARK}\\n`);
const ERROR = new RegExp(`\\n?${MARK}KAIRO-ERROR (\\d+) (\\d+) (.*)${MARK}\\n?`);

/** Split a stream at the cell markers: text of cell n (1-based) at index n. */
function splitByCell(text: string): Map<number, string> {
  const parts = new Map<number, string>();
  const matches = [...text.matchAll(CELL)];
  for (let k = 0; k < matches.length; k++) {
    const m = matches[k];
    const start = m.index! + m[0].length;
    const end = k + 1 < matches.length ? matches[k + 1].index! : text.length;
    parts.set(Number(m[1]), text.slice(start, end));
  }
  return parts;
}

/**
 * Outputs per code cell (1-based, in the order sent to the runner) from the
 * run's stdout and stderr. Cells after a failing one did not run (absent).
 */
export function parseRun(stdout: string, stderr: string): Map<number, CellOutput> {
  const out = splitByCell(stdout);
  const err = splitByCell(stderr);
  const outputs = new Map<number, CellOutput>();
  for (const n of new Set([...out.keys(), ...err.keys()])) {
    let text = out.get(n) ?? "";
    let result: string | null = null;
    const r = RESULT.exec(text);
    if (r && Number(r[1]) === n) {
      result = text.slice(r.index + r[0].length).replace(/\n$/, "");
      text = text.slice(0, r.index);
    }
    let errText = err.get(n) ?? "";
    let error: CellOutput["error"] = null;
    const e = ERROR.exec(errText);
    if (e && Number(e[1]) === n) {
      error = { line: Number(e[2]), summary: e[3], traceback: errText.slice(0, e.index).trim() };
      errText = "";
    }
    outputs.set(n, { stdout: text.replace(/\n$/, ""), stderr: errText.replace(/\n$/, ""), result, error });
  }
  return outputs;
}

/** The "source" of a notebook run: the code cells to replay, in order (notebook.json). */
export function runSource(cells: string[]): string {
  return JSON.stringify({ cells });
}

/** The code cells a run of cell `index` replays: every code cell from the first up to it. */
export function cellsUpTo(notebook: Notebook, index: number): Cell[] {
  return notebook.cells.slice(0, index + 1).filter((c) => c.type === "code");
}

/** What the end of a run says about it (from the execution). */
export interface RunEnd {
  /** The execution state: SUCCEEDED, RUNTIME_ERROR, TIMEOUT, MEMORY_LIMIT... */
  state: string;
  /** The execution's one-line summary, e.g. "Stopped after 10 s (time limit)". */
  summary: string;
  truncated: boolean;
  /** The code and category of the sandbox's reason for stopping (LIMIT_TIMEOUT...), if any. */
  code?: string;
  category?: string;
}

const STOPPED = new Set(["TIMEOUT", "MEMORY_LIMIT", "RUNTIME_ERROR", "INTERNAL_ERROR", "CANCELLED"]);

/**
 * The notebook after a run of `ran` (the code cells sent, in order). Every
 * cell that started gets its output and the next In[n] number; the cell that
 * was running when the sandbox stopped the run (time or memory limit) gets
 * that reason as its error; cells after the one that stopped did not run.
 */
export function applyRun(
  notebook: Notebook,
  ran: { id: string; source: string }[],
  outputs: Map<number, CellOutput>,
  end: RunEnd,
  counter: number,
): { notebook: Notebook; counter: number } {
  const started = [...outputs.keys()];
  const last = started.length ? Math.max(...started) : 0;
  const updates = new Map<string, Pick<Cell, "output" | "count" | "ranSource">>();
  let next = counter;
  ran.forEach((cell, k) => {
    const n = k + 1;
    let output = outputs.get(n);
    if (!output) {
      if (n === 1 && last === 0 && STOPPED.has(end.state)) {
        // Stopped before the first cell started (or its marker was lost).
        output = { stdout: "", stderr: "", result: null, error: { line: 0, summary: end.summary, traceback: "", code: end.code, category: end.category } };
        updates.set(cell.id, { output, count: ++next, ranSource: cell.source });
        return;
      }
      updates.set(cell.id, {
        output: { stdout: "", stderr: "", result: null, error: null, note: "Not run: the run stopped in an earlier cell." },
        count: null,
        ranSource: cell.source,
      });
      return;
    }
    output = { ...output };
    if (n === last) {
      // The sandbox stopped the run while this cell was running (a Python error has its own report).
      if (!output.error && STOPPED.has(end.state) && end.state !== "RUNTIME_ERROR") {
        output.error = { line: 0, summary: end.summary, traceback: "", code: end.code, category: end.category };
      }
      if (end.truncated) output.note = "The output was cut at the sandbox's output limit.";
    }
    updates.set(cell.id, { output, count: ++next, ranSource: cell.source });
  });
  return {
    notebook: { ...notebook, cells: notebook.cells.map((c) => (updates.has(c.id) ? { ...c, ...updates.get(c.id)! } : c)) },
    counter: next,
  };
}

/** What the notebook runner prints, without its markers (for the notebook's terminal). */
export function plainLog(text: string): string {
  return text
    .replace(new RegExp(`\\n?${MARK}KAIRO-CELL (\\d+)${MARK}\\n`, "g"), (_m, n) => `\n── cell ${n} ──\n`)
    .replace(new RegExp(`\\n?${MARK}KAIRO-RESULT (\\d+)${MARK}\\n`, "g"), (_m, n) => `\nOut[${n}]: `)
    .replace(new RegExp(`\\n?${MARK}KAIRO-ERROR (\\d+) (\\d+) (.*)${MARK}\\n?`, "g"), (_m, n, line, s) => `\n✖ cell ${n}, line ${line}: ${s}\n`)
    .replace(/^\n+/, "");
}

// ------------------------------------------------------------------ .ipynb

type IpynbText = string | string[];
interface IpynbCell {
  cell_type: string;
  source: IpynbText;
  execution_count?: number | null;
  outputs?: unknown[];
  metadata?: object;
}

const joinText = (t: IpynbText | undefined) => (Array.isArray(t) ? t.join("") : (t ?? ""));
const splitText = (t: string) => {
  const lines = t.split("\n");
  return lines.map((line, i) => (i < lines.length - 1 ? `${line}\n` : line)).filter((line, i) => line !== "" || i === 0);
};

/** Read a Jupyter notebook (nbformat 4). Outputs are kept as the cells' last output. */
export function fromIpynb(text: string, name = "Imported.ipynb"): Notebook {
  const data = JSON.parse(text) as { cells?: IpynbCell[]; nbformat?: number };
  if (!Array.isArray(data.cells)) throw new Error("This file has no notebook cells (is it a Jupyter .ipynb file?).");
  const cells = data.cells
    .filter((c) => c.cell_type === "code" || c.cell_type === "markdown" || c.cell_type === "raw")
    .map((c) => {
      const cell = newCell(c.cell_type === "code" ? "code" : "markdown", joinText(c.source));
      if (c.cell_type === "code" && Array.isArray(c.outputs) && c.outputs.length) {
        const output: CellOutput = { stdout: "", stderr: "", result: null, error: null };
        for (const raw of c.outputs as Record<string, unknown>[]) {
          if (raw.output_type === "stream") {
            if (raw.name === "stderr") output.stderr += joinText(raw.text as IpynbText);
            else output.stdout += joinText(raw.text as IpynbText);
          } else if (raw.output_type === "execute_result" || raw.output_type === "display_data") {
            const plain = (raw.data as Record<string, IpynbText> | undefined)?.["text/plain"];
            if (plain !== undefined) output.result = joinText(plain);
          } else if (raw.output_type === "error") {
            output.error = {
              line: 0,
              summary: `${String(raw.ename ?? "Error")}: ${String(raw.evalue ?? "")}`,
              traceback: (raw.traceback as string[] | undefined)?.join("\n").replace(/\x1b\[[0-9;]*m/g, "") ?? "",
            };
          }
        }
        // Streams end with a newline in .ipynb files; outputs here are kept without it.
        output.stdout = output.stdout.replace(/\n$/, "");
        output.stderr = output.stderr.replace(/\n$/, "");
        cell.output = output;
        cell.count = typeof c.execution_count === "number" ? c.execution_count : null;
        cell.ranSource = cell.source;
      }
      return cell;
    });
  return { name: name.endsWith(".ipynb") ? name : `${name}.ipynb`, cells: cells.length ? cells : [newCell()] };
}

/** Write a Jupyter notebook (nbformat 4.5) that Jupyter, VS Code and Colab open. */
export function toIpynb(notebook: Notebook): string {
  const cells = notebook.cells.map((cell) => {
    if (cell.type === "markdown") return { cell_type: "markdown", id: cell.id, metadata: {}, source: splitText(cell.source) };
    const outputs: object[] = [];
    const o = cell.output;
    if (o) {
      if (o.stdout) outputs.push({ output_type: "stream", name: "stdout", text: splitText(o.stdout + "\n") });
      if (o.stderr) outputs.push({ output_type: "stream", name: "stderr", text: splitText(o.stderr + "\n") });
      if (o.result !== null)
        outputs.push({ output_type: "execute_result", execution_count: cell.count, metadata: {}, data: { "text/plain": splitText(o.result) } });
      if (o.error) {
        const [ename, ...rest] = o.error.summary.split(": ");
        outputs.push({ output_type: "error", ename, evalue: rest.join(": "), traceback: o.error.traceback.split("\n") });
      }
    }
    return { cell_type: "code", id: cell.id, execution_count: cell.count, metadata: {}, outputs, source: splitText(cell.source) };
  });
  return JSON.stringify(
    {
      cells,
      metadata: {
        kernelspec: { display_name: "Python 3", language: "python", name: "python3" },
        language_info: { name: "python", version: "3.12" },
      },
      nbformat: 4,
      nbformat_minor: 5,
    },
    null,
    1,
  );
}
