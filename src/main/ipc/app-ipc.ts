import { ipcMain, BrowserWindow, Menu, nativeTheme, shell, dialog, app } from 'electron';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { is } from '@electron-toolkit/utils';
import OpenAI from 'openai';
import type { IpcModule } from './ipc-module';
import type { ServiceContainer } from '../core/service-container';
import type { EventBus } from '../core/event-bus';
import type { StoreService } from '../services/store';
import type { LoggerService } from '../services/logger';
import type { ThemeService } from '../services/theme-service';
import type { SkillsStoreService } from '../services/skills-store-service';
import { StoreValidators } from '../shared/validators';
import { wrapSimpleHandler } from './ipc-error-handler';
import { AppChannels } from '../../shared/channels';
import { isThemeMode } from '../../shared/theme';
import type {
	AgentSettings,
	ContextMenuDescriptor,
	Provider,
	ProviderModelInfo,
	UserProfile,
	ThemeMode,
	WritingContextMenuAction,
} from '../../shared/types';

const execFileAsync = promisify(execFile);

/**
 * Per-provider strategy for the `/models` endpoint. Each entry encapsulates
 * the URL, auth header(s), and the parser that normalises the provider's
 * response into ProviderModelInfo[].
 */
interface ProviderModelsStrategy {
	url: string;
	headers: (apiKey: string) => Record<string, string>;
	parse: (body: unknown) => ProviderModelInfo[];
}

const PROVIDER_MODELS_STRATEGIES: Record<string, ProviderModelsStrategy> = {
	anthropic: {
		url: 'https://api.anthropic.com/v1/models',
		headers: (apiKey) => ({
			'x-api-key': apiKey,
			'anthropic-version': '2023-06-01',
		}),
		parse: (body) => {
			const items = Array.isArray((body as { data?: unknown[] })?.data)
				? ((body as { data: unknown[] }).data as Array<Record<string, unknown>>)
				: [];
			return items
				.filter((item) => typeof item.id === 'string')
				.map((item) => {
					const id = item.id as string;
					return {
						id,
						name: typeof item.display_name === 'string' && item.display_name.length > 0
							? (item.display_name as string)
							: id,
						createdAt: typeof item.created_at === 'string' ? (item.created_at as string) : '',
						ownedBy: 'anthropic',
					};
				});
		},
	},
};

