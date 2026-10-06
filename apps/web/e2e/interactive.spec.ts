import { expect, openApp, skipWelcome, test } from "./helpers";

// The interactive layer: the command palette (Ctrl+K), Saarthi you can drag
// around the editor, the entry page's live analyzer playground, pipeline
// tour and custom cursor, and what changes when motion is off.

test("Ctrl+K opens the command palette: fuzzy search, languages, go to line, Esc", async ({ page }) => {
  await skipWelcome(page);
  await openApp(page);
  // From outside the editor.
  await page.getByTestId("file-name").click();
  await page.keyboard.press("Control+K");
  const palette = page.getByTestId("command-palette");
  await expect(palette).toBeVisible();
  await expect(page.getByTestId("command-input")).toBeFocused();
  await page.keyboard.type("pythn"); // fuzzy: letters in order
  await expect(page.getByTestId("command-lang-python")).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(palette).toHaveCount(0);
  await expect(page.getByTestId("file-name")).toHaveText("main.py");

  // ":N" jumps to a line; Esc closes without doing anything.
  await page.getByTestId("open-palette").click();
  await page.keyboard.type(":3");
  await expect(page.getByTestId("command-go-to-line")).toContainText("Go to line 3");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("cursor")).toContainText("Ln 3");
  await page.keyboard.press("Control+K");
  await expect(palette).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(palette).toHaveCount(0);
});

test("in the editor, Ctrl+K opens the palette and Monaco's Ctrl+K chords still work", async ({ page }) => {
  await skipWelcome(page);
  await openApp(page);
  await page.locator(".monaco-editor .view-lines").click();
  await page.keyboard.press("Control+Home");
  await page.keyboard.press("Control+K");
  await expect(page.getByTestId("command-palette")).toBeVisible();
  // Ctrl+K Ctrl+C: comment the line, as in VS Code.
  await page.keyboard.press("Control+C");
  await expect(page.getByTestId("command-palette")).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __kairoEditor: { getModel(): { getLineContent(n: number): string } } }).__kairoEditor.getModel().getLineContent(1)))
    .toMatch(/^\/\/ ?#include/);
  // Editor actions are in the palette too.
  await page.keyboard.press("Control+K");
  await page.keyboard.type("fold all");
  await expect(page.getByTestId("command-fold-all")).toBeVisible();
  await expect(page.locator("[role=option]").first()).toContainText("Fold all blocks");
  await page.keyboard.press("Escape");
});

test("Saarthi can be dragged around the editor; the spot is remembered and a click still opens it", async ({ page }) => {
  await skipWelcome(page);
  await openApp(page);
  const saarthi = () => page.getByTestId("companion").getByRole("button", { name: "Open Saarthi, the AI guide" });
  const button = saarthi();
  // Let the console's entrance animation settle before measuring.
  await page.waitForTimeout(1200);
  const before = (await button.boundingBox())!;
  await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
  await page.mouse.down();
  await page.mouse.move(before.x - 120, before.y - 90, { steps: 8 });
  await page.mouse.up();
  const after = (await button.boundingBox())!;
  expect(after.x).toBeLessThan(before.x - 80);
  expect(after.y).toBeLessThan(before.y - 50);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("k.saarthi.pos") ?? "null"));
  expect(saved).toEqual({ right: expect.any(Number), bottom: expect.any(Number) });
  // The spot survives a reload.
  await page.reload();
  await expect(page.locator(".monaco-editor")).toBeVisible();
  await expect.poll(async () => Math.abs((await saarthi().boundingBox())!.x - after.x)).toBeLessThan(4);
  const reloaded = (await saarthi().boundingBox())!;
  // Arrow keys move it too.
  await saarthi().focus();
  await page.keyboard.press("ArrowLeft");
  await expect.poll(async () => (await saarthi().boundingBox())!.x).toBeLessThan(reloaded.x - 8);
  // With Saarthi's panel hidden, a plain click (no drag) opens it.
  await page.getByRole("button", { name: "Hide Saarthi's panel" }).click();
  await expect(page.getByTestId("saarthi-panel")).toHaveCount(0);
  await saarthi().click();
  await expect(page.getByTestId("saarthi-panel")).toBeVisible();
});

