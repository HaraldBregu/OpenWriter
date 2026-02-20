import { ipcMain } from 'electron'
import type { IpcModule } from './IpcModule'
import type { ServiceContainer } from '../core/ServiceContainer'
import type { EventBus } from '../core/EventBus'
import type { MediaPermissionsService } from '../services/media-permissions'

/**
 * IPC handlers for media permissions (camera, microphone, screen).
 */
export class MediaPermissionsIpc implements IpcModule {
  readonly name = 'media-permissions'

  register(container: ServiceContainer, _eventBus: EventBus): void {
    const media = container.get<MediaPermissionsService>('mediaPermissions')

    ipcMain.handle('media-permissions-get-camera', () => media.getCameraPermissionStatus())
    ipcMain.handle('media-permissions-get-microphone', () => media.getMicrophonePermissionStatus())
    ipcMain.handle('media-permissions-request-camera', () => media.requestCameraPermission())
    ipcMain.handle('media-permissions-request-microphone', () => media.requestMicrophonePermission())
    ipcMain.handle('media-permissions-get-devices', (_e, type: 'audioinput' | 'videoinput') =>
      media.getMediaDevices(type)
    )

    console.log(`[IPC] Registered ${this.name} module`)
  }
}
