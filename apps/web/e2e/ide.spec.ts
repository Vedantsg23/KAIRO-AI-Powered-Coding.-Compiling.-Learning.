import { chooseLanguage, enterAsGuest, expect, openApp, runExample, skipBoot, skipWelcome, test, type Language } from "./helpers";

test("first visit shows the welcome screen once", async ({ page }) => {
  await page.goto("/");
  await enterAsGuest(page, "Asha");
  await expect(page.getByRole("dialog", { name: "Welcome to KAIRO" })).toBeVisible();
  await expect(page.getByTestId("welcome-greeting")).toHaveText("Namaste, Asha!");
  await expect(page.getByTestId("welcome-tour")).toBeFocused();
  await page.getByTestId("welcome-start").click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".monaco-editor")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("the guided tour walks through every step", async ({ page }) => {
  await page.goto("/");
  await enterAsGuest(page);
  await page.getByTestId("welcome-tour").click();
  const tour = page.getByTestId("tour");
  for (let step = 1; step <= 8; step++) {
    await expect(tour).toContainText(`Step ${step} of 8`);
    await page.getByTestId("tour-next").click();
  }
  await expect(tour).toHaveCount(0);
});

test("the starter program compiles and runs", async ({ page }) => {
  await skipWelcome(page);
  await openApp(page);
  await page.getByTestId("run-button").click();
  await expect(page.getByTestId("exit-line")).toContainText("Process exited with status 0");
  await expect(page.getByTestId("program-stdout")).toContainText("Total: 400");
  await expect(page.getByText("No problems found")).toBeVisible();
});

test("a compile error is pinned to the line with a hint and a note", async ({ page }) => {
  await skipWelcome(page);
  await openApp(page);
  await runExample(page, "missing-semicolon");

  const card = page.locator('[data-code="C_MISSING_SEMICOLON"]');
  await expect(card).toContainText("expected ',' or ';' before 'printf'");
  await expect(card).toContainText("Line 4: The missing ';' probably belongs at the end of this line.");
  await expect(page.locator(".monaco-editor .squiggly-error").first()).toBeVisible();

  await card.getByText("What does this mean?").click();
  await expect(card).toContainText("Missing semicolon");
  await expect(card).toContainText("not AI");

  await card.getByRole("button", { name: /main\.c:5:5/ }).click();
  await expect(page.getByTestId("cursor")).toHaveText("Ln 5, Col 5");
});

test("editing after a run marks the results as stale", async ({ page }) => {
  await skipWelcome(page);
  await openApp(page);
  await runExample(page, "typo");
  await expect(page.locator('[data-code="C_UNDECLARED_IDENTIFIER"]')).toBeVisible();
  await expect(page.locator(".monaco-editor .squiggly-error")).toHaveCount(1);

  await page.locator(".monaco-editor .view-lines").click();
  await page.keyboard.press("Control+End");
  await page.keyboard.type("\n// edited");
  await expect(page.getByTestId("stale-banner")).toBeVisible();
  await expect(page.locator(".monaco-editor .squiggly-error")).toHaveCount(0);

  // Undo back to the exact compiled text: the results are current again.
  await page.keyboard.press("Control+Z");
  await page.keyboard.press("Control+Z");
  await expect(page.getByTestId("stale-banner")).toHaveCount(0);
});

test("a NULL pointer crash is explained and earlier output is kept", async ({ page }) => {
  await skipWelcome(page);
  await openApp(page);
  await runExample(page, "null-pointer");
  await expect(page.getByTestId("exit-line")).toContainText("Crashed with SIGSEGV (exit status 139)");
  await expect(page.getByTestId("program-stdout")).toContainText("About to use the pointer...");
  await expect(page.locator('[data-code="RUNTIME_SEGMENTATION_FAULT"]')).toBeVisible();
});

test("input from the Input tab reaches the program", async ({ page }) => {
  await skipWelcome(page);
  await openApp(page);
  await runExample(page, "hello-input");
  await expect(page.getByTestId("program-stdout")).toContainText("Hello, Vedant! Welcome to C.");
});

test("the language picker offers only installed languages and works from the keyboard", async ({ page, request }) => {
  const languages: Language[] = await (await request.get("/api/v1/languages")).json();
  const installed = languages.filter((l) => l.available === true);
  const missing = languages.filter((l) => l.available === false);
  await skipWelcome(page);
  await openApp(page);
  await page.getByTestId("language-picker").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("language-search")).toBeFocused();
  for (const l of installed) await expect(page.getByTestId(`language-option-${l.id}`)).toHaveCount(1);
  // A language whose sandbox image is not built (Swift, unless enabled) is never offered.
  for (const l of missing) await expect(page.getByTestId(`language-option-${l.id}`)).toHaveCount(0);
  const target = installed.find((l) => l.id !== "c");
  test.skip(!target, "only C is installed");
  await page.keyboard.type(target!.displayName);
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("file-name")).toHaveText(target!.sourceFile);
  await expect(page.getByTestId("language-picker")).toBeFocused();
});

