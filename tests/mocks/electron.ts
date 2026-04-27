/**
 * Minimal Electron mock for main-process Jest tests.
 *
 * Source files reach for `app.getPath` and the IPC primitives at import time;
 * the real Electron module is only available inside a running Electron host.
 * Stubs return inert defaults — tests that need richer behaviour should
 * jest.mock('electron') with their own surface.
 */
const noop = (): void => {};

export const app = {
	getPath: (_name: string): string => '',
	getName: (): string => 'openwriter-test',
	getVersion: (): string => '0.0.0-test',
	getAppPath: (): string => '',
	on: noop,
	whenReady: async (): Promise<void> => {},
	quit: noop,
};

export const ipcMain = {
	handle: noop,
	on: noop,
	removeHandler: noop,
	removeAllListeners: noop,
};

export const ipcRenderer = {
	invoke: async (): Promise<unknown> => undefined,
	send: noop,
	on: noop,
	removeListener: noop,
	removeAllListeners: noop,
};

export const BrowserWindow = class {
	loadURL = noop;
	loadFile = noop;
	on = noop;
	webContents = { send: noop, on: noop };
};

export const dialog = {
	showOpenDialog: async (): Promise<{ canceled: boolean; filePaths: string[] }> => ({
		canceled: true,
		filePaths: [],
	}),
	showSaveDialog: async (): Promise<{ canceled: boolean; filePath?: string }> => ({
		canceled: true,
	}),
};

export const shell = { openExternal: async (): Promise<void> => {} };

export default { app, ipcMain, ipcRenderer, BrowserWindow, dialog, shell };