async function fetchProviderModels(
	providerId: string,
	store: StoreService
): Promise<ProviderModelInfo[]> {
	if (typeof providerId !== 'string' || providerId.trim().length === 0) {
		throw new Error('providerId must be a non-empty string');
	}
	const normalized = providerId.trim().toLowerCase();

	const provider = store.getProviderById(normalized);
	if (!provider || !provider.apiKey) {
		throw new Error(`No API key configured for provider "${providerId}"`);
	}

	if (normalized === 'openai') {
		const openai = new OpenAI({ apiKey: provider.apiKey });
		const result: ProviderModelInfo[] = [];
		const list = await openai.models.list();
		for await (const model of list) {
			result.push({
				id: model.id,
				name: model.id,
				createdAt: model.created > 0 ? new Date(model.created * 1000).toISOString() : '',
				ownedBy: model.owned_by ?? 'openai',
			});
		}
		return result;
	}

	const strategy = PROVIDER_MODELS_STRATEGIES[normalized];
	if (!strategy) {
		throw new Error(`Provider "${providerId}" is not supported by getModels`);
	}

	const response = await fetch(strategy.url, { headers: strategy.headers(provider.apiKey) });

	if (!response.ok) {
		const body = await response.text().catch(() => '');
		throw new Error(
			`Failed to fetch models for "${providerId}": ${response.status} ${response.statusText}${body ? ` — ${body}` : ''}`
		);
	}

	const json = (await response.json()) as unknown;
	return strategy.parse(json);
}

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

		// Generic custom context menu — renderer provides descriptors, resolves
		// with the clicked item id (or null if dismissed). One handler, any menu.
		ipcMain.handle(
			AppChannels.showContextMenu,
			(event, items: ContextMenuDescriptor[]) =>
				new Promise<string | null>((resolve) => {
					const win = BrowserWindow.fromWebContents(event.sender);
					if (!win) {
						resolve(null);
						return;
					}

					let selectedId: string | null = null;

					const template: Electron.MenuItemConstructorOptions[] = items.map((item) => {
						if (item.type === 'separator') {
							return { type: 'separator' };
						}
						return {
							label: item.label,
							accelerator: item.accelerator,
							enabled: item.enabled ?? true,
							click: () => {
								selectedId = item.id;
							},
						};
					});

					const menu = Menu.buildFromTemplate(template);
					menu.once('menu-will-close', () => {
						// Defer: click handlers fire after `menu-will-close` on some platforms.
						setImmediate(() => resolve(selectedId));
					});
					menu.popup({ window: win });
				})
		);

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
		// Provider management handlers
		// -----------------------------------------------------------------------

		ipcMain.handle(
			AppChannels.getProviders,
			wrapSimpleHandler(() => store.getProviders(), AppChannels.getProviders)
		);

		ipcMain.handle(
			AppChannels.addProvider,
			wrapSimpleHandler((provider: Provider) => {
				StoreValidators.validateProvider(provider);
				return store.addProvider(provider);
			}, AppChannels.addProvider)
		);

		ipcMain.handle(
			AppChannels.deleteProvider,
			wrapSimpleHandler((id: string) => {
				StoreValidators.validateProviderId(id);
				return store.deleteProvider(id);
			}, AppChannels.deleteProvider)
		);

		ipcMain.handle(
			AppChannels.getAgents,
			wrapSimpleHandler(() => store.getAgents(), AppChannels.getAgents)
		);

		ipcMain.handle(
			AppChannels.updateAgent,
			wrapSimpleHandler((agent: AgentSettings) => {
				StoreValidators.validateAgentSettings(agent);
				return store.updateAgent(agent);
			}, AppChannels.updateAgent)
		);

		ipcMain.handle(
			AppChannels.getStartupInfo,
			wrapSimpleHandler(() => store.getStartupInfo(), AppChannels.getStartupInfo)
		);

		ipcMain.handle(
			AppChannels.getProfile,
			wrapSimpleHandler(() => store.getProfile(), AppChannels.getProfile)
		);

		ipcMain.handle(
			AppChannels.completeFirstRunConfiguration,
			wrapSimpleHandler((profile: UserProfile, providers: Provider[]) => {
				StoreValidators.validateProviders(providers);
				return store.completeFirstRunConfiguration(profile, providers);
			}, AppChannels.completeFirstRunConfiguration)
		);

		ipcMain.handle(
			AppChannels.getModels,
			wrapSimpleHandler(
				(providerId: string) => fetchProviderModels(providerId, store),
				AppChannels.getModels
			)
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
		// Skills management handlers (userData/skills/)
		// -----------------------------------------------------------------------

		const skillsStoreService = container.get<SkillsStoreService>('skillsStoreService');

		ipcMain.handle(
			AppChannels.getSkills,
			wrapSimpleHandler(() => skillsStoreService.listSkills(), AppChannels.getSkills)
		);

		ipcMain.handle(
			AppChannels.openSkillsFolder,
			wrapSimpleHandler(async () => {
				const dir = skillsStoreService.getSkillsDirectory();
				await shell.openPath(dir);
			}, AppChannels.openSkillsFolder)
		);

		ipcMain.handle(
			AppChannels.importSkill,
			wrapSimpleHandler(async () => {
				const result = await dialog.showOpenDialog({
					properties: ['openDirectory'],
					title: 'Select Skill Folder',
					buttonLabel: 'Import Skill',
				});
				if (result.canceled || result.filePaths.length === 0) {
					return [];
				}
				return skillsStoreService.importSkillsFromPath(result.filePaths[0]);
			}, AppChannels.importSkill)
		);

		ipcMain.handle(
			AppChannels.deleteSkill,
			wrapSimpleHandler(
				(id: string) => skillsStoreService.deleteSkill(id),
				AppChannels.deleteSkill
			)
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
