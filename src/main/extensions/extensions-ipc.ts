import { BrowserWindow, ipcMain, shell } from 'electron';
import type { IpcModule } from '../ipc/ipc-module';
import type { ServiceContainer } from '../core/service-container';
import type { EventBus } from '../core/event-bus';
import type { ExtensionManager } from './extension-manager';
import type { LoggerService } from '../services/logger';
import { wrapSimpleHandler, wrapIpcHandler } from '../ipc/ipc-error-handler';
import { ExtensionChannels } from '../../shared/channels';

export class ExtensionsIpc implements IpcModule {
	readonly name = 'extensions';

	register(container: ServiceContainer, _eventBus: EventBus): void {
		const manager = container.get<ExtensionManager>('extensionManager');
		const logger = container.get<LoggerService>('logger');

		ipcMain.handle(
			ExtensionChannels.list,
			wrapSimpleHandler(() => manager.listExtensions(), ExtensionChannels.list)
		);

		ipcMain.handle(
			ExtensionChannels.getState,
			wrapSimpleHandler(
				(extensionId: string) => manager.getRuntimeState(extensionId),
				ExtensionChannels.getState
			)
		);

		ipcMain.handle(
			ExtensionChannels.getCommands,
			wrapIpcHandler((event) => {
				const windowId = BrowserWindow.fromWebContents(event.sender)?.id;
				return manager.getCommands(windowId);
			}, ExtensionChannels.getCommands)
		);

		ipcMain.handle(
			ExtensionChannels.executeCommand,
			wrapIpcHandler((event, commandId: string, payload?: unknown) => {
				const windowId = BrowserWindow.fromWebContents(event.sender)?.id;
				return manager.executeCommand(commandId, payload, windowId);
			}, ExtensionChannels.executeCommand)
		);

		ipcMain.handle(
			ExtensionChannels.setEnabled,
			wrapSimpleHandler(
				(extensionId: string, enabled: boolean) => manager.setEnabled(extensionId, enabled),
				ExtensionChannels.setEnabled
			)
		);

		ipcMain.handle(
			ExtensionChannels.reload,
			wrapSimpleHandler((extensionId: string) => manager.reload(extensionId), ExtensionChannels.reload)
		);

		ipcMain.handle(
			ExtensionChannels.setActiveDocument,
			wrapIpcHandler((event, documentId: string | null) => {
				const windowId = BrowserWindow.fromWebContents(event.sender)?.id;
				if (!windowId) return;
				manager.setActiveDocument(windowId, documentId);
			}, ExtensionChannels.setActiveDocument)
		);

		ipcMain.handle(
			ExtensionChannels.openFolder,
			wrapSimpleHandler(async () => {
				await shell.openPath(manager.getUserExtensionsDirectory());
			}, ExtensionChannels.openFolder)
		);

		logger.info('ExtensionsIpc', `Registered ${this.name} module`);
	}
}
