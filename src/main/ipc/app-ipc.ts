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
import type { AgentConfig } from '../../shared/aiSettings';
import { AGENT_IDS } from '../../shared/aiSettings';

const execFileAsync = promisify(execFile);

/**
 * IPC handlers for custom application-specific operations.
 * Includes sound playback, context menu handling, and AI model store operations
 * (formerly in StoreIpc, now consolidated here and exposed on window.app).
 */
const VALID_THEMES = ['light', 'dark', 'system'] as const;

export class AppIpc implements IpcModule {
	readonly name = 'app';

	private lastTheme: string | null = null;

	register(container: ServiceContainer, eventBus: EventBus): void {
		const store = container.get<StoreService>('store');
		const logger = container.get<LoggerService>('logger');

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
		// Store / API key handlers
		// -----------------------------------------------------------------------

		ipcMain.handle(
			AppChannels.getAllApiKeys,
			wrapSimpleHandler(() => store.getAllApiKeys(), AppChannels.getAllApiKeys)
		);

		ipcMain.handle(
			AppChannels.getApiKey,
			wrapSimpleHandler((providerId: string) => {
				StoreValidators.validateProviderId(providerId);
				return store.getApiKey(providerId);
			}, AppChannels.getApiKey)
		);

		ipcMain.handle(
			AppChannels.setApiKey,
			wrapSimpleHandler((providerId: string, apiKey: string) => {
				StoreValidators.validateProviderId(providerId);
				StoreValidators.validateApiToken(apiKey);
				return store.setApiKey(providerId, apiKey);
			}, AppChannels.setApiKey)
		);

		// -----------------------------------------------------------------------
		// Store / Agent settings handlers
		// -----------------------------------------------------------------------

		ipcMain.handle(
			AppChannels.getAgentSettings,
			wrapSimpleHandler(() => store.getAgentSettings(), AppChannels.getAgentSettings)
		);

		ipcMain.handle(
			AppChannels.getAgentConfig,
			wrapSimpleHandler((agentId: string) => {
				if (!AGENT_IDS.includes(agentId as (typeof AGENT_IDS)[number])) {
					throw new Error(`Invalid agent ID: ${agentId}`);
				}
				return store.getAgentConfig(agentId);
			}, AppChannels.getAgentConfig)
		);

		ipcMain.handle(
			AppChannels.setAgentConfig,
			wrapSimpleHandler((agentId: string, config: AgentConfig) => {
				if (!AGENT_IDS.includes(agentId as (typeof AGENT_IDS)[number])) {
					throw new Error(`Invalid agent ID: ${agentId}`);
				}
				return store.setAgentConfig(agentId, config);
			}, AppChannels.setAgentConfig)
		);

		logger.info('AppIpc', `Registered ${this.name} module`);
	}
}
