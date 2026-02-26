import { ipcMain } from 'electron'
import type { IpcModule } from './IpcModule'
import type { ServiceContainer } from '../core/ServiceContainer'
import type { EventBus } from '../core/EventBus'
import type { ClipboardService } from '../services/clipboard'
import { ClipboardChannels } from '../../shared/types/ipc/channels'

/**
 * IPC handlers for clipboard operations.
 * Extracted from Main class to follow the IPC Module pattern.
 */
export class ClipboardIpc implements IpcModule {
  readonly name = 'clipboard'

  register(container: ServiceContainer, _eventBus: EventBus): void {
    const clipboard = container.get<ClipboardService>('clipboard')

    ipcMain.handle(ClipboardChannels.writeText, (_e, text: string) => clipboard.writeText(text))
    ipcMain.handle(ClipboardChannels.readText, () => clipboard.readText())
    ipcMain.handle(ClipboardChannels.writeHTML, (_e, html: string) => clipboard.writeHTML(html))
    ipcMain.handle(ClipboardChannels.readHTML, () => clipboard.readHTML())
    ipcMain.handle(ClipboardChannels.writeImage, (_e, dataURL: string) => clipboard.writeImage(dataURL))
    ipcMain.handle(ClipboardChannels.readImage, () => clipboard.readImage())
    ipcMain.handle(ClipboardChannels.clear, () => clipboard.clear())
    ipcMain.handle(ClipboardChannels.getContent, () => clipboard.getContent())
    ipcMain.handle(ClipboardChannels.getFormats, () => clipboard.getAvailableFormats())
    ipcMain.handle(ClipboardChannels.hasText, () => clipboard.hasText())
    ipcMain.handle(ClipboardChannels.hasImage, () => clipboard.hasImage())
    ipcMain.handle(ClipboardChannels.hasHTML, () => clipboard.hasHTML())

    console.log(`[IPC] Registered ${this.name} module`)
  }
}
