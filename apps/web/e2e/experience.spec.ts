import { expect, openApp, runExample, skipBoot, skipWelcome, test } from "./helpers";

// The entry page, profiles, badges, Saarthi's floating companion, the build
// pipeline and the workspace's mood.

test("a new guest picks a name, an emblem and a start language, then lands in the workspace", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("login-page")).toBeVisible();
  await expect(page.getByTestId("hero-stage")).toBeVisible();
  // Accounts (Google, GitHub, Microsoft, phone, email) stay off until the server is connected to Supabase.
  await page.getByTestId("login-tab-signin").click();
  await expect(page.getByTestId("login-accounts-off")).toBeVisible();
  await expect(page.getByTestId("login-google")).toBeDisabled();
  await expect(page.getByTestId("login-github")).toBeDisabled();
  await expect(page.getByTestId("login-microsoft")).toBeDisabled();
  await expect(page.getByTestId("login-phone-send")).toBeDisabled();
  await expect(page.getByTestId("login-email-signin")).toBeDisabled();
  await page.getByTestId("login-to-signup").click();
  await expect(page.getByTestId("signup-create")).toBeDisabled();
  await page.getByTestId("login-use-guest").click();

  // A name is required.
  await page.getByTestId("login-enter").click();
  await expect(page.getByRole("alert")).toContainText("Tell Saarthi your name");

  await page.getByTestId("login-name").fill("Meera");
  await expect(page.getByTestId("login-greeting")).toHaveText("Namaste, Meera!");
  await page.getByTestId("login-avatar-planet").click();
  await page.getByTestId("login-experience-confident").click();
  await page.getByTestId("login-start-python").click();
  await page.getByTestId("login-enter").click();

  await expect(page.getByTestId("workspace")).toBeVisible();
  await expect(page.getByTestId("welcome-greeting")).toHaveText("Namaste, Meera!");
  await page.getByTestId("welcome-start").click();
  await expect(page.getByTestId("file-name")).toHaveText("main.py");
  await expect(page.getByTestId("profile-chip")).toHaveAttribute("aria-label", /Meera/);

  // The profile is remembered: no entry page after a reload.
  await page.reload();
  await expect(page.locator(".monaco-editor")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("login-page")).toHaveCount(0);

  // Switching profile goes back to the entry page, which offers to continue.
  await page.getByTestId("profile-chip").click();
  await page.getByTestId("sign-out").click();
  await expect(page.getByTestId("login-page")).toBeVisible();
  await page.getByRole("button", { name: /Meera/ }).click();
  await expect(page.getByTestId("workspace")).toBeVisible();
  await expect(page.getByTestId("profile-chip")).toHaveAttribute("aria-label", /Meera/);
});

test("the entry page works from the keyboard", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("login-name").fill("Kiran");
  await page.getByTestId("login-avatar-comet").focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByTestId("login-avatar-satellite")).toBeFocused();
  await expect(page.getByTestId("login-avatar-satellite")).toHaveAttribute("aria-checked", "true");
  await page.getByTestId("login-name").press("Enter");
  await expect(page.getByTestId("workspace")).toBeVisible();
});

test("a first clean run earns First Build, XP and a day streak", async ({ page }) => {
  await skipWelcome(page);
  await openApp(page);
  await page.getByTestId("run-button").click();
  await expect(page.getByTestId("exit-line")).toContainText("exited with status 0");
  await expect(page.getByTestId("badge-toast")).toContainText("First Build");
  await expect(page.getByTestId("streak")).toContainText("1");

  // The build pipeline reached the end.
  const stations = page.getByTestId("pipeline").locator(".cd-station");
  await expect(stations.last()).toHaveAttribute("data-status", "done");
  await expect(page.getByTestId("pipeline").locator('.cd-station[data-status="done"]')).toHaveCount(await stations.count());

  await page.getByTestId("profile-chip").click();
  await expect(page.getByTestId("profile-card")).toBeVisible();
  await expect(page.getByTestId("badge-first-light")).toHaveAttribute("data-earned", "true");
  await expect(page.getByTestId("badge-bug-squasher")).toHaveAttribute("data-earned", "false");
  await expect(page.getByTestId("profile-xp")).toContainText(/\d+ XP/);
});

test("a badge card never covers a menu the student opens", async ({ page }) => {
  // At this width the card (centred) and the language menu (left) overlap.
  await page.setViewportSize({ width: 1280, height: 800 });
  await skipWelcome(page);
  await openApp(page);
  await page.getByTestId("run-button").click();
  await expect(page.getByTestId("badge-toast")).toBeVisible();
  // The card stays for about five seconds; the menu must work meanwhile.
  // (C++ shares the C image, so this needs nothing more than the run above.)
  await page.getByTestId("language-picker").click();
  await page.getByTestId("language-search").fill("C++");
  await page.getByTestId("language-option-cpp").click({ timeout: 2_000 });
  await expect(page.getByTestId("language-picker")).toContainText("C++");
});

test("Saarthi's floating companion reacts to runs, and the workspace follows the mood", async ({ page }) => {
  await skipWelcome(page);
  await openApp(page);
  const shell = page.locator(".cd-app");
  const companion = page.getByTestId("companion");

  await runExample(page, "missing-semicolon");
  await expect(page.locator('[data-code="C_MISSING_SEMICOLON"]')).toBeVisible();
  const bubble = page.getByTestId("companion-bubble");
  await expect(bubble).toHaveAttribute("data-tone", "error");
  await expect(bubble).toContainText("compiler stopped on line 5");
  await expect(companion.getByTestId("saarthi-mascot")).toHaveAttribute("data-mood", "concerned");
  await expect(shell).toHaveAttribute("data-mood", "error");

  // Fix it: the next clean run counts as a fixed error.
  await page.locator(".monaco-editor .view-lines").click();
  await page.keyboard.press("Control+Home");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("End");
  await page.keyboard.type(";");
  await page.getByTestId("run-button").click();
  await expect(page.getByTestId("exit-line")).toContainText("exited with status 0");
  await expect(bubble).toHaveAttribute("data-tone", "success");
  await expect(shell).toHaveAttribute("data-mood", /success|calm|typing/);
  await expect(page.getByTestId("badge-toast").first()).toBeVisible();
});

test("animations can be switched off", async ({ page }) => {
  await skipWelcome(page);
  await openApp(page);
  await expect(page.locator(".cd-app")).toHaveAttribute("data-motion", "on");
  await page.getByTestId("profile-chip").click();
  await page.getByRole("switch", { name: "Animations" }).click();
  await expect(page.locator(".cd-app")).toHaveAttribute("data-motion", "off");
  await page.reload();
  await expect(page.locator(".cd-app")).toHaveAttribute("data-motion", "off");
});

test("on a phone the entry page does not scroll sideways", async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await skipBoot(page);
  await page.goto("/");
  await expect(page.getByTestId("login-page")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.getByTestId("login-name").scrollIntoViewIfNeeded();
  await page.getByTestId("login-name").fill("Ravi");
  await page.getByTestId("login-enter").click();
  await expect(page.getByTestId("workspace")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.close();
});
