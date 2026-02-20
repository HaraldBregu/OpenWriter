/**
 * E2E tests for the IPC bridge (preload API).
 * Verifies that the renderer can communicate with the main process
 * through the exposed window.api methods.
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

test.describe('IPC Bridge', () => {
  test('should expose the api object on window', async () => {
    const apiKeys = await ctx.page.evaluate(() => {
      return Object.keys((window as Record<string, unknown>).api as object)
    })
    expect(apiKeys.length).toBeGreaterThan(0)
    expect(apiKeys).toContain('windowMinimize')
    expect(apiKeys).toContain('windowMaximize')
    expect(apiKeys).toContain('windowClose')
    expect(apiKeys).toContain('getPlatform')
  })

  test('should get the platform via IPC', async () => {
    const platform = await ctx.page.evaluate(async () => {
      return await (window as any).api.getPlatform()
    })
    // The wrapped IPC handler returns { success: true, data: 'win32' }
    // or just the platform string depending on wrapping
    const platformValue = typeof platform === 'object' && platform.data
      ? platform.data
      : platform
    expect(['win32', 'darwin', 'linux']).toContain(platformValue)
  })

  test('should get window maximized state via IPC', async () => {
    const result = await ctx.page.evaluate(async () => {
      return await (window as any).api.windowIsMaximized()
    })
    // Result may be wrapped: { success: true, data: false } or just false
    const isMaximized = typeof result === 'object' && result !== null && 'data' in result
      ? result.data
      : result
    expect(typeof isMaximized).toBe('boolean')
  })

  test('should check network support via IPC', async () => {
    const isSupported = await ctx.page.evaluate(async () => {
      return await (window as any).api.networkIsSupported()
    })
    // Network is always supported
    expect(isSupported).toBe(true)
  })

  test('should check notification support via IPC', async () => {
    const isSupported = await ctx.page.evaluate(async () => {
      return await (window as any).api.notificationIsSupported()
    })
    expect(typeof isSupported).toBe('boolean')
  })

  test('should get bluetooth info via IPC', async () => {
    const info = await ctx.page.evaluate(async () => {
      return await (window as any).api.bluetoothGetInfo()
    })
    expect(info).toHaveProperty('platform')
    expect(info).toHaveProperty('supported')
    expect(info).toHaveProperty('apiAvailable')
  })

  test('should get lifecycle state via IPC', async () => {
    const state = await ctx.page.evaluate(async () => {
      return await (window as any).api.lifecycleGetState()
    })
    expect(state).toHaveProperty('isSingleInstance')
    expect(state).toHaveProperty('platform')
    expect(state.isSingleInstance).toBe(true)
  })

  test('should get agent status via IPC', async () => {
    const status = await ctx.page.evaluate(async () => {
      return await (window as any).api.agentGetStatus()
    })
    expect(status).toHaveProperty('totalSessions')
    expect(status).toHaveProperty('activeSessions')
    expect(status).toHaveProperty('totalMessages')
  })

  test('should read and write to clipboard via IPC', async () => {
    const testText = `e2e-test-${Date.now()}`

    await ctx.page.evaluate(async (text) => {
      await (window as any).api.clipboardWriteText(text)
    }, testText)

    const readBack = await ctx.page.evaluate(async () => {
      return await (window as any).api.clipboardReadText()
    })

    expect(readBack).toBe(testText)
  })
})
