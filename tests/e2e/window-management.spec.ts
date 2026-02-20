/**
 * E2E tests for window management.
 * Verifies minimize, maximize, restore, and window control buttons.
 */
import { test, expect } from '@playwright/test'
import { launchApp, closeApp, waitForAppReady, type AppContext } from './electron-helpers'

let ctx: AppContext

test.beforeAll(async () => {
  ctx = await launchApp()
  await waitForAppReady(ctx.page)
})

test.afterAll(async () => {
  await closeApp(ctx)
})

test.describe('Window Management', () => {
  test('should be able to maximize and restore the window via IPC', async () => {
    // Get initial maximized state
    const initiallyMaximized = await ctx.app.evaluate(({ BrowserWindow }) => {
      return BrowserWindow.getAllWindows()[0].isMaximized()
    })
    expect(initiallyMaximized).toBe(false)

    // Maximize the window
    await ctx.app.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()[0].maximize()
    })
    await ctx.page.waitForTimeout(300)

    const isMaximized = await ctx.app.evaluate(({ BrowserWindow }) => {
      return BrowserWindow.getAllWindows()[0].isMaximized()
    })
    expect(isMaximized).toBe(true)

    // Restore the window
    await ctx.app.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()[0].unmaximize()
    })
    await ctx.page.waitForTimeout(300)

    const isRestored = await ctx.app.evaluate(({ BrowserWindow }) => {
      return BrowserWindow.getAllWindows()[0].isMaximized()
    })
    expect(isRestored).toBe(false)
  })

  test('should be able to minimize and restore the window', async () => {
    // Minimize the window
    await ctx.app.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()[0].minimize()
    })
    await ctx.page.waitForTimeout(300)

    const isMinimized = await ctx.app.evaluate(({ BrowserWindow }) => {
      return BrowserWindow.getAllWindows()[0].isMinimized()
    })
    expect(isMinimized).toBe(true)

    // Restore the window
    await ctx.app.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()[0].restore()
    })
    await ctx.page.waitForTimeout(300)

    const isMinimizedAfter = await ctx.app.evaluate(({ BrowserWindow }) => {
      return BrowserWindow.getAllWindows()[0].isMinimized()
    })
    expect(isMinimizedAfter).toBe(false)
  })

  test('should have window control buttons rendered on non-macOS', async () => {
    const platform = await ctx.app.evaluate(() => process.platform)

    if (platform !== 'darwin') {
      // On Windows/Linux, the title bar has Minimize, Maximize, Close buttons
      const minimizeBtn = ctx.page.locator('button[title="Minimize"]')
      await expect(minimizeBtn).toBeVisible({ timeout: 5_000 })

      const maximizeBtn = ctx.page.locator('button[title="Maximize"], button[title="Restore"]')
      await expect(maximizeBtn).toBeVisible({ timeout: 5_000 })

      const closeBtn = ctx.page.locator('button[title="Close"]')
      await expect(closeBtn).toBeVisible({ timeout: 5_000 })
    }
  })

  test('should report window bounds correctly', async () => {
    const bounds = await ctx.app.evaluate(({ BrowserWindow }) => {
      return BrowserWindow.getAllWindows()[0].getBounds()
    })
    expect(bounds).toHaveProperty('x')
    expect(bounds).toHaveProperty('y')
    expect(bounds).toHaveProperty('width')
    expect(bounds).toHaveProperty('height')
    expect(bounds.width).toBeGreaterThan(0)
    expect(bounds.height).toBeGreaterThan(0)
  })

  test('should be able to resize the window', async () => {
    const originalBounds = await ctx.app.evaluate(({ BrowserWindow }) => {
      return BrowserWindow.getAllWindows()[0].getBounds()
    })

    await ctx.app.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()[0].setSize(900, 700)
    })
    await ctx.page.waitForTimeout(300)

    const newBounds = await ctx.app.evaluate(({ BrowserWindow }) => {
      return BrowserWindow.getAllWindows()[0].getBounds()
    })
    // Use tolerance of ±4px for Windows DPI scaling rounding
    expect(newBounds.width).toBeGreaterThanOrEqual(896)
    expect(newBounds.width).toBeLessThanOrEqual(904)
    expect(newBounds.height).toBeGreaterThanOrEqual(696)
    expect(newBounds.height).toBeLessThanOrEqual(704)

    // Restore original size -- pass bounds as the second argument
    // which becomes the second parameter of the callback
    await ctx.app.evaluate(({ BrowserWindow }, bounds) => {
      const win = BrowserWindow.getAllWindows()[0]
      win.setSize(bounds.width, bounds.height)
    }, { width: originalBounds.width, height: originalBounds.height })
  })
})
