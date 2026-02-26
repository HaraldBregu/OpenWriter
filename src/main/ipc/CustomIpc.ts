import { ipcMain, BrowserWindow, Menu } from 'electron'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'
import { is } from '@electron-toolkit/utils'
import type { IpcModule } from './IpcModule'
import type { ServiceContainer } from '../core/ServiceContainer'
import type { EventBus } from '../core/EventBus'
import { AppChannels } from '../../shared/types/ipc/channels'

const execFileAsync = promisify(execFile)

/**
 * IPC handlers for custom application-specific operations.
 * Includes sound playback and context menu handling.
 */
export class CustomIpc implements IpcModule {
  readonly name = 'custom'

  register(_container: ServiceContainer, _eventBus: EventBus): void {
    // Play sound handler
    ipcMain.on(AppChannels.playSound, async () => {
      const soundPath = is.dev
        ? path.join(__dirname, '../../resources/sounds/click6.wav')
        : path.join(process.resourcesPath, 'resources/sounds/click6.wav')

      try {
        if (process.platform === 'darwin') {
          await execFileAsync('afplay', [soundPath])
        } else if (process.platform === 'win32') {
          // Escape single quotes in path for PowerShell
          const escapedPath = soundPath.replace(/'/g, "''")
          await execFileAsync('powershell', [
            '-NoProfile',
            '-Command',
            `(New-Object Media.SoundPlayer '${escapedPath}').PlaySync()`
          ])
        } else {
          await execFileAsync('aplay', [soundPath])
        }
      } catch (err) {
        console.error('[CustomIpc] Sound playback failed:', err)
      }
    })

    // Context menu handler (standard)
    ipcMain.on(AppChannels.contextMenu, (event) => {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (!win) return

      const editMenu = Menu.buildFromTemplate([
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ])
      editMenu.popup({ window: win })
    })

    // Context menu handler (editable)
    ipcMain.on(AppChannels.contextMenuEditable, (event) => {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (!win) return

      const editMenu = Menu.buildFromTemplate([
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { type: 'separator' },
        { role: 'selectAll' }
      ])
      editMenu.popup({ window: win })
    })

    console.log(`[IPC] Registered ${this.name} module`)
  }
}
