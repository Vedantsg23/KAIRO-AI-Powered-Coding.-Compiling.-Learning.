import manifest from "../src/onboarding/examples/manifest.json" with { type: "json" };
import { chooseLanguage, expect, isInstalled, openApp, runExample, skipWelcome, test } from "./helpers";

// Every installed language, through the browser: pick it, load its first
// example (which reads input or queries data) and check the program output.
// A language whose sandbox image is not built is skipped, not failed.
const LANGUAGES: [string, string, string][] = [
  ["c", "C", "main.c"],
  ["cpp", "C++", "main.cpp"],
  ["java", "Java", "Main.java"],
  ["python", "Python", "main.py"],
  ["javascript", "JavaScript", "main.js"],
  ["typescript", "TypeScript", "main.ts"],
  ["go", "Go", "main.go"],
  ["rust", "Rust", "main.rs"],
  ["csharp", "C#", "main.cs"],
  ["kotlin", "Kotlin", "main.kt"],
  ["php", "PHP", "main.php"],
  ["ruby", "Ruby", "main.rb"],
  ["lua", "Lua", "main.lua"],
  ["bash", "Bash", "main.sh"],
  ["sql", "SQL", "main.sql"],
];

type Entry = { id: string; outcome: string; expect: { stdout?: string; code?: string } };
const examples = manifest as unknown as Record<string, { examples: Entry[] }>;

for (const [id, name, file] of LANGUAGES) {
  test(`${name}: an example runs end to end in the browser`, async ({ page, request }) => {
    test.setTimeout(90_000);
    test.skip(!(await isInstalled(request, id)), `the ${name} sandbox image is not built`);
    await skipWelcome(page);
    await openApp(page);
    await chooseLanguage(page, id, name);
    await expect(page.getByTestId("file-name")).toHaveText(file);
    const example = examples[id].examples.find((e) => e.outcome === "runs")!;
    await runExample(page, example.id);
    await expect(page.getByTestId("exit-line")).toContainText("exited with status 0", { timeout: 60_000 });
    await expect(page.getByTestId("program-stdout")).toContainText(example.expect.stdout!);
  });

  test(`${name}: an error example is reported with its code`, async ({ page, request }) => {
    test.setTimeout(90_000);
    test.skip(!(await isInstalled(request, id)), `the ${name} sandbox image is not built`);
    await skipWelcome(page);
    await openApp(page);
    await chooseLanguage(page, id, name);
    const example = examples[id].examples.find((e) => e.outcome !== "runs" && e.expect.code)!;
    await runExample(page, example.id);
    await expect(page.locator(`[data-code="${example.expect.code}"]`)).toBeVisible({ timeout: 60_000 });
  });
}
