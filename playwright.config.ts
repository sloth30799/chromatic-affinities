import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.CA_PLAYWRIGHT_PORT ?? "3107");
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("CA_PLAYWRIGHT_PORT must be an available loopback port.");

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "Chromium desktop",
      use: { ...devices["Desktop Chrome"], browserName: "chromium", viewport: { width: 1440, height: 900 } },
    },
    {
      name: "Desktop WebKit",
      use: { ...devices["Desktop Safari"], browserName: "webkit", viewport: { width: 1440, height: 900 } },
    },
    {
      // This remains a genuine Playwright iPhone profile: Safari UA, touch,
      // mobile viewport and device scale factor all come from the descriptor.
      name: "iPhone 15 WebKit",
      use: { ...devices["iPhone 15"], browserName: "webkit" },
    },
  ],
  webServer: {
    command: `NEXT_PUBLIC_CA_TEST_MODE=1 npm run dev -- --webpack --hostname 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
  },
});
