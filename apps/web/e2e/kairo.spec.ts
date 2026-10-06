import { chooseLanguage, expect, openApp, setEditorText, skipBoot, skipWelcome, test, type Language } from "./helpers";

// The KAIRO console: boot sequence, live quick fixes, concept detection,
// the explorer, the language runtimes, Ctrl+S, the floating Saarthi and the
// default theme.

test("the boot sequence reports real checks, reaches SYSTEM READY, and shows once per tab", async ({ browser, request }) => {
  // The runtimes line counts what the API reports.
  const languages: Language[] = await (await request.get("/api/v1/languages")).json();
  const ready = languages.filter((l) => l.available === true).length;
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  // The boot leaves by itself about a second after SYSTEM READY, so what it
  // shows at that moment is recorded in the page instead of polled from here.
  await page.addInitScript(() => {
    const seen = { ready: false, lines: [] as string[] };
    (window as unknown as { __boot: typeof seen }).__boot = seen;
    new MutationObserver(() => {
      if (seen.ready || !document.querySelector('[data-testid="boot-ready"]')) return;
      seen.ready = true;
      seen.lines = [...document.querySelectorAll('[data-testid="boot-line"]')].map((line) => line.textContent ?? "");
    }).observe(document, { childList: true, subtree: true });
  });
  await page.goto("/");
  const boot = page.getByTestId("boot");
  await expect(boot).toBeVisible();
  const recorded = () => page.evaluate(() => (window as unknown as { __boot: { ready: boolean; lines: string[] } }).__boot);
  await expect.poll(async () => (await recorded()).ready, { timeout: 10_000 }).toBe(true);
  const { lines } = await recorded();
  expect(lines).toHaveLength(7);
  expect(lines[1]).toContain(`${ready}/${languages.length} READY`);
  // The entry page appears only as the boot leaves.
  await expect(boot).toHaveCount(0, { timeout: 10_000 });
  await expect(page.getByTestId("login-page")).toBeVisible();
  // Same tab: no boot after a reload.
  await page.reload();
  await expect(page.getByTestId("login-page")).toBeVisible();
  await expect(page.getByTestId("boot")).toHaveCount(0);
  await page.close();
});

test("the boot sequence can be skipped with any key", async ({ browser }) => {
  const page = await browser.newPage();
  await page.goto("/");
  await expect(page.getByTestId("boot")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("boot")).toHaveCount(0);
  await page.close();
});

test("the signal (light) theme is the default; dark is a choice", async ({ page }) => {
  await skipWelcome(page);
  await openApp(page);
  await expect(page.locator("html")).not.toHaveClass(/dark/);
});

test("a live slip gets WHY, CONCEPT and a rule-based quick fix that the analyzer then verifies", async ({ page }) => {
  await skipWelcome(page);
  await openApp(page);
  await chooseLanguage(page, "python", "Python");
  await setEditorText(page, "def area(w, h)\n    return w * h\n\nprint(area(3, 4))\n");
  const card = page.getByTestId("live-analysis");
  await expect(card).toContainText("Missing ':' at the end of this 'def' line");
  await expect(card).toContainText("LIVE_COLON");
  await expect(card).toContainText("Block headers");
  await expect(page.getByTestId("live-fix-preview")).toContainText("def area(w, h):");
  // Nothing is sent to the server for a quick fix (requests are watched from here on).
  const runs: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/v1/executions")) runs.push(r.url());
  });
  await page.getByTestId("apply-live-fix").click();
  await expect(page.getByTestId("live-fix-status")).toHaveAttribute("data-status", "passed");
  await expect(page.getByTestId("live-status")).toContainText("Syntax OK");
  await expect(page.locator(".monaco-editor")).toContainText("def area(w, h):");
  expect(runs).toEqual([]);
  // The fix is one undo step.
  await page.locator(".monaco-editor .view-lines").click();
  await page.keyboard.press("Control+Z");
  await expect(page.getByTestId("live-analysis")).toBeVisible();
});

test("the diagnostics list offers the same quick fix, and Apply & run compiles the fixed code", async ({ page }) => {
  await skipWelcome(page);
  await openApp(page);
  await setEditorText(page, '#include <stdio.h>\n\nint main(void) {\n    int apples = 5\n    printf("%d apples\\n", apples);\n    return 0;\n}\n');
  await expect(page.getByTestId("live-fix")).toContainText("Add ';'");
  await page.getByTestId("apply-live-fix-run").click();
  await expect(page.getByTestId("exit-line")).toContainText("Process exited with status 0", { timeout: 30_000 });
  await expect(page.getByTestId("program-stdout")).toContainText("5 apples");
});

