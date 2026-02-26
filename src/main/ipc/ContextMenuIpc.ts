import { ipcMain, BrowserWindow, Menu } from 'electron'
import type { IpcModule } from './IpcModule'
import type { ServiceContainer } from '../core/ServiceContainer'
import type { EventBus } from '../core/EventBus'
import { ContextMenuChannels } from '../../shared/types/ipc/channels'

/**
 * IPC handlers for context menu operations.
 * Handles displaying native context menus for posts and writings.
 */
export class ContextMenuIpc implements IpcModule {
  readonly name = 'context-menu'

  register(_container: ServiceContainer, _eventBus: EventBus): void {
    ipcMain.handle(ContextMenuChannels.writing, (event, writingId: string, _writingTitle: string) => {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (!win) return

      const menu = Menu.buildFromTemplate([
        {
          label: 'Open',
          click: () => {
            event.sender.send(ContextMenuChannels.writingAction, { action: 'open', writingId })
          }
        },
        {
          label: 'Duplicate',
          click: () => {
            event.sender.send(ContextMenuChannels.writingAction, { action: 'duplicate', writingId })
          }
        },
        { type: 'separator' },
        {
          label: 'Rename',
          click: () => {
            event.sender.send(ContextMenuChannels.writingAction, { action: 'rename', writingId })
          }
        },
        { type: 'separator' },
        {
          label: 'Move to Trash',
          accelerator: 'CmdOrCtrl+Backspace',
          click: () => {
            event.sender.send(ContextMenuChannels.writingAction, { action: 'delete', writingId })
          }
        }
      ])

      menu.popup({ window: win })
    })

    console.log(`[IPC] Registered ${this.name} module`)
  }
}
