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
      'dialog-open',
      wrapSimpleHandler(() => dialog.showOpenDialog(), 'dialog-open')
    )
    ipcMain.handle(
      'dialog-open-directory',
      wrapSimpleHandler(
        (multiSelections: boolean) => dialog.showOpenDirectoryDialog(multiSelections),
        'dialog-open-directory'
      )
    )
    ipcMain.handle(
      'dialog-save',
      wrapSimpleHandler(() => dialog.showSaveDialog(), 'dialog-save')
    )
    ipcMain.handle(
      'dialog-message',
      wrapSimpleHandler(
        (message: string, detail: string, buttons: string[]) =>
          dialog.showMessageBox(message, detail, buttons),
        'dialog-message'
      )
    )
    ipcMain.handle(
      'dialog-error',
      wrapSimpleHandler(
        (title: string, content: string) => dialog.showErrorDialog(title, content),
        'dialog-error'
      )
    )

    console.log(`[IPC] Registered ${this.name} module`)
  }
}
