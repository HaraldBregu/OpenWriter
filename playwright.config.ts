import { defineConfig } from '@playwright/test'

/**
 * Playwright configuration for Electron E2E tests.
 *
 * The Electron app is launched programmatically via the _electron API
 * in each test file (not via webServer), so no global setup is needed here.
 */
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',

  /* Maximum time one test can run */
  timeout: 30_000,

  /* Expect timeout for assertions */
  expect: {
    timeout: 10_000
  },

  /* Retry failed tests once in CI, never locally */
  retries: process.env.CI ? 1 : 0,

  /* Run tests serially since Electron tests share the OS window system */
  workers: 1,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Reporter configuration */
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }]
  ],

  /* Output directory for test artifacts (screenshots, traces) */
  outputDir: 'test-results'
})
