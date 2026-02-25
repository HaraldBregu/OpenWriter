/**
 * E2E tests for page navigation.
 * Verifies hash-based routing between WelcomePage, Home, Dashboard, and other pages.
 */
import { test, expect } from '@playwright/test'
import { launchApp, closeApp, waitForAppReady, navigateTo, getCurrentRoute, type AppContext } from './electron-helpers'

let ctx: AppContext

test.beforeAll(async () => {
  ctx = await launchApp()
  await waitForAppReady(ctx.page)
})

test.afterAll(async () => {
  await closeApp(ctx)
})

test.describe('Navigation', () => {
  test('should start on the WelcomePage (root hash)', async () => {
    const hash = await getCurrentRoute(ctx.page)
    // HashRouter root is either "#/" or "#" or ""
    expect(hash === '' || hash === '#/' || hash === '#').toBeTruthy()
  })

  test('should navigate to the Home page', async () => {
    await navigateTo(ctx.page, '/home')
    await ctx.page.waitForTimeout(1000) // Allow lazy-loaded page to render

    const hash = await getCurrentRoute(ctx.page)
    expect(hash).toContain('/home')
  })

  test('should render the AppLayout with sidebar on inner pages', async () => {
    // After navigating away from WelcomePage, the AppLayout should be active
    // The AppLayout includes a sidebar toggle button with title "Toggle sidebar"
    const toggleBtn = ctx.page.locator('button[title="Toggle sidebar"]')
    await expect(toggleBtn).toBeVisible({ timeout: 10_000 })
  })

  test('should navigate to the Dashboard page', async () => {
    await navigateTo(ctx.page, '/dashboard')
    await ctx.page.waitForTimeout(1000)

    const hash = await getCurrentRoute(ctx.page)
    expect(hash).toContain('/dashboard')
  })

  test('should navigate to the Settings page', async () => {
    await navigateTo(ctx.page, '/settings')
    await ctx.page.waitForTimeout(1000)

    const hash = await getCurrentRoute(ctx.page)
    expect(hash).toContain('/settings')
  })

  test('should navigate to the Clipboard page', async () => {
    await navigateTo(ctx.page, '/clipboard')
    await ctx.page.waitForTimeout(1000)

    const hash = await getCurrentRoute(ctx.page)
    expect(hash).toContain('/clipboard')
  })

  test('should navigate back to the WelcomePage', async () => {
    await navigateTo(ctx.page, '/')
    await ctx.page.waitForTimeout(1000)

    // WelcomePage should show the "OpenWriter" heading
    const heading = ctx.page.locator('h1')
    await expect(heading).toBeVisible({ timeout: 10_000 })
    const text = await heading.textContent()
    expect(text).toContain('OpenWriter')
  })
})
