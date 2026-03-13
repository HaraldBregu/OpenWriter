/**
 * E2E tests for store/settings persistence.
 * Verifies that API keys and workspace preferences persist
 * through the StoreService via IPC.
 *
 * NOTE: Store and Workspace IPC handlers use wrapSimpleHandler,
 * which wraps return values as { success: true, data: <value> }.
 */
import { test, expect } from '@playwright/test';
import { launchApp, closeApp, waitForAppReady, type AppContext } from './electron-helpers';

let ctx: AppContext;

test.beforeAll(async () => {
	ctx = await launchApp();
	await waitForAppReady(ctx.page);
});

test.afterAll(async () => {
	await closeApp(ctx);
});

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
		return (result as { success: boolean; data: T }).data;
	}
	return result as T;
}

test.describe('Store Persistence', () => {
	test('should start with empty API keys', async () => {
		const rawResult = await ctx.page.evaluate(async () => {
			return await (window as any).app.getAllApiKeys();
		});
		const keys = unwrap<Record<string, string>>(rawResult);
		expect(typeof keys).toBe('object');
		expect(keys).not.toBeNull();
	});

	test('should set and retrieve an API key', async () => {
		await ctx.page.evaluate(async () => {
			return await (window as any).app.setApiKey('openai', 'sk-test-token-123');
		});

		const rawKey = await ctx.page.evaluate(async () => {
			return await (window as any).app.getApiKey('openai');
		});
		const apiKey = unwrap<string | null>(rawKey);

		expect(apiKey).toBe('sk-test-token-123');
	});

	test('should set and retrieve workspace', async () => {
		await ctx.page.evaluate(async () => {
			return await (window as any).app.workspaceSetCurrent('/fake/e2e/test/workspace');
		});

		const rawWorkspace = await ctx.page.evaluate(async () => {
			return await (window as any).app.workspaceGetCurrent();
		});
		const workspace = unwrap<string | null>(rawWorkspace);

		expect(workspace).toBe('/fake/e2e/test/workspace');
	});

	test('should track recent workspaces', async () => {
		// Set a couple of workspaces
		await ctx.page.evaluate(async () => {
			return await (window as any).app.workspaceSetCurrent('/fake/project-a');
		});
		await ctx.page.evaluate(async () => {
			return await (window as any).app.workspaceSetCurrent('/fake/project-b');
		});

		const rawRecent = await ctx.page.evaluate(async () => {
			return await (window as any).app.workspaceGetRecent();
		});
		const recent = unwrap<Array<{ path: string; lastOpened: number }>>(rawRecent);

		expect(Array.isArray(recent)).toBe(true);
		expect(recent.length).toBeGreaterThanOrEqual(2);
		// Most recent should be first
		expect(recent[0].path).toBe('/fake/project-b');
	});

	test('should clear current workspace', async () => {
		await ctx.page.evaluate(async () => {
			return await (window as any).app.workspaceClear();
		});

		const rawWorkspace = await ctx.page.evaluate(async () => {
			return await (window as any).app.workspaceGetCurrent();
		});
		const workspace = unwrap<string | null>(rawWorkspace);

		expect(workspace).toBeNull();
	});
});
