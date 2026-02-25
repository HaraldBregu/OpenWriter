/**
 * E2E tests for application launch.
 * Verifies the Electron app starts correctly, the main window renders,
 * and core UI elements (title bar, welcome page) are visible.
 */
import { test, expect } from '@playwright/test'
import { launchApp, closeApp, waitForAppReady, type AppContext } from './electron-helpers'

let ctx: AppContext

test.beforeAll(async () => {
  ctx = await launchApp()
  await waitForAppReady(ctx.page)
}, 60_000)

test.afterAll(async () => {
  await closeApp(ctx)
})

test.describe('App Launch', () => {
  test('should open a window', async () => {
    // The app should have at least one window open
    const windows = ctx.app.windows()
    expect(windows.length).toBeGreaterThanOrEqual(1)
  })

  test('should show the main window as visible', async () => {
    const isVisible = await ctx.app.evaluate(({ BrowserWindow }) => {
      const wins = BrowserWindow.getAllWindows()
      return wins.length > 0 && wins[0].isVisible()
    })
    expect(isVisible).toBe(true)
  })

  test('should render the root element', async () => {
    const root = ctx.page.locator('#root')
    await expect(root).toBeAttached()
  })

  test('should display the WelcomePage by default', async () => {
    // The WelcomePage shows "OpenWriter" heading
    const heading = ctx.page.locator('h1')
    await expect(heading).toBeVisible({ timeout: 10_000 })
    const text = await heading.textContent()
    expect(text).toContain('OpenWriter')
  })

  test('should display the title bar', async () => {
    // The TitleBar renders a span with the app title
    const titleSpan = ctx.page.locator('span:text("OpenWriter")').first()
    await expect(titleSpan).toBeVisible({ timeout: 10_000 })
  })

  test('should have correct initial window dimensions', async () => {
    const bounds = await ctx.app.evaluate(({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0]
      return win.getBounds()
    })
    // Window should be at least the minimum size
    expect(bounds.width).toBeGreaterThanOrEqual(800)
    expect(bounds.height).toBeGreaterThanOrEqual(600)
  })

  test('should have context isolation enabled', async () => {
    const contextIsolation = await ctx.app.evaluate(({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0]
      return win.webContents.getLastWebPreferences()?.contextIsolation
    })
    expect(contextIsolation).toBe(true)
  })

  test('should have nodeIntegration disabled', async () => {
    const nodeIntegration = await ctx.app.evaluate(({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0]
      return win.webContents.getLastWebPreferences()?.nodeIntegration
    })
    expect(nodeIntegration).toBe(false)
  })

  test('should expose the api bridge to the renderer', async () => {
    const hasApi = await ctx.page.evaluate(() => {
      return typeof (window as Record<string, unknown>).api === 'object'
    })
    expect(hasApi).toBe(true)
  })
})
