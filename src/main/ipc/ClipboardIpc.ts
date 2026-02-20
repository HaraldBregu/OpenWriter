import { ipcMain } from 'electron'
import type { IpcModule } from './IpcModule'
import type { ServiceContainer } from '../core/ServiceContainer'
import type { EventBus } from '../core/EventBus'
import type { ClipboardService } from '../services/clipboard'

/**
 * IPC handlers for clipboard operations.
 * Extracted from Main class to follow the IPC Module pattern.
 */
export class ClipboardIpc implements IpcModule {
  readonly name = 'clipboard'

  register(container: ServiceContainer, _eventBus: EventBus): void {
    const clipboard = container.get<ClipboardService>('clipboard')

    ipcMain.handle('clipboard-write-text', (_e, text: string) => clipboard.writeText(text))
    ipcMain.handle('clipboard-read-text', () => clipboard.readText())
    ipcMain.handle('clipboard-write-html', (_e, html: string) => clipboard.writeHTML(html))
    ipcMain.handle('clipboard-read-html', () => clipboard.readHTML())
    ipcMain.handle('clipboard-write-image', (_e, dataURL: string) => clipboard.writeImage(dataURL))
    ipcMain.handle('clipboard-read-image', () => clipboard.readImage())
    ipcMain.handle('clipboard-clear', () => clipboard.clear())
    ipcMain.handle('clipboard-get-content', () => clipboard.getContent())
    ipcMain.handle('clipboard-get-formats', () => clipboard.getAvailableFormats())
    ipcMain.handle('clipboard-has-text', () => clipboard.hasText())
    ipcMain.handle('clipboard-has-image', () => clipboard.hasImage())
    ipcMain.handle('clipboard-has-html', () => clipboard.hasHTML())

    console.log(`[IPC] Registered ${this.name} module`)
  }
}
