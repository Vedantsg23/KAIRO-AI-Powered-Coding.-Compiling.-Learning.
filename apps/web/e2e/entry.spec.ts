import { enterAsGuest, expect, test } from "./helpers";

// The entry page's chapters: the tone (dark or light) and the background
// scene follow the chapter in the middle of the screen; the top bar's links
// scroll there; Saarthi says hello big and welcomes a new guest.

test("the page turns dark or light by chapter, with its own background, and the links scroll there", async ({ page }) => {
  await page.goto("/");
  const entry = page.getByTestId("login-page");
  await expect(entry).toHaveAttribute("data-chapter", "hero");
  const heroTone = (await entry.getAttribute("data-tone"))!;
  const other = heroTone === "dark" ? "light" : "dark";

  await page.getByTestId("nav-sandbox").click();
  await expect(entry).toHaveAttribute("data-chapter", "pipeline");
  await expect(entry).toHaveAttribute("data-tone", other);
  await expect(page.getByTestId("scene-canvas")).toHaveAttribute("data-scene", "grid");
  // The whole page follows: its background is the chapter's tone.
  const background = await entry.evaluate((el) => getComputedStyle(el).getPropertyValue("--cd-canvas").trim());
  expect(background).not.toBe("");

  await page.getByTestId("nav-analyzer").click();
  await expect(entry).toHaveAttribute("data-chapter", "try");
  await expect(page.getByTestId("scene-canvas")).toHaveAttribute("data-scene", "waves");

  await page.getByTestId("nav-languages").click();
  await expect(entry).toHaveAttribute("data-chapter", "languages");
  await expect(entry).toHaveAttribute("data-tone", heroTone);
  await expect(page.getByTestId("scene-canvas")).toHaveAttribute("data-scene", "stars");

  await entry.evaluate((el) => el.scrollTo({ top: el.scrollHeight }));
  await expect(entry).toHaveAttribute("data-chapter", "demo");
  await expect(page.getByTestId("scene-canvas")).toHaveAttribute("data-scene", "orbits");
});

test("Saarthi jumps out big to say hello, goes back, and welcomes a new guest", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("nav-saarthi").click();
  await expect(page.getByTestId("saarthi-hello")).toBeVisible();
  await expect(page.getByTestId("saarthi-hello-title")).toHaveText("Hii! I'm Saarthi");
  await expect(page.getByTestId("saarthi-hello")).toHaveCount(0, { timeout: 10_000 });

  // Clicking Saarthi on the stage does it too.
  await page.getByTestId("hero-saarthi").click();
  await expect(page.getByTestId("saarthi-hello-title")).toHaveText("Hii! I'm Saarthi");
  await page.keyboard.press("Escape"); // any key sends Saarthi back early
  await expect(page.getByTestId("saarthi-hello")).toHaveCount(0, { timeout: 5_000 });

  await enterAsGuest(page, "Asha");
  await expect(page.getByTestId("saarthi-hello-title")).toHaveText("Welcome, Asha!", { timeout: 5_000 });
});