test("fast typing never loses a keystroke, even while results re-render", async ({ page }) => {
  await skipWelcome(page);
  await openApp(page);
  await page.getByTestId("run-button").click();
  await expect(page.getByTestId("exit-line")).toContainText("exited with status 0");
  // Each keystroke now also updates the stale banner, markers and live check.
  await page.locator(".monaco-editor .view-lines").click();
  await page.keyboard.press("Control+End");
  const typed = "// the quick brown fox jumps over the lazy dog 0123456789 again and again";
  await page.keyboard.type(`\n${typed}`);
  // Read what the editor shows, so this also runs against a production build.
  const shown = () =>
    page.locator(".monaco-editor .view-lines").evaluate((el) => (el as HTMLElement).innerText.replace(/ /g, " "));
  await expect.poll(shown).toContain(typed);
});

test("each language keeps its own draft", async ({ page }) => {
  await skipWelcome(page);
  await openApp(page);
  await page.locator(".monaco-editor .view-lines").click();
  await page.keyboard.press("Control+End");
  await page.keyboard.type("\n// my C notes");
  await chooseLanguage(page, "python", "Python");
  await expect(page.locator(".monaco-editor")).toContainText("Welcome to Python");
  await chooseLanguage(page, "c", "C");
  // The note is at the end of the file: show the end (the editor only renders the lines in view).
  await page.locator(".monaco-editor .view-lines").click();
  await page.keyboard.press("Control+End");
  await expect(page.locator(".monaco-editor")).toContainText("my C notes");
});

test("the theme switch toggles light and dark and is remembered", async ({ page }) => {
  await skipWelcome(page);
  await openApp(page);
  const html = page.locator("html");
  const wasDark = (await html.getAttribute("class"))?.includes("dark") ?? false;
  await page.getByTestId("theme-toggle").click();
  await expect(html).toHaveClass(wasDark ? /^(?!.*dark)/ : /dark/);
  await page.reload();
  await expect(html).toHaveClass(wasDark ? /^(?!.*dark)/ : /dark/);
});

test("Ctrl+Enter runs the program from anywhere on the page", async ({ page }) => {
  await skipWelcome(page);
  await openApp(page);
  await page.getByTestId("tab-details").click();
  await page.keyboard.press("Control+Enter");
  await expect(page.getByTestId("details-state")).toHaveText("SUCCEEDED", { timeout: 30_000 });
});

test("on a phone-sized screen nothing scrolls sideways", async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await skipBoot(page);
  await skipWelcome(page);
  await openApp(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.getByTestId("run-button").click();
  await page.getByTestId("tab-output").click();
  await expect(page.getByTestId("program-stdout")).toContainText("Total: 400");
  await page.close();
});
