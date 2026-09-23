import { defineConfig, devices } from '@playwright/test';

/**
 * Phase 0 runs against BOTH servers: the production preview (port 4173) and the
 * dev server (port 5173). TC-P0-01 asks that dev and build behave identically,
 * so the suite has to be able to reach both rather than assume it.
 */
export const PREVIEW_URL = 'http://localhost:4173';
export const DEV_URL = 'http://localhost:5173';

export default defineConfig({
  testDir: './tests/e2e',
  // Specs are independent — each drives its own page through the debug API.
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  reporter: process.env.CI ? 'list' : [['list'], ['html', { open: 'never' }]],
  timeout: 60_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: PREVIEW_URL,
    // The debug API is gated out of production builds; tests opt in explicitly,
    // which also proves the gate works.
    trace: 'retain-on-failure',
    video: 'off',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
        launchOptions: {
          args: [
            // Software WebGL so the suite runs headless and in CI without a GPU.
            '--enable-unsafe-swiftshader',
            '--use-gl=angle',
            '--js-flags=--expose-gc',
          ],
        },
      },
    },
  ],

  webServer: [
    {
      command: 'npm run preview',
      url: PREVIEW_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: 'npm run dev',
      url: DEV_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
