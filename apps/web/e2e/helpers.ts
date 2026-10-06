import { test as base, expect, type APIRequestContext, type Page } from "@playwright/test";

/** Pages opened through the `page` fixture skip the boot sequence (it has its own test). */
export const test = base.extend({
  page: async ({ page }, use) => {
    await skipBoot(page);
    await use(page);
  },
});
export { expect };

/** The boot sequence shows once per tab; mark it as seen. */
export async function skipBoot(page: Page) {
  await page.addInitScript(() => sessionStorage.setItem("kairo.booted", "1"));
}

/** The fields of GET /api/v1/languages the tests use. */
export interface Language {
  id: string;
  displayName: string;
  sourceFile: string;
  status: "stable" | "experimental";
  available: boolean | null;
}

/** Whether the sandbox image for a language is installed (tests for missing ones are skipped). */
export async function isInstalled(request: APIRequestContext, id: string): Promise<boolean> {
  const languages: Language[] = await (await request.get("/api/v1/languages")).json();
  return languages.some((l) => l.id === id && l.available === true);
}

/** A returning guest: no entry page, no welcome dialog. */
export async function skipWelcome(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("cd.onboarded", "true");
    if (!localStorage.getItem("cd.profile")) {
      localStorage.setItem(
        "cd.profile",
        JSON.stringify({ id: "guest-e2e", name: "Tester", avatar: "comet", experience: "some", kind: "guest", createdAt: "2026-09-27T00:00:00Z" }),
      );
    }
  });
}

/** Through the entry page as a new guest. */
export async function enterAsGuest(page: Page, name = "Asha") {
  await expect(page.getByTestId("login-page")).toBeVisible({ timeout: 30_000 });
  await page.getByTestId("login-name").fill(name);
  await page.getByTestId("login-enter").click();
  await expect(page.getByTestId("workspace")).toBeVisible({ timeout: 30_000 });
}

export async function openApp(page: Page) {
  await page.goto("/");
  await expect(page.locator(".monaco-editor")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("health")).toContainText("Sandbox ready", { timeout: 30_000 });
}

export async function chooseLanguage(page: Page, id: string, name: string) {
  await page.getByTestId("language-picker").click();
  await page.getByTestId("language-search").fill(name);
  await page.getByTestId(`language-option-${id}`).click();
  await expect(page.getByTestId("language-picker")).toContainText(name);
}

export async function runExample(page: Page, id: string) {
  await page.getByTestId("open-examples").click();
  await page.getByTestId(`example-run-${id}`).click();
}

/** Replace the whole editor text (development builds expose the editor for tests). */
export async function setEditorText(page: Page, text: string) {
  await page.evaluate((value) => {
    const editor = (window as unknown as { __kairoEditor: { getModel(): { setValue(v: string): void; setEOL(eol: number): void } } }).__kairoEditor;
    editor.getModel().setValue(value);
    editor.getModel().setEOL(0); // "\n", as the app keeps it (setValue resets it to the platform's default)
  }, text);
}

export async function problemMarkers(page: Page) {
  return page.locator(".monaco-editor .squiggly-error").count();
}
