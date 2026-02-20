import { ipcMain } from 'electron'
import type { IpcModule } from './IpcModule'
import type { ServiceContainer } from '../core/ServiceContainer'
import type { EventBus } from '../core/EventBus'
import type { FilesystemService } from '../services/filesystem'

/**
 * IPC handlers for filesystem operations.
 * Uses EventBus to broadcast file change events.
 */
export class FilesystemIpc implements IpcModule {
  readonly name = 'filesystem'

  register(container: ServiceContainer, eventBus: EventBus): void {
    const fs = container.get<FilesystemService>('filesystem')

    ipcMain.handle('fs-open-file-dialog', () => fs.openFileDialog())
    ipcMain.handle('fs-read-file', (_e, path: string) => fs.readFile(path))
    ipcMain.handle('fs-write-file', (_e, path: string, content: string) => fs.writeFile(path, content))
    ipcMain.handle('fs-save-file-dialog', (_e, defaultName: string, content: string) =>
      fs.saveFileDialog(defaultName, content)
    )
    ipcMain.handle('fs-select-directory', () => fs.selectDirectory())
    ipcMain.handle('fs-watch-directory', (_e, path: string) => fs.watchDirectory(path))
    ipcMain.handle('fs-unwatch-directory', (_e, path: string) => fs.unwatchDirectory(path))
    ipcMain.handle('fs-get-watched-directories', () => fs.getWatchedDirectories())

    // Broadcast file change events to all windows
    fs.onWatchEvent((event) => {
      eventBus.broadcast('fs-watch-event', event)
    })

    console.log(`[IPC] Registered ${this.name} module`)
  }
}
