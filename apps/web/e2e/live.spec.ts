import { chooseLanguage, expect, openApp, problemMarkers, setEditorText, skipWelcome, test } from "./helpers";

test("a syntax slip is flagged while typing, without running, and clears when fixed", async ({ page }) => {
  await skipWelcome(page);
  await openApp(page);
  await chooseLanguage(page, "python", "Python");
  await setEditorText(page, "def area(w, h):\n    return w * h\n\nprint(area(3, 4))\n");
  await expect(page.getByTestId("live-status")).toContainText("Syntax OK");

  // Delete the ':' at the end of line 1.
  await page.locator(".monaco-editor .view-lines").click();
  await page.keyboard.press("Control+Home");
  await page.keyboard.press("End");
  await page.keyboard.press("Backspace");
  await expect(page.getByTestId("live-problems")).toBeVisible();
  await expect(page.getByTestId("live-status")).toContainText("syntax problem");
  // Monaco paints the squiggle on its next frame after the problem list updates.
  await expect.poll(() => problemMarkers(page)).toBeGreaterThan(0);
  expect(await page.evaluate(() => performance.getEntriesByType("resource").filter((r) => r.name.includes("/api/v1/executions")).length)).toBe(0);

  await page.keyboard.type(":");
  await expect(page.getByTestId("live-status")).toContainText("Syntax OK");
  await expect(page.getByTestId("live-problems")).toHaveCount(0);
});

test("Python's ':' and indentation slips are explained while typing", async ({ page }) => {
  await skipWelcome(page);
  await openApp(page);
  await chooseLanguage(page, "python", "Python");
  await setEditorText(page, "def area(w, h)\n    return w * h\n");
  await expect(page.getByTestId("live-problems")).toContainText("Missing ':' at the end of this 'def' line");
  await setEditorText(page, "x = 1\n    y = 2\n");
  await expect(page.getByTestId("live-problems")).toContainText("Unexpected indent");
  await setEditorText(page, "x = 1\ny = 2\n");
  await expect(page.getByTestId("live-problems")).toHaveCount(0);
});

test("SQL has no live check and says so", async ({ page }) => {
  await skipWelcome(page);
  await openApp(page);
  await chooseLanguage(page, "sql", "SQL");
  await expect(page.getByText("No live check for SQL")).toBeVisible();
});
