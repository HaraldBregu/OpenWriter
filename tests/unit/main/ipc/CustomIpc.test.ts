/**
 * Tests for CustomIpc.
 * Verifies sound playback, context menu IPC handlers, and the store/settings
 * handlers that were merged in from the former StoreIpc module.
 */
import { ipcMain } from 'electron';
import { AppIpc as CustomIpc } from '../../../../src/main/ipc/app-ipc';
import { ServiceContainer } from '../../../../src/main/core/service-container';
import { EventBus } from '../../../../src/main/core/event-bus';

// Mock child_process and @electron-toolkit/utils
jest.mock('node:child_process', () => ({
	execFile: jest.fn(
		(_cmd: unknown, _args: unknown, callback: (e: null, o: string, er: string) => void) =>
			callback(null, '', '')
	),
}));

jest.mock('node:util', () => ({
	promisify: jest.fn((_fn: unknown) => {
		return jest.fn().mockResolvedValue('');
	}),
}));

jest.mock('@electron-toolkit/utils', () => ({
	is: { dev: true },
}));

describe('CustomIpc', () => {
	let module: CustomIpc;
	let container: ServiceContainer;
	let eventBus: EventBus;

	beforeEach(() => {
		jest.clearAllMocks();
		container = new ServiceContainer();
		container.register('store', {
			getAllApiKeys: jest.fn().mockReturnValue({}),
			getApiKey: jest.fn().mockReturnValue(null),
			setApiKey: jest.fn(),
		});
		container.register('logger', {
			info: jest.fn(),
			error: jest.fn(),
			warn: jest.fn(),
			debug: jest.fn(),
		});
		eventBus = new EventBus();
		module = new CustomIpc();
	});

	it('should have name "app"', () => {
		expect(module.name).toBe('app');
	});

	it('should register 3 ipcMain.on handlers (sound + 2 context menus)', () => {
		module.register(container, eventBus);
		expect((ipcMain.on as jest.Mock).mock.calls).toHaveLength(3);
	});

	it('should register play-sound, context-menu, and context-menu-editable on channels', () => {
		module.register(container, eventBus);
		const channels = (ipcMain.on as jest.Mock).mock.calls.map((c: unknown[]) => c[0]);
		expect(channels).toContain('play-sound');
		expect(channels).toContain('context-menu');
		expect(channels).toContain('context-menu-editable');
	});

	it('should register 4 ipcMain.handle handlers (writing context menu + 3 store channels)', () => {
		module.register(container, eventBus);
		// 1 writing context menu + 3 API key channels
		expect((ipcMain.handle as jest.Mock).mock.calls).toHaveLength(4);
	});

	it('should register writing context menu and all store channels via handle', () => {
		module.register(container, eventBus);
		const channels = (ipcMain.handle as jest.Mock).mock.calls.map((c: unknown[]) => c[0]);
		expect(channels).toContain('context-menu:writing');
		expect(channels).toContain('store-get-all-api-keys');
		expect(channels).toContain('store-get-api-key');
		expect(channels).toContain('store-set-api-key');
	});
});
