import { ipcMain } from 'electron'
import type { IpcModule } from './IpcModule'
import type { ServiceContainer } from '../core/ServiceContainer'
import type { EventBus } from '../core/EventBus'
import type { DialogService } from '../services/dialogs'

/**
 * IPC handlers for native dialog operations.
 */
export class DialogIpc implements IpcModule {
  readonly name = 'dialog'

  register(container: ServiceContainer, _eventBus: EventBus): void {
    const dialog = container.get<DialogService>('dialog')

    ipcMain.handle('dialog-show-open', () => dialog.showOpenDialog())
    ipcMain.handle('dialog-show-save', () => dialog.showSaveDialog())
    ipcMain.handle('dialog-show-message', (_e, message: string, detail: string, buttons: string[]) =>
      dialog.showMessageBox(message, detail, buttons)
    )
    ipcMain.handle('dialog-show-error', (_e, title: string, content: string) =>
      dialog.showErrorDialog(title, content)
    )

    console.log(`[IPC] Registered ${this.name} module`)
  }
}
