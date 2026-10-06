import type { Page } from "@playwright/test";
import { chooseLanguage, expect, isInstalled, openApp, setEditorText, skipWelcome, test } from "./helpers";

// The extensions that change how code is written: formatters (Prettier in
// the browser, clang-format / Black in the sandbox), Format on Save, Emmet
// and the Vim keymap. Each is switched in the Extensions view.

/** What the editor holds right now (development builds expose the editor for tests). */
const editorText = (page: Page) =>
  page.evaluate(() => (window as unknown as { __kairoEditor: { getModel(): { getValue(): string } } }).__kairoEditor.getModel().getValue());

async function focusEditor(page: Page) {
  await page.locator(".monaco-editor .view-lines").first().click();
}

async function toggleExtension(page: Page, id: string, search = id.replace(/-/g, " ")) {
  await page.getByTestId("rail-extensions").click();
  await expect(page.getByTestId("extensions-view")).toBeVisible();
  await page.getByTestId("extensions-search").fill(search);
  await page.getByTestId(`extension-toggle-${id}`).click();
}

test.beforeEach(async ({ page }) => {
  await skipWelcome(page);
  await openApp(page);
});

test("Prettier formats JavaScript in the browser, as one undo step", async ({ page }) => {
  await chooseLanguage(page, "javascript", "JavaScript");
  const messy = "const marks={asha:91,ravi:[78,85]};function avg( list ){return list.reduce((a,b)=>a+b,0)/list.length}\n";
  await setEditorText(page, messy);
  await focusEditor(page);
  await page.keyboard.press("Shift+Alt+F");
  await expect.poll(() => editorText(page), { timeout: 20_000 }).toContain("const marks = { asha: 91, ravi: [78, 85] };");
  expect(await editorText(page)).toContain("function avg(list) {\n  return list.reduce((a, b) => a + b, 0) / list.length;\n}");
  await expect(page.getByRole("status").filter({ hasText: "Formatted with Prettier" })).toBeVisible();
  await focusEditor(page);
  await page.keyboard.press("Control+Z");
  await expect.poll(() => editorText(page)).toBe(messy);
});

test("C is formatted by clang-format in the sandbox; broken Python is left alone with the reason", async ({ page, request }) => {
  test.skip(!(await isInstalled(request, "c")) || !(await isInstalled(request, "python")), "the C and Python sandboxes are not installed");
  await setEditorText(page, '#include <stdio.h>\nint main(){int x=1;if(x){printf("%d\\n",x);}return 0;}\n');
  await focusEditor(page);
  await page.keyboard.press("Shift+Alt+F");
  await expect.poll(() => editorText(page), { timeout: 30_000 }).toContain("int main() {\n    int x = 1;\n    if (x) {");
  await expect(page.getByRole("status").filter({ hasText: "Formatted with clang-format" })).toBeVisible();

  await chooseLanguage(page, "python", "Python");
  await setEditorText(page, "def f(:\n    pass\n");
  await focusEditor(page);
  await page.keyboard.press("Shift+Alt+F");
  await expect(page.getByRole("status").filter({ hasText: "Black could not format this code" })).toContainText("Cannot parse", { timeout: 30_000 });
  expect(await editorText(page)).toBe("def f(:\n    pass\n");
});

test("Format on Save formats on Ctrl+S, and the palette offers Format document", async ({ page }) => {
  await toggleExtension(page, "format-on-save");
  await chooseLanguage(page, "css", "CSS");
  await setEditorText(page, "body{margin:0;color:red}\n");
  await focusEditor(page);
  await page.keyboard.press("Control+S");
  await expect.poll(() => editorText(page), { timeout: 20_000 }).toBe("body {\n  margin: 0;\n  color: red;\n}\n");

  await setEditorText(page, "h1{font-size:2rem}\n");
  await page.getByTestId("workspace").click({ position: { x: 5, y: 5 } });
  await page.keyboard.press("Control+K");
  await page.keyboard.type("format document");
  await page.keyboard.press("Enter");
  await expect.poll(() => editorText(page), { timeout: 20_000 }).toBe("h1 {\n  font-size: 2rem;\n}\n");
});

test("Emmet expands an abbreviation in HTML with Tab", async ({ page }) => {
  await chooseLanguage(page, "html", "HTML");
  await setEditorText(page, "");
  await focusEditor(page);
  await page.keyboard.type("ul>li.item*3");
  await expect(page.locator(".monaco-editor .suggest-widget.visible")).toBeVisible({ timeout: 10_000 });
  await page.keyboard.press("Tab");
  // Expanded with the editor's indentation (spaces).
  await expect.poll(() => editorText(page)).toMatch(/^<ul>\n(\s+<li class="item"><\/li>\n){3}<\/ul>/);
});

test("the Vim keymap adds modes to the editor and goes away when switched off", async ({ page }) => {
  await toggleExtension(page, "vim");
  await expect(page.getByTestId("vim-status")).toContainText("NORMAL", { timeout: 15_000 });
  await setEditorText(page, "abc\n");
  await focusEditor(page);
  await page.keyboard.press("Escape");
  await page.keyboard.press("g");
  await page.keyboard.press("g");
  await page.keyboard.press("0");
  await page.keyboard.press("x"); // normal mode: delete the character under the cursor
  await expect.poll(() => editorText(page)).toBe("bc\n");
  await page.keyboard.press("i");
  await expect(page.getByTestId("vim-status")).toContainText("INSERT");
  await page.keyboard.type("A");
  await expect.poll(() => editorText(page)).toBe("Abc\n");
  await page.keyboard.press("Escape");

  await page.getByTestId("extension-toggle-vim").click();
  await expect(page.getByTestId("vim-status")).toHaveCount(0);
  await focusEditor(page);
  await page.keyboard.press("End");
  await page.keyboard.type("x");
  await expect.poll(() => editorText(page)).toContain("x");
});

test("the notebook button follows its extension", async ({ page }) => {
  await expect(page.getByTestId("rail-notebook")).toBeVisible();
  await toggleExtension(page, "notebooks");
  await expect(page.getByTestId("rail-notebook")).toHaveCount(0);
});

test("Saarthi Autocomplete shows AI ghost text after a pause, and Tab accepts it", async ({ page }) => {
  // The dev and CI stacks answer with scripts/mock_llm.py, which continues "printf(" with a fixed text.
  const status = await (await page.request.get("/api/v1/assistant/status")).json();
  test.skip(!status.enabled, "no AI model is configured on this server");
  await toggleExtension(page, "ai-autocomplete", "autocomplete");
  await setEditorText(page, "#include <stdio.h>\n\nint main(void) {\n    int total = 3;\n    \n    return 0;\n}\n");
  await page.evaluate(() => {
    const editor = (window as unknown as { __kairoEditor: { setPosition(p: object): void; focus(): void } }).__kairoEditor;
    editor.setPosition({ lineNumber: 5, column: 5 });
    editor.focus();
  });
  await page.keyboard.type("printf(");
  const ghost = page.locator('.monaco-editor [class*="ghost-text"]');
  await expect(ghost.first()).toBeVisible({ timeout: 15_000 });
  await expect.poll(async () => (await ghost.allTextContents()).join("")).toContain("total");
  await page.keyboard.press("Tab");
  await expect.poll(() => editorText(page)).toContain('    printf("%d\\n", total);\n');
  expect(await editorText(page)).not.toContain("));");
});
