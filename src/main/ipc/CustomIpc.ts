import { ipcMain, BrowserWindow, Menu } from 'electron'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'
import { is } from '@electron-toolkit/utils'
import type { IpcModule } from './IpcModule'
import type { ServiceContainer } from '../core/ServiceContainer'
import type { EventBus } from '../core/EventBus'
import type { StoreService } from '../services/store'
import type { ProviderSettings, InferenceDefaultsUpdate } from '../../shared/types/aiSettings'
import { StoreValidators } from '../shared/validators'
import { wrapSimpleHandler } from './IpcErrorHandler'
import { AppChannels } from '../../shared/types/ipc/channels'
import type { WritingContextMenuAction } from '../../shared/types/ipc/types'

const execFileAsync = promisify(execFile)

/**
 * IPC handlers for custom application-specific operations.
 * Includes sound playback, context menu handling, and AI model store operations
 * (formerly in StoreIpc, now consolidated here and exposed on window.app).
 */
export class CustomIpc implements IpcModule {
  readonly name = 'custom'

  register(container: ServiceContainer, _eventBus: EventBus): void {
    const store = container.get<StoreService>('store')
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

    // Writing context menu — invoked by the renderer; sends action events back
    ipcMain.handle(AppChannels.showWritingContextMenu, (event, writingId: string, _writingTitle: string) => {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (!win) return

      const sendAction = (action: WritingContextMenuAction['action']): void => {
        event.sender.send(AppChannels.writingContextMenuAction, { action, writingId } satisfies WritingContextMenuAction)
      }

      const menu = Menu.buildFromTemplate([
        { label: 'Open',      click: () => sendAction('open') },
        { label: 'Duplicate', click: () => sendAction('duplicate') },
        { type: 'separator' },
        { label: 'Rename',    click: () => sendAction('rename') },
        { type: 'separator' },
        {
          label: 'Move to Trash',
          accelerator: 'CmdOrCtrl+Backspace',
          click: () => sendAction('delete'),
        },
      ])

      menu.popup({ window: win })
    })

    console.log(`[IPC] Registered ${this.name} module`)
  }
}