test("the entry page: a real live-analyzer playground, the pipeline tour and the custom cursor", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("login-page")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName("Code. Compile. Learn with KAIRO.");
  // The custom cursor follows a mouse (decorative, never takes a click).
  await page.mouse.move(400, 300);
  await expect(page.getByTestId("custom-cursor")).toBeAttached();
  await expect(page.locator("html")).toHaveAttribute("data-kcursor", "on");
  await expect(page.getByTestId("pipeline-tour")).toBeAttached();

  // The playground loads the analyzer when it scrolls into view.
  await page.getByTestId("entry-playground").scrollIntoViewIfNeeded();
  const status = page.getByTestId("entry-playground-status");
  await expect(status).toContainText("1 syntax problem", { timeout: 20_000 });
  await page.getByTestId("entry-playground-fix").click();
  await expect(status).toContainText("Syntax OK");
  await expect(page.getByTestId("entry-playground-code")).toHaveValue(/int total = 0;/);
  // Python's slip has its own fix.
  await page.getByTestId("entry-playground-python").click();
  await expect(page.getByTestId("entry-playground-fix")).toContainText("Add ':'", { timeout: 20_000 });
  // Typing a new slip is caught too.
  await page.getByTestId("entry-playground-fix").click();
  await expect(status).toContainText("Syntax OK");
  await page.getByTestId("entry-playground-code").fill("if True\n    print('hi')\n");
  await expect(status).toContainText("syntax problem");

  // Launching still works, and the cursor is gone in the workspace.
  await page.getByTestId("login-name").fill("Asha");
  await page.getByTestId("login-enter").click();
  await expect(page.getByTestId("workspace")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("custom-cursor")).toHaveCount(0);
  await expect(page.locator("html")).not.toHaveAttribute("data-kcursor", "on");
});

test("Saarthi guides the pipeline tour from the middle of the page, changing face at every step", async ({ page }) => {
  await page.goto("/");
  const tour = page.getByTestId("pipeline-tour");
  await expect(tour).toBeAttached();
  // Scroll the entry page to the start of the tour: step 1, CODE.
  await page.getByTestId("login-page").evaluate((el) => {
    const start = document.querySelector<HTMLElement>('[data-testid="pipeline-tour"]')!.offsetTop;
    el.scrollTo(0, start);
  });
  await expect(tour).toHaveAttribute("data-step", "CODE");
  const saarthi = page.getByTestId("tour-saarthi");
  await expect(saarthi).toBeVisible();
  await expect(saarthi).toHaveAttribute("data-mood", "wave");
  // In the middle of the page.
  const box = (await saarthi.boundingBox())!;
  const width = page.viewportSize()!.width;
  expect(Math.abs(box.x + box.width / 2 - width / 2)).toBeLessThan(width * 0.1);
  // A step's node jumps there; Saarthi's face follows the step.
  await page.getByRole("button", { name: "DIAGNOSE" }).click();
  await expect(tour).toHaveAttribute("data-step", "DIAGNOSE", { timeout: 10_000 });
  await expect(saarthi).toHaveAttribute("data-mood", "concerned");
  await page.getByRole("button", { name: "VERIFY" }).click();
  await expect(tour).toHaveAttribute("data-step", "VERIFY", { timeout: 10_000 });
  await expect(saarthi).toHaveAttribute("data-mood", "happy");
  await expect(saarthi).toContainText("verified");
});

test("with reduced motion: no custom cursor, a static tour, no curtain, and the palette still works", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.addInitScript(() => {
    sessionStorage.setItem("kairo.booted", "1");
    localStorage.setItem("cd.onboarded", "true");
  });
  await page.goto("/");
  await expect(page.getByTestId("login-page")).toBeVisible();
  await page.mouse.move(400, 300);
  await expect(page.getByTestId("custom-cursor")).toHaveCount(0);
  await expect(page.getByTestId("pipeline-tour").locator("ol > li")).toHaveCount(7);
  await page.getByTestId("login-name").fill("Ravi");
  await page.getByTestId("login-enter").click();
  await expect(page.getByTestId("workspace")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("curtain")).toHaveCount(0);
  await page.keyboard.press("Control+K");
  await expect(page.getByTestId("command-palette")).toBeVisible();
  await context.close();
});

test("interface sounds are off by default and switch on in the profile", async ({ page }) => {
  await skipWelcome(page);
  await openApp(page);
  expect(await page.evaluate(() => localStorage.getItem("k.sound"))).toBeNull();
  await page.getByTestId("profile-chip").click();
  const toggle = page.getByRole("switch", { name: "Interface sounds" });
  await expect(toggle).toHaveAttribute("aria-checked", "false");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  expect(await page.evaluate(() => localStorage.getItem("k.sound"))).toBe("true");
});
