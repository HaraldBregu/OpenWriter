import { ipcMain, BrowserWindow, Menu, nativeTheme } from 'electron';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { is } from '@electron-toolkit/utils';
import type { IpcModule } from './ipc-module';
import type { ServiceContainer } from '../core/service-container';
import type { EventBus } from '../core/event-bus';
import type { StoreService } from '../services/store';
import type { LoggerService } from '../services/logger';
import { StoreValidators } from '../shared/validators';
import { wrapSimpleHandler } from './ipc-error-handler';
import { AppChannels } from '../../shared/channels';
import type { WritingContextMenuAction } from '../../shared/types';
import type { CreateModelInput } from '../../shared/model-defaults';

const execFileAsync = promisify(execFile);

/**
 * IPC handlers for custom application-specific operations.
 * Includes sound playback, context menu handling, and AI model store operations
 * (formerly in StoreIpc, now consolidated here and exposed on window.app).
 */
const VALID_THEMES = ['light', 'dark', 'system'] as const;
const VALID_LANGUAGES = ['en', 'it'] as const;

export class AppIpc implements IpcModule {
	readonly name = 'app';

	private lastTheme: string | null = null;
	private lastLanguage: string | null = null;

	register(container: ServiceContainer, eventBus: EventBus): void {
		const store = container.get<StoreService>('store');
		const logger = container.get<LoggerService>('logger');

		// Language handler
		ipcMain.on(AppChannels.setLanguage, (event, language: string) => {
			if (!VALID_LANGUAGES.includes(language as (typeof VALID_LANGUAGES)[number])) return;
			if (this.lastLanguage === language) return;
			this.lastLanguage = language;

			const senderContents = event.sender;
			BrowserWindow.getAllWindows().forEach((win) => {
				if (!win.isDestroyed() && win.webContents !== senderContents) {
					win.webContents.send(AppChannels.changeLanguage, language);
				}
			});
		});

		// Theme handler
		ipcMain.on(AppChannels.setTheme, (event, theme: string) => {
			if (!VALID_THEMES.includes(theme as (typeof VALID_THEMES)[number])) return;
			if (this.lastTheme === theme) return;
			this.lastTheme = theme;

			nativeTheme.themeSource = theme as 'light' | 'dark' | 'system';
			eventBus.emit('theme:changed', { theme: theme as 'light' | 'dark' | 'system' });

			const senderContents = event.sender;
			BrowserWindow.getAllWindows().forEach((win) => {
				if (!win.isDestroyed() && win.webContents !== senderContents) {
					win.webContents.send(AppChannels.changeTheme, theme);
				}
			});
		});

		// Play sound handler
		ipcMain.on(AppChannels.playSound, async () => {
			const soundPath = is.dev
				? path.join(__dirname, '../../resources/sounds/click6.wav')
				: path.join(process.resourcesPath, 'resources/sounds/click6.wav');

			try {
				if (process.platform === 'darwin') {
					await execFileAsync('afplay', [soundPath]);
				} else if (process.platform === 'win32') {
					// Escape single quotes in path for PowerShell
					const escapedPath = soundPath.replace(/'/g, "''");
					await execFileAsync('powershell', [
						'-NoProfile',
						'-Command',
						`(New-Object Media.SoundPlayer '${escapedPath}').PlaySync()`,
					]);
				} else {
					await execFileAsync('aplay', [soundPath]);
				}
			} catch (err) {
				logger.error('AppIpc', 'Sound playback failed', err);
			}
		});

		// Context menu handler (standard)
		ipcMain.on(AppChannels.contextMenu, (event) => {
			const win = BrowserWindow.fromWebContents(event.sender);
			if (!win) return;

			const editMenu = Menu.buildFromTemplate([
				{ role: 'undo' },
				{ role: 'redo' },
				{ type: 'separator' },
				{ role: 'cut' },
				{ role: 'copy' },
				{ role: 'paste' },
				{ role: 'selectAll' },
			]);
			editMenu.popup({ window: win });
		});

		// Context menu handler (editable)
		ipcMain.on(AppChannels.contextMenuEditable, (event) => {
			const win = BrowserWindow.fromWebContents(event.sender);
			if (!win) return;

			const editMenu = Menu.buildFromTemplate([
				{ role: 'undo' },
				{ role: 'redo' },
				{ type: 'separator' },
				{ role: 'cut' },
				{ role: 'copy' },
				{ role: 'paste' },
				{ type: 'separator' },
				{ role: 'selectAll' },
			]);
			editMenu.popup({ window: win });
		});

		// Writing context menu — invoked by the renderer; sends action events back
		ipcMain.handle(
			AppChannels.showWritingContextMenu,
			(event, writingId: string, _writingTitle: string) => {
				const win = BrowserWindow.fromWebContents(event.sender);
				if (!win) return;

				const sendAction = (action: WritingContextMenuAction['action']): void => {
					event.sender.send(AppChannels.writingContextMenuAction, {
						action,
						writingId,
					} satisfies WritingContextMenuAction);
				};

				const menu = Menu.buildFromTemplate([
					{ label: 'Open', click: () => sendAction('open') },
					{ label: 'Duplicate', click: () => sendAction('duplicate') },
					{ type: 'separator' },
					{ label: 'Rename', click: () => sendAction('rename') },
					{ type: 'separator' },
					{
						label: 'Move to Trash',
						accelerator: 'CmdOrCtrl+Backspace',
						click: () => sendAction('delete'),
					},
				]);

				menu.popup({ window: win });
			}
		);

		// -----------------------------------------------------------------------
		// Model management handlers
		// -----------------------------------------------------------------------

		ipcMain.handle(
			AppChannels.getModels,
			wrapSimpleHandler(() => store.getModels(), AppChannels.getModels)
		);

		ipcMain.handle(
			AppChannels.addModel,
			wrapSimpleHandler((model: CreateModelInput) => {
				StoreValidators.validateModelConfig(model);
				return store.addModel(model);
			}, AppChannels.addModel)
		);

		ipcMain.handle(
			AppChannels.deleteModel,
			wrapSimpleHandler((id: string) => {
				StoreValidators.validateModelId(id);
				return store.deleteModel(id);
			}, AppChannels.deleteModel)
		);

		ipcMain.handle(
			AppChannels.setDefaultModel,
			wrapSimpleHandler((id: string) => {
				StoreValidators.validateModelId(id);
				return store.setDefaultModel(id);
			}, AppChannels.setDefaultModel)
		);

		logger.info('AppIpc', `Registered ${this.name} module`);
	}
}
