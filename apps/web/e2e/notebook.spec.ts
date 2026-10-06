import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";
import { expect, isInstalled, openApp, skipWelcome, test } from "./helpers";

/** Add a code cell at the end and wait until its editor has the keyboard. */
async function addCodeCell(page: Page) {
  const before = await page.getByTestId("nb-cell").count();
  await page.getByTestId("nb-add-code-end").click();
  await expect(page.getByTestId("nb-cell")).toHaveCount(before + 1);
  await expect(page.getByTestId("nb-cell").nth(before).locator(".monaco-editor.focused")).toBeVisible();
}

// The Python notebook: cells run in the sandbox (each run replays the code
// cells from the top), outputs and errors sit under their cells, and the
// notebook has a terminal of its own with a console.

test.beforeEach(async ({ page, request }) => {
  test.skip(!(await isInstalled(request, "python")), "the Python sandbox image is not installed");
  await skipWelcome(page);
  await openApp(page);
  await page.getByTestId("rail-notebook").click();
  await expect(page.getByTestId("notebook")).toBeVisible();
});

test("cells run in order, share their variables and show Out[n]", async ({ page }) => {
  const cells = page.getByTestId("nb-cell");
  await expect(cells).toHaveCount(3); // the starter: a text cell and two code cells
  await expect(cells.nth(0).getByTestId("nb-markdown")).toContainText("My first notebook");

  await page.getByTestId("nb-run-all").click();
  await expect(cells.nth(1).getByTestId("nb-stdout")).toHaveText("Total: 400", { timeout: 30_000 });
  await expect(cells.nth(1).getByTestId("nb-result")).toContainText("80.0");
  await expect(cells.nth(2).getByTestId("nb-result")).toContainText("'Best mark: 95'");
  await expect(cells.nth(1).getByTestId("nb-prompt")).toHaveText("[1]");
  await expect(cells.nth(2).getByTestId("nb-prompt")).toHaveText("[2]");
  // Nothing went to the code editor's run.
  await expect(page.getByTestId("nb-log")).toContainText("2 cells ran");

  // A new cell uses a variable from an earlier cell; Shift+Enter runs it and opens the next cell.
  await addCodeCell(page);
  await page.keyboard.type("top = sorted(marks)[-2:]\ntop");
  await page.keyboard.press("Shift+Enter");
  await expect(cells).toHaveCount(5);
  await expect(cells.nth(3).getByTestId("nb-result")).toContainText("[88, 95]", { timeout: 30_000 });
});

test("an error stays with its cell: line, traceback, quick note, and the cells after it do not run", async ({ page }) => {
  const cells = page.getByTestId("nb-cell");
  await addCodeCell(page);
  await page.keyboard.type("value = 3\nprint(valeu)");
  // The live check flags the typo while typing, with a one-click fix.
  await expect(cells.nth(3).getByTestId("nb-live")).toContainText('Did you mean "value"', { timeout: 15_000 });
  await addCodeCell(page);
  await page.keyboard.type("print('after')");

  await page.getByTestId("nb-run-all").click();
  const error = cells.nth(3).getByTestId("nb-error");
  await expect(error).toContainText("NameError: name 'valeu' is not defined", { timeout: 30_000 });
  await expect(error).toContainText("line 2");
  await expect(error.getByTestId("nb-note-quick")).toContainText("Name not defined");
  await expect(cells.nth(4).getByTestId("nb-note")).toContainText("Not run");

  // The quick fix repairs the cell; its output is now marked as older than the code.
  await cells.nth(3).getByTestId("nb-live-fix").click();
  await expect(cells.nth(3).getByTestId("nb-stale")).toBeVisible();
  await page.getByTestId("nb-run-all").click();
  await expect(cells.nth(3).getByTestId("nb-stdout")).toHaveText("3", { timeout: 30_000 });
  await expect(cells.nth(4).getByTestId("nb-stdout")).toHaveText("after");
});

test("the notebook terminal: input for input(), a console with the notebook's variables, and the time limit", async ({ page }) => {
  const cells = page.getByTestId("nb-cell");
  await page.getByTestId("nb-stdin").fill("Asha");
  await addCodeCell(page);
  await page.keyboard.type("name = input()\nprint('Hello,', name)");
  await page.keyboard.press("Control+Enter");
  await expect(cells.nth(3).getByTestId("nb-stdout")).toHaveText("Hello, Asha", { timeout: 30_000 });

  await page.getByTestId("nb-console-input").fill("len(marks) * 10");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("nb-log")).toContainText("Out[", { timeout: 30_000 });
  await expect(page.getByTestId("nb-log")).toContainText("50");

  // An endless loop is stopped by the sandbox and blamed on its cell.
  await addCodeCell(page);
  await page.keyboard.type("while True:\npass");
  await page.keyboard.press("Control+Enter");
  await expect(cells.nth(4).getByTestId("nb-error")).toBeVisible({ timeout: 40_000 });
  await expect(cells.nth(4).getByTestId("nb-note-quick")).toBeVisible();
});

test("notebooks export to .ipynb and open again, and stay after a reload", async ({ page }, testInfo) => {
  await page.getByTestId("nb-run-all").click();
  await expect(page.getByTestId("nb-cell").nth(1).getByTestId("nb-result")).toContainText("80.0", { timeout: 30_000 });
  await page.getByTestId("nb-name").fill("Marks");
  const download = page.waitForEvent("download");
  await page.getByTestId("nb-export").click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("Marks.ipynb");
  const path = testInfo.outputPath("Marks.ipynb");
  await file.saveAs(path);
  const data = JSON.parse(readFileSync(path, "utf-8"));
  expect(data.nbformat).toBe(4);
  expect(data.cells).toHaveLength(3);
  expect(data.cells[1].outputs.some((o: { output_type: string }) => o.output_type === "execute_result")).toBe(true);

  // Change the notebook, then open the exported file: the saved cells and outputs come back.
  await page.getByTestId("nb-add-code-end").click();
  await expect(page.getByTestId("nb-cell")).toHaveCount(4);
  await page.getByTestId("nb-import-input").setInputFiles(path);
  await expect(page.getByTestId("nb-cell")).toHaveCount(3);
  await expect(page.getByTestId("nb-cell").nth(1).getByTestId("nb-result")).toContainText("80.0");

  // The notebook (and that it is open) is kept in this browser.
  await page.reload();
  await expect(page.getByTestId("notebook")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("nb-name")).toHaveValue("Marks.ipynb");
  await expect(page.getByTestId("nb-cell").nth(1).getByTestId("nb-result")).toContainText("80.0");
  await page.getByTestId("nb-close").click();
  await expect(page.locator(".monaco-editor").first()).toBeVisible();
  await expect(page.getByTestId("notebook")).toHaveCount(0);
});
