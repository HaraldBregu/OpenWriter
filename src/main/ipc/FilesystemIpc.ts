import { ipcMain } from 'electron'
import type { IpcModule } from './IpcModule'
import type { ServiceContainer } from '../core/ServiceContainer'
import type { EventBus } from '../core/EventBus'
import type { FilesystemService } from '../services/filesystem'
import { PathValidator } from '../shared/PathValidator'
import { wrapSimpleHandler } from './IpcErrorHandler'
import { FsChannels } from '../../shared/types/ipc/channels'

/**
 * IPC handlers for filesystem operations.
 * Uses EventBus to broadcast file change events.
 */
export class FilesystemIpc implements IpcModule {
  readonly name = 'filesystem'

  register(container: ServiceContainer, eventBus: EventBus): void {
    const fs = container.get<FilesystemService>('filesystem')

    ipcMain.handle(
      FsChannels.openFileDialog,
      wrapSimpleHandler(() => fs.openFileDialog(), FsChannels.openFileDialog)
    )
    ipcMain.handle(
      FsChannels.readFile,
      wrapSimpleHandler((path: string) => {
        PathValidator.assertPathSafe(path)
        return fs.readFile(path)
      }, FsChannels.readFile)
    )
    ipcMain.handle(
      FsChannels.writeFile,
      wrapSimpleHandler((path: string, content: string) => {
        PathValidator.assertPathSafe(path)
        return fs.writeFile(path, content)
      }, FsChannels.writeFile)
    )
    ipcMain.handle(
      FsChannels.saveFileDialog,
      wrapSimpleHandler(
        (defaultName: string, content: string) => fs.saveFileDialog(defaultName, content),
        FsChannels.saveFileDialog
      )
    )
    ipcMain.handle(
      FsChannels.selectDirectory,
      wrapSimpleHandler(() => fs.selectDirectory(), FsChannels.selectDirectory)
    )
    ipcMain.handle(
      FsChannels.watchDirectory,
      wrapSimpleHandler((path: string) => {
        PathValidator.assertPathSafe(path)
        return fs.watchDirectory(path)
      }, FsChannels.watchDirectory)
    )
    ipcMain.handle(
      FsChannels.unwatchDirectory,
      wrapSimpleHandler((path: string) => {
        PathValidator.assertPathSafe(path)
        return fs.unwatchDirectory(path)
      }, FsChannels.unwatchDirectory)
    )
    ipcMain.handle(
      FsChannels.getWatchedDirectories,
      wrapSimpleHandler(() => fs.getWatchedDirectories(), FsChannels.getWatchedDirectories)
    )

    // Broadcast file change events to all windows
    fs.onWatchEvent((event) => {
      eventBus.broadcast('fs-watch-event', event)
    })

    console.log(`[IPC] Registered ${this.name} module`)
  }
}
