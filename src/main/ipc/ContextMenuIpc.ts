import { ipcMain, BrowserWindow, Menu } from 'electron'
import type { IpcModule } from './IpcModule'
import type { ServiceContainer } from '../core/ServiceContainer'
import type { EventBus } from '../core/EventBus'

/**
 * IPC handlers for context menu operations.
 * Handles displaying native context menus for posts.
 */
export class ContextMenuIpc implements IpcModule {
  readonly name = 'context-menu'

  register(_container: ServiceContainer, _eventBus: EventBus): void {
    ipcMain.handle('context-menu:post', (event, postId: string, _postTitle: string) => {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (!win) return

      const menu = Menu.buildFromTemplate([
        {
          label: 'Open',
          click: () => {
            event.sender.send('context-menu:post-action', { action: 'open', postId })
          }
        },
        {
          label: 'Duplicate',
          click: () => {
            event.sender.send('context-menu:post-action', { action: 'duplicate', postId })
          }
        },
        { type: 'separator' },
        {
          label: 'Rename',
          click: () => {
            event.sender.send('context-menu:post-action', { action: 'rename', postId })
          }
        },
        { type: 'separator' },
        {
          label: 'Move to Trash',
          accelerator: 'CmdOrCtrl+Backspace',
          click: () => {
            event.sender.send('context-menu:post-action', { action: 'delete', postId })
          }
        }
      ])

      menu.popup({ window: win })
    })

    console.log(`[IPC] Registered ${this.name} module`)
  }
}
