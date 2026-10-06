import { chooseLanguage, expect, openApp, runExample, setEditorText, skipWelcome, test } from "./helpers";

// HTML, CSS and React run in the browser: a sandboxed preview frame (scripts
// allowed, opaque origin) and a console that links errors to their lines.

test.beforeEach(async ({ page }) => {
  await skipWelcome(page);
  await openApp(page);
});

test("HTML runs in the preview, updates while typing and reports console output", async ({ page }) => {
  await chooseLanguage(page, "html", "HTML");
  const frame = page.frameLocator('[data-testid="preview-frame"]');
  await expect(frame.locator("h1")).toHaveText("Hello from KAIRO", { timeout: 15_000 });
  await frame.locator("#counter").click();
  await expect(page.getByTestId("preview-console")).toContainText("clicks: 1");

  // Live Preview: the page follows the editor a moment after typing stops.
  await setEditorText(page, "<!doctype html>\n<h1>Typed live</h1>\n<script>console.log('hi from', 'the page')</script>\n");
  await expect(frame.locator("h1")).toHaveText("Typed live", { timeout: 10_000 });
  await expect(page.getByTestId("preview-console")).toContainText("hi from the page");

  // The frame has no access to KAIRO's page or storage.
  await setEditorText(page, "<!doctype html>\n<p id=o></p>\n<script>\ntry { localStorage.getItem('x'); document.getElementById('o').textContent = 'open'; } catch (e) { document.getElementById('o').textContent = 'isolated'; }\n</script>\n");
  await expect(frame.locator("#o")).toHaveText("isolated", { timeout: 10_000 });
});

test("a script error is shown in the console with its line", async ({ page }) => {
  await chooseLanguage(page, "html", "HTML");
  await runExample(page, "script-error");
  await expect(page.getByTestId("preview-console")).toContainText("getElementByID", { timeout: 15_000 });
  await expect(page.getByTestId("preview-status")).toHaveAttribute("data-status", "failed");
  await expect(page.getByTestId("preview-error-line")).toHaveText("line 11");
});

test("CSS styles the sample page", async ({ page }) => {
  await chooseLanguage(page, "css", "CSS");
  const frame = page.frameLocator('[data-testid="preview-frame"]');
  await expect(frame.locator(".site-header h1")).toHaveText("KAIRO Cafe", { timeout: 15_000 });
  await setEditorText(page, "h1 { color: rgb(255, 0, 0); }\n");
  await expect(frame.locator(".site-header h1")).toHaveCSS("color", "rgb(255, 0, 0)", { timeout: 10_000 });
});

test("React compiles in the browser, renders, and points at JSX and render errors", async ({ page }) => {
  await chooseLanguage(page, "react", "React");
  const frame = page.frameLocator('[data-testid="preview-frame"]');
  await expect(frame.locator("h1")).toHaveText("Hello, React!", { timeout: 20_000 });
  await frame.locator("button").click();
  await expect(frame.locator("button")).toHaveText("Clicked 1 times");

  await runExample(page, "jsx-error");
  await expect(page.getByTestId("preview-console")).toContainText("JSX:", { timeout: 15_000 });
  await expect(page.getByTestId("preview-error-line")).toBeVisible();

  await runExample(page, "runtime-error");
  await expect(page.getByTestId("preview-console")).toContainText("map", { timeout: 15_000 });
  await expect(page.getByTestId("preview-error-line").first()).toHaveText("line 5");
});
