import { ipcMain } from 'electron'
import type { IpcModule } from './IpcModule'
import type { ServiceContainer } from '../core/ServiceContainer'
import type { EventBus } from '../core/EventBus'
import type { NotificationService } from '../services/notification'
import { NotificationChannels } from '../../shared/types/ipc/channels'

/**
 * IPC handlers for system notifications.
 */
export class NotificationIpc implements IpcModule {
  readonly name = 'notification'

  register(container: ServiceContainer, eventBus: EventBus): void {
    const notification = container.get<NotificationService>('notification')

    ipcMain.handle(NotificationChannels.show, (_e, options) => notification.showNotification(options))
    ipcMain.handle(NotificationChannels.isSupported, () => notification.isSupported())

    // Broadcast notification events to all windows
    notification.onNotificationEvent((result) => {
      eventBus.broadcast('notification-event', result)
    })

    console.log(`[IPC] Registered ${this.name} module`)
  }
}
