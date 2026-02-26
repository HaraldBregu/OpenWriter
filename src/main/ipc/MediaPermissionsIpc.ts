import { ipcMain } from 'electron'
import type { IpcModule } from './IpcModule'
import type { ServiceContainer } from '../core/ServiceContainer'
import type { EventBus } from '../core/EventBus'
import type { MediaPermissionsService } from '../services/media-permissions'
import { MediaChannels } from '../../shared/types/ipc/channels'

/**
 * IPC handlers for media permissions (camera, microphone, screen).
 */
export class MediaPermissionsIpc implements IpcModule {
  readonly name = 'media-permissions'

  register(container: ServiceContainer, _eventBus: EventBus): void {
    const media = container.get<MediaPermissionsService>('mediaPermissions')

    ipcMain.handle(MediaChannels.getCameraStatus, () => media.getCameraPermissionStatus())
    ipcMain.handle(MediaChannels.getMicrophoneStatus, () => media.getMicrophonePermissionStatus())
    ipcMain.handle(MediaChannels.requestCamera, () => media.requestCameraPermission())
    ipcMain.handle(MediaChannels.requestMicrophone, () => media.requestMicrophonePermission())
    ipcMain.handle(MediaChannels.getDevices, (_e, type: 'audioinput' | 'videoinput') =>
      media.getMediaDevices(type)
    )

    console.log(`[IPC] Registered ${this.name} module`)
  }
}