test("the concept at the cursor is detected from the syntax tree", async ({ page }) => {
  await skipWelcome(page);
  await openApp(page);
  await setEditorText(page, '#include <stdio.h>\n\nint main(void) {\n    int total = 400;\n    printf("Total: %d\\n", total);\n    return 0;\n}\n');
  await page.locator(".monaco-editor .view-lines").click();
  await page.keyboard.press("Control+Home");
  for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowDown");
  await page.keyboard.press("End");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  const concept = page.getByTestId("concept-card");
  await expect(concept).toContainText("Input & output");
  await expect(concept).toContainText("Formatted output (printf)");
  await expect(concept).toContainText("in main()");
  await expect(page.getByTestId("concept-strip")).toContainText("Formatted output (printf)");
});

test("the explorer opens drafts as files, runs examples, and shows the system status", async ({ page }) => {
  await skipWelcome(page);
  await openApp(page);
  const explorer = page.getByTestId("explorer");
  await expect(explorer.getByTestId("explorer-file-c")).toHaveAttribute("aria-current", "true");
  await expect(page.getByTestId("system-status")).toContainText("online");
  await page.getByTestId("explorer-run-hello-input").click();
  await expect(page.getByTestId("program-stdout")).toContainText("Hello, Vedant! Welcome to C.", { timeout: 30_000 });
  // Another language's draft appears as a file once it has been opened.
  await chooseLanguage(page, "python", "Python");
  await page.getByTestId("explorer-file-c").click();
  await expect(page.getByTestId("file-name")).toHaveText("main.c");
  await expect(explorer.getByTestId("explorer-file-python")).toBeVisible();
  // The explorer can be hidden and comes back.
  await page.getByRole("button", { name: "Hide the explorer" }).click();
  await expect(explorer).toHaveCount(0);
  await page.getByRole("button", { name: "Show the explorer" }).click();
  await expect(page.getByTestId("explorer")).toBeVisible();
});

test("the language selector shows each runtime's availability", async ({ page, request }) => {
  const languages: Language[] = await (await request.get("/api/v1/languages")).json();
  const installed = languages.filter((l) => l.available === true);
  const missing = languages.filter((l) => l.available === false);
  await skipWelcome(page);
  await openApp(page);
  await page.getByTestId("language-picker").click();
  // HTML, CSS and React run in the browser's preview, so they are always ready.
  const browser = ["html", "css", "react"];
  await expect(page.getByTestId("language-count")).toHaveText(`${installed.length + browser.length}/${languages.length + browser.length} READY`);
  await expect(page.getByTestId(`language-option-${installed[0].id}`)).toContainText("READY");
  for (const id of browser) await expect(page.getByTestId(`language-option-${id}`)).toContainText("READY");
  for (const l of missing) {
    await expect(page.getByTestId(`language-unavailable-${l.id}`)).toContainText("OFFLINE");
    await expect(page.getByTestId(`language-unavailable-${l.id}`)).toHaveAttribute("aria-disabled", "true");
  }
});

test("Ctrl+S saves the draft right away and never opens the browser's save dialog", async ({ page }) => {
  await skipWelcome(page);
  await openApp(page);
  await page.locator(".monaco-editor .view-lines").click();
  await page.keyboard.press("Control+End");
  await page.keyboard.type("\n// saved with ctrl+s");
  await page.keyboard.press("Control+S");
  await expect(page.getByText("Draft saved")).toBeVisible();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("cd.drafts") ?? "{}").c as string);
  expect(stored).toContain("// saved with ctrl+s");
});

test("the floating Saarthi opens its panel, and the panel can be hidden", async ({ page }) => {
  await skipWelcome(page);
  await openApp(page);
  await expect(page.getByTestId("saarthi-panel")).toBeVisible();
  await page.getByRole("button", { name: "Hide Saarthi's panel" }).click();
  await expect(page.getByTestId("saarthi-panel")).toHaveCount(0);
  await page.getByTestId("companion").getByRole("button", { name: /Open Saarthi/ }).click();
  await expect(page.getByTestId("saarthi-panel")).toBeVisible();
  await expect(page.getByTestId("saarthi-loop")).toContainText("Verify");
});

test("on a tablet the console stacks and nothing scrolls sideways", async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 820, height: 1180 } });
  await skipBoot(page);
  await skipWelcome(page);
  await openApp(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(820);
  await page.getByTestId("run-button").click();
  await page.getByTestId("tab-output").click();
  await expect(page.getByTestId("program-stdout")).toContainText("Total: 400");
  await page.getByTestId("side-tab-saarthi").click();
  await expect(page.getByTestId("saarthi-panel")).toBeVisible();
  await page.close();
});
