/**
 * E2E tests for theme toggling.
 * Verifies that the app starts in dark mode and can switch themes via nativeTheme.
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

test.describe('Theme', () => {
  test('should start with dark theme', async () => {
    // The app sets nativeTheme.themeSource = 'dark' on ready
    const themeSource = await ctx.app.evaluate(({ nativeTheme }) => {
      return nativeTheme.themeSource
    })
    expect(themeSource).toBe('dark')
  })

  test('should report dark mode active', async () => {
    const shouldUseDark = await ctx.app.evaluate(({ nativeTheme }) => {
      return nativeTheme.shouldUseDarkColors
    })
    expect(shouldUseDark).toBe(true)
  })

  test('should switch to light theme via nativeTheme', async () => {
    await ctx.app.evaluate(({ nativeTheme }) => {
      nativeTheme.themeSource = 'light'
    })
    await ctx.page.waitForTimeout(500)

    const themeSource = await ctx.app.evaluate(({ nativeTheme }) => {
      return nativeTheme.themeSource
    })
    expect(themeSource).toBe('light')

    const shouldUseDark = await ctx.app.evaluate(({ nativeTheme }) => {
      return nativeTheme.shouldUseDarkColors
    })
    expect(shouldUseDark).toBe(false)
  })

  test('should switch back to dark theme', async () => {
    await ctx.app.evaluate(({ nativeTheme }) => {
      nativeTheme.themeSource = 'dark'
    })
    await ctx.page.waitForTimeout(500)

    const themeSource = await ctx.app.evaluate(({ nativeTheme }) => {
      return nativeTheme.themeSource
    })
    expect(themeSource).toBe('dark')
  })
})
