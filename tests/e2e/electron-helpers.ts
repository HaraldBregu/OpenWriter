/**
 * Shared helpers for launching and interacting with the Electron app
 * in Playwright E2E tests.
 *
 * Usage:
 *   import { launchApp, closeApp } from './electron-helpers'
 *
 *   let ctx: AppContext
 *   test.beforeAll(async () => { ctx = await launchApp() })
 *   test.afterAll(async () => { await closeApp(ctx) })
 */
import { _electron as electron, type ElectronApplication, type Page } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export interface AppContext {
  /** The Playwright ElectronApplication handle */
  app: ElectronApplication
  /** The first (main) renderer window page */
  page: Page
}

/**
 * Launch the built Electron application and wait for the first window.
 *
 * Prerequisites: the app must have been built (`npm run build` or
 * `electron-vite build`) so that `out/main/index.js` exists.
 */
export async function launchApp(): Promise<AppContext> {
  const mainPath = path.resolve(__dirname, '../../out/main/index.js')

  const app = await electron.launch({
    args: [mainPath],
    // Suppress GPU sandbox errors on CI / headless Windows
    env: {
      ...process.env,
      NODE_ENV: 'production'
    }
  })

  // Wait for the first BrowserWindow to appear
  const page = await app.firstWindow()

  // Wait for the renderer to finish initial loading
  await page.waitForLoadState('domcontentloaded')

  return { app, page }
}

/**
 * Gracefully close the Electron application.
 */
export async function closeApp(ctx: AppContext): Promise<void> {
  if (ctx.app) {
    await ctx.app.close()
  }
}

/**
 * Wait for the app to be fully rendered by checking for a known DOM element.
 * The WelcomePage always renders a TitleBar, so we wait for that.
 */
export async function waitForAppReady(page: Page): Promise<void> {
  // Wait for any meaningful content to appear in the DOM
  // The app always has a root element that React mounts into
  await page.waitForSelector('#root', { state: 'attached', timeout: 15_000 })
  // Give React a moment to hydrate
  await page.waitForTimeout(500)
}

/**
 * Navigate to a specific hash route within the app.
 * Since the app uses HashRouter, we evaluate navigation in the renderer.
 */
export async function navigateTo(page: Page, hashPath: string): Promise<void> {
  await page.evaluate((path) => {
    window.location.hash = `#${path}`
  }, hashPath)
  // Wait for the route change to settle
  await page.waitForTimeout(500)
}

/**
 * Get the current hash route from the renderer.
 */
export async function getCurrentRoute(page: Page): Promise<string> {
  return page.evaluate(() => window.location.hash)
}

/**
 * Get the title of the Electron BrowserWindow (not the page title).
 */
export async function getWindowTitle(app: ElectronApplication): Promise<string> {
  const page = await app.firstWindow()
  return page.title()
}
