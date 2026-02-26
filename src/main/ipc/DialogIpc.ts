import { ipcMain } from 'electron'
import type { IpcModule } from './IpcModule'
import type { ServiceContainer } from '../core/ServiceContainer'
import type { EventBus } from '../core/EventBus'
import type { DialogService } from '../services/dialogs'
import { wrapSimpleHandler } from './IpcErrorHandler'
import { DialogChannels } from '../../shared/types/ipc/channels'

/**
 * IPC handlers for native dialog operations.
 */
export class DialogIpc implements IpcModule {
  readonly name = 'dialog'

  register(container: ServiceContainer, _eventBus: EventBus): void {
    const dialog = container.get<DialogService>('dialog')

    ipcMain.handle(
      DialogChannels.open,
      wrapSimpleHandler(() => dialog.showOpenDialog(), DialogChannels.open)
    )
    ipcMain.handle(
      DialogChannels.openDirectory,
      wrapSimpleHandler(
        (multiSelections: boolean) => dialog.showOpenDirectoryDialog(multiSelections),
        DialogChannels.openDirectory
      )
    )
    ipcMain.handle(
      DialogChannels.save,
      wrapSimpleHandler(() => dialog.showSaveDialog(), DialogChannels.save)
    )
    ipcMain.handle(
      DialogChannels.message,
      wrapSimpleHandler(
        (message: string, detail: string, buttons: string[]) =>
          dialog.showMessageBox(message, detail, buttons),
        DialogChannels.message
      )
    )
    ipcMain.handle(
      DialogChannels.error,
      wrapSimpleHandler(
        (title: string, content: string) => dialog.showErrorDialog(title, content),
        DialogChannels.error
      )
    )

    console.log(`[IPC] Registered ${this.name} module`)
  }
}
