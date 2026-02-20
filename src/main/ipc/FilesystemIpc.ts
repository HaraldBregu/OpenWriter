import { ipcMain } from 'electron'
import type { IpcModule } from './IpcModule'
import type { ServiceContainer } from '../core/ServiceContainer'
import type { EventBus } from '../core/EventBus'
import type { FilesystemService } from '../services/filesystem'
import { PathValidator } from '../shared/PathValidator'
import { wrapSimpleHandler } from './IpcErrorHandler'

/**
 * IPC handlers for filesystem operations.
 * Uses EventBus to broadcast file change events.
 */
export class FilesystemIpc implements IpcModule {
  readonly name = 'filesystem'

  register(container: ServiceContainer, eventBus: EventBus): void {
    const fs = container.get<FilesystemService>('filesystem')

    ipcMain.handle(
      'fs-open-file-dialog',
      wrapSimpleHandler(() => fs.openFileDialog(), 'fs-open-file-dialog')
    )
    ipcMain.handle(
      'fs-read-file',
      wrapSimpleHandler((path: string) => {
        PathValidator.assertPathSafe(path)
        return fs.readFile(path)
      }, 'fs-read-file')
    )
    ipcMain.handle(
      'fs-write-file',
      wrapSimpleHandler((path: string, content: string) => {
        PathValidator.assertPathSafe(path)
        return fs.writeFile(path, content)
      }, 'fs-write-file')
    )
    ipcMain.handle(
      'fs-save-file-dialog',
      wrapSimpleHandler(
        (defaultName: string, content: string) => fs.saveFileDialog(defaultName, content),
        'fs-save-file-dialog'
      )
    )
    ipcMain.handle(
      'fs-select-directory',
      wrapSimpleHandler(() => fs.selectDirectory(), 'fs-select-directory')
    )
    ipcMain.handle(
      'fs-watch-directory',
      wrapSimpleHandler((path: string) => {
        PathValidator.assertPathSafe(path)
        return fs.watchDirectory(path)
      }, 'fs-watch-directory')
    )
    ipcMain.handle(
      'fs-unwatch-directory',
      wrapSimpleHandler((path: string) => {
        PathValidator.assertPathSafe(path)
        return fs.unwatchDirectory(path)
      }, 'fs-unwatch-directory')
    )
    ipcMain.handle(
      'fs-get-watched-directories',
      wrapSimpleHandler(() => fs.getWatchedDirectories(), 'fs-get-watched-directories')
    )

    // Broadcast file change events to all windows
    fs.onWatchEvent((event) => {
      eventBus.broadcast('fs-watch-event', event)
    })

    console.log(`[IPC] Registered ${this.name} module`)
  }
}
