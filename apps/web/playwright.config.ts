import { defineConfig, devices } from "@playwright/test";

// End-to-end tests drive the real stack: browser -> Vite -> API -> runner -> Docker.
// Start the API and the runner first (see README), then: npm run e2e
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  // On CI a failed test runs once more: there a page load on the cold dev server
  // has twice stalled past the timeout. A real failure fails again and is reported.
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:5173",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: true,
    timeout: 60_000,
    // Keep the dev server's own log in the CI output, so a slow page load can be explained.
    stdout: process.env.CI ? "pipe" : "ignore",
  },
});
