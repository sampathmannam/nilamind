import { defineConfig } from "@playwright/test";

// Web-layer E2E + a11y for the Capacitor WebView UI. The app is a React web app inside an Android WebView,
// so Playwright drives the exact same UI in Chromium — free, fast, no device. Native Capacitor plugins
// fall back to their web/no-op implementations (same as the vite dev preview).
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: false,
  reporter: [["list"]],
  webServer: {
    command: "npx vite preview --port 4173 --strictPort",
    url: "http://localhost:4173",
    reuseExistingServer: true,
    timeout: 120_000,
  },
  use: {
    baseURL: "http://localhost:4173",
    viewport: { width: 390, height: 844 }, // phone-sized
  },
});
