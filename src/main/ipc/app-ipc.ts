import { ipcMain, BrowserWindow, Menu, nativeTheme, shell, dialog, app } from 'electron';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { is } from '@electron-toolkit/utils';
import type { IpcModule } from './ipc-module';
import type { ServiceContainer } from '../core/service-container';
import type { EventBus } from '../core/event-bus';
import type { StoreService } from '../services/store';
import type { LoggerService } from '../services/logger';
import type { ThemeService } from '../services/theme-service';
import { StoreValidators } from '../shared/validators';
import { toServiceConfig } from '../../shared/providers';
import { wrapSimpleHandler } from './ipc-error-handler';
import { AppChannels } from '../../shared/channels';
import { isThemeMode } from '../../shared/theme';
import type { Service, ThemeMode, WritingContextMenuAction } from '../../shared/types';

const execFileAsync = promisify(execFile);

/**
 * IPC handlers for custom application-specific operations.
 * Includes sound playback, context menu handling, and AI model store operations
 * (formerly in StoreIpc, now consolidated here and exposed on window.app).
 */
const VALID_LANGUAGES = ['en', 'it'] as const;

export class AppIpc implements IpcModule {
	readonly name = 'app';

	private lastTheme: ThemeMode | null = null;
	private lastLanguage: string | null = null;
	private trayEnabled = true;

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
			if (!isThemeMode(theme)) return;
			if (this.lastTheme === theme) return;
			this.lastTheme = theme;

			nativeTheme.themeSource = theme;
			eventBus.emit('theme:changed', { theme });

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
		// Service management handlers
		// -----------------------------------------------------------------------

		ipcMain.handle(
			AppChannels.getServices,
			wrapSimpleHandler(() => {
				const services = store.getServices();
				return services.map((service, index) => ({
					id: `service-${index}-${service.provider.id}`,
					...service,
				}));
			}, AppChannels.getServices)
		);

		ipcMain.handle(
			AppChannels.addService,
			wrapSimpleHandler((service: Service) => {
				StoreValidators.validateService(service);
				return store.addService(service);
			}, AppChannels.addService)
		);

		ipcMain.handle(
			AppChannels.deleteService,
			wrapSimpleHandler((id: string) => {
				StoreValidators.validateServiceId(id);
				return store.deleteService(id);
			}, AppChannels.deleteService)
		);

		ipcMain.handle(
			AppChannels.getStartupInfo,
			wrapSimpleHandler(() => store.getStartupInfo(), AppChannels.getStartupInfo)
		);

		ipcMain.handle(
			AppChannels.completeFirstRunConfiguration,
			wrapSimpleHandler((services: Service[]) => {
				StoreValidators.validateServices(services);
				return store.completeFirstRunConfiguration(services);
			}, AppChannels.completeFirstRunConfiguration)
		);

		// Open logs folder in system file explorer
		ipcMain.handle(
			AppChannels.openLogsFolder,
			wrapSimpleHandler(async () => {
				const logsDir = logger.getLogDirectory();
				if (logsDir) {
					await shell.openPath(logsDir);
				}
			}, AppChannels.openLogsFolder)
		);

		// Open application data folder in system file explorer
		ipcMain.handle(
			AppChannels.openAppDataFolder,
			wrapSimpleHandler(async () => {
				await shell.openPath(app.getPath('userData'));
			}, AppChannels.openAppDataFolder)
		);

		// Get the application data folder path
		ipcMain.handle(
			AppChannels.getAppDataFolder,
			wrapSimpleHandler(() => app.getPath('userData'), AppChannels.getAppDataFolder)
		);

		// -----------------------------------------------------------------------
		// Theme management handlers
		// -----------------------------------------------------------------------

		const themeService = container.get<ThemeService>('themeService');

		ipcMain.handle(
			AppChannels.getCustomThemes,
			wrapSimpleHandler(() => themeService.listThemes(), AppChannels.getCustomThemes)
		);

		ipcMain.handle(
			AppChannels.openThemesFolder,
			wrapSimpleHandler(async () => {
				const themesDir = themeService.getThemesDirectory();
				await shell.openPath(themesDir);
			}, AppChannels.openThemesFolder)
		);

		ipcMain.handle(
			AppChannels.getCustomThemeTokens,
			wrapSimpleHandler(
				(id: string) => themeService.getThemeById(id),
				AppChannels.getCustomThemeTokens
			)
		);

		ipcMain.handle(
			AppChannels.deleteTheme,
			wrapSimpleHandler((id: string) => themeService.deleteTheme(id), AppChannels.deleteTheme)
		);

		ipcMain.handle(
			AppChannels.importTheme,
			wrapSimpleHandler(async () => {
				const result = await dialog.showOpenDialog({
					properties: ['openDirectory'],
					title: 'Select Theme Folder',
					buttonLabel: 'Import Theme',
				});
				if (result.canceled || result.filePaths.length === 0) {
					return null;
				}
				return themeService.importThemeFromPath(result.filePaths[0]);
			}, AppChannels.importTheme)
		);

		// -----------------------------------------------------------------------
		// System settings handlers (macOS)
		// -----------------------------------------------------------------------

		ipcMain.handle(
			AppChannels.openSystemAccessibility,
			wrapSimpleHandler(async () => {
				if (process.platform === 'darwin') {
					await shell.openExternal(
						'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility'
					);
				}
			}, AppChannels.openSystemAccessibility)
		);

		ipcMain.handle(
			AppChannels.openSystemScreenRecording,
			wrapSimpleHandler(async () => {
				if (process.platform === 'darwin') {
					await shell.openExternal(
						'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture'
					);
				}
			}, AppChannels.openSystemScreenRecording)
		);

		// -----------------------------------------------------------------------
		// Tray toggle handlers
		// -----------------------------------------------------------------------

		ipcMain.handle(
			AppChannels.setTrayEnabled,
			wrapSimpleHandler((enabled: boolean) => {
				this.trayEnabled = enabled;
				eventBus.emit('tray:set-enabled', { enabled });
			}, AppChannels.setTrayEnabled)
		);

		ipcMain.handle(
			AppChannels.getTrayEnabled,
			wrapSimpleHandler(() => {
				return this.trayEnabled;
			}, AppChannels.getTrayEnabled)
		);

		logger.info('AppIpc', `Registered ${this.name} module`);
	}
}
