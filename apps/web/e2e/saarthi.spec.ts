import { expect, openApp, runExample, skipWelcome, test } from "./helpers";

// Saarthi end to end. These tests need the API to use the canned test
// provider (scripts/mock_llm.py, see README "Testing Saarthi"); with a real
// provider or none they are skipped, since answers would not be predictable.
test.beforeEach(async ({ page, request }) => {
  const status = await (await request.get("/api/v1/assistant/status")).json();
  test.skip(status.model !== "mock-saarthi", "needs the mock AI provider (scripts/mock_llm.py)");
  await skipWelcome(page);
  await openApp(page);
});

test("explain uses the run's evidence and says it is not verified", async ({ page }) => {
  await runExample(page, "missing-semicolon");
  await page.locator('[data-code="C_MISSING_SEMICOLON"]').getByTestId("explain-button").click();
  const card = page.getByTestId("saarthi-explanation");
  await expect(card).toContainText("expected ',' or ';' before 'printf'");
  await expect(card).toContainText("not verified");
  await card.getByRole("button", { name: /Show line 5/ }).click();
  await expect(page.getByTestId("cursor")).toHaveText("Ln 5, Col 1");
});

test("a suggested fix is shown as a patch, applied only on request, and verified by a real run", async ({ page }) => {
  await runExample(page, "missing-semicolon");
  await page.locator('[data-code="C_MISSING_SEMICOLON"]').getByTestId("fix-button").click();
  const fix = page.getByTestId("saarthi-fix-card");
  await expect(fix.getByTestId("patch-diff")).toContainText("int apples = 5;");
  // Nothing changed yet.
  await expect(page.locator(".monaco-editor")).not.toContainText("apples = 5;");

  await page.getByTestId("apply-and-verify").click();
  await expect(page.getByTestId("fix-verdict")).toContainText("Verified by a real run", { timeout: 30_000 });
  await expect(page.getByTestId("program-stdout")).toContainText("I have 5 apples");

  await page.getByTestId("undo-fix").click();
  await expect(page.locator(".monaco-editor")).toContainText("int apples = 5");
  await expect(page.locator(".monaco-editor")).not.toContainText("apples = 5;");
});

test("asking a question sends it only on Enter and shows the answer", async ({ page }) => {
  await page.getByTestId("open-saarthi").click();
  // A unique question, so the server's answer cache cannot hide a regression.
  await page.getByTestId("saarthi-input").fill(`What is a pointer? (${Date.now()})`);
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("saarthi-chat")).toContainText("You asked: What is a pointer?");
  await expect(page.getByTestId("saarthi-chat")).toContainText("not from an AI");
});

test("after editing, Saarthi asks for a new run instead of answering about old code", async ({ page }) => {
  await runExample(page, "typo");
  await expect(page.locator('[data-code="C_UNDECLARED_IDENTIFIER"]')).toBeVisible();
  await page.locator(".monaco-editor .view-lines").click();
  await page.keyboard.press("Control+End");
  await page.keyboard.type("\n// changed");
  await page.getByTestId("open-saarthi").click();
  await expect(page.getByTestId("saarthi-context")).toContainText("Your code changed after the last run");
  await expect(page.getByTestId("saarthi-explain")).toHaveCount(0);
});
