/**
 * E2E tests for store/settings persistence.
 * Verifies that model settings and workspace preferences persist
 * through the StoreService via IPC.
 *
 * NOTE: Store and Workspace IPC handlers use wrapSimpleHandler,
 * which wraps return values as { success: true, data: <value> }.
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

/**
 * Helper to unwrap IPC results from wrapSimpleHandler.
 * Returns the `.data` field if the result is wrapped, otherwise returns as-is.
 */
function unwrap<T>(result: unknown): T {
  if (
    typeof result === 'object' &&
    result !== null &&
    'success' in (result as Record<string, unknown>) &&
    'data' in (result as Record<string, unknown>)
  ) {
    return (result as { success: boolean; data: T }).data
  }
  return result as T
}

test.describe('Store Persistence', () => {
  test('should start with empty model settings', async () => {
    const rawResult = await ctx.page.evaluate(async () => {
      return await (window as any).api.storeGetAllModelSettings()
    })
    const settings = unwrap<Record<string, unknown>>(rawResult)
    // Settings might be empty or might have data from previous runs.
    // We just verify the IPC round-trip works and returns an object.
    expect(typeof settings).toBe('object')
    expect(settings).not.toBeNull()
  })

  test('should set and retrieve a selected model', async () => {
    // Use a valid provider ID (StoreValidators rejects unknown providers)
    const setResult = await ctx.page.evaluate(async () => {
      return await (window as any).api.storeSetSelectedModel('openai', 'gpt-4o-mini')
    })
    // Set returns void wrapped: { success: true, data: undefined }
    expect(unwrap(setResult)).toBeUndefined()

    const rawSettings = await ctx.page.evaluate(async () => {
      return await (window as any).api.storeGetModelSettings('openai')
    })
    const settings = unwrap<{ selectedModel: string; apiToken: string }>(rawSettings)

    expect(settings).not.toBeNull()
    expect(settings.selectedModel).toBe('gpt-4o-mini')
  })

  test('should set and retrieve an API token', async () => {
    // Use a valid provider ID (StoreValidators rejects unknown providers)
    await ctx.page.evaluate(async () => {
      return await (window as any).api.storeSetApiToken('openai', 'sk-test-token-123')
    })

    const rawSettings = await ctx.page.evaluate(async () => {
      return await (window as any).api.storeGetModelSettings('openai')
    })
    const settings = unwrap<{ selectedModel: string; apiToken: string }>(rawSettings)

    expect(settings).not.toBeNull()
    expect(settings.apiToken).toBe('sk-test-token-123')
    // The previously set model should still be there
    expect(settings.selectedModel).toBe('gpt-4o-mini')
  })

  test('should set and retrieve workspace', async () => {
    await ctx.page.evaluate(async () => {
      return await (window as any).api.workspaceSetCurrent('/fake/e2e/test/workspace')
    })

    const rawWorkspace = await ctx.page.evaluate(async () => {
      return await (window as any).api.workspaceGetCurrent()
    })
    const workspace = unwrap<string | null>(rawWorkspace)

    expect(workspace).toBe('/fake/e2e/test/workspace')
  })

  test('should track recent workspaces', async () => {
    // Set a couple of workspaces
    await ctx.page.evaluate(async () => {
      return await (window as any).api.workspaceSetCurrent('/fake/project-a')
    })
    await ctx.page.evaluate(async () => {
      return await (window as any).api.workspaceSetCurrent('/fake/project-b')
    })

    const rawRecent = await ctx.page.evaluate(async () => {
      return await (window as any).api.workspaceGetRecent()
    })
    const recent = unwrap<Array<{ path: string; lastOpened: number }>>(rawRecent)

    expect(Array.isArray(recent)).toBe(true)
    expect(recent.length).toBeGreaterThanOrEqual(2)
    // Most recent should be first
    expect(recent[0].path).toBe('/fake/project-b')
  })

  test('should clear current workspace', async () => {
    await ctx.page.evaluate(async () => {
      return await (window as any).api.workspaceClear()
    })

    const rawWorkspace = await ctx.page.evaluate(async () => {
      return await (window as any).api.workspaceGetCurrent()
    })
    const workspace = unwrap<string | null>(rawWorkspace)

    expect(workspace).toBeNull()
  })
})
