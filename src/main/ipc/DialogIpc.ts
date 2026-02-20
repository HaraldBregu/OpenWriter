import { ipcMain } from 'electron'
import type { IpcModule } from './IpcModule'
import type { ServiceContainer } from '../core/ServiceContainer'
import type { EventBus } from '../core/EventBus'
import type { DialogService } from '../services/dialogs'
import { wrapSimpleHandler } from './IpcErrorHandler'

/**
 * IPC handlers for native dialog operations.
 */
export class DialogIpc implements IpcModule {
  readonly name = 'dialog'

  register(container: ServiceContainer, _eventBus: EventBus): void {
    const dialog = container.get<DialogService>('dialog')

    ipcMain.handle(
      'dialog-show-open',
      wrapSimpleHandler(() => dialog.showOpenDialog(), 'dialog-show-open')
    )
    ipcMain.handle(
      'dialog-show-save',
      wrapSimpleHandler(() => dialog.showSaveDialog(), 'dialog-show-save')
    )
    ipcMain.handle(
      'dialog-show-message',
      wrapSimpleHandler(
        (message: string, detail: string, buttons: string[]) =>
          dialog.showMessageBox(message, detail, buttons),
        'dialog-show-message'
      )
    )
    ipcMain.handle(
      'dialog-show-error',
      wrapSimpleHandler(
        (title: string, content: string) => dialog.showErrorDialog(title, content),
        'dialog-show-error'
      )
    )

    console.log(`[IPC] Registered ${this.name} module`)
  }
}
