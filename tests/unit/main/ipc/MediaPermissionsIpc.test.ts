/**
 * Tests for MediaPermissionsIpc.
 * Verifies media permission IPC handler registrations.
 */
import { ipcMain } from 'electron'
import { MediaPermissionsIpc } from '../../../../src/main/ipc/MediaPermissionsIpc'
import { ServiceContainer } from '../../../../src/main/core/ServiceContainer'
import { EventBus } from '../../../../src/main/core/EventBus'

describe('MediaPermissionsIpc', () => {
  let module: MediaPermissionsIpc
  let container: ServiceContainer
  let eventBus: EventBus

  beforeEach(() => {
    jest.clearAllMocks()

    const mockMedia = {
      getCameraPermissionStatus: jest.fn().mockResolvedValue('granted'),
      getMicrophonePermissionStatus: jest.fn().mockResolvedValue('granted'),
      requestCameraPermission: jest.fn().mockResolvedValue('granted'),
      requestMicrophonePermission: jest.fn().mockResolvedValue('granted'),
      getMediaDevices: jest.fn().mockResolvedValue([])
    }

    container = new ServiceContainer()
    container.register('mediaPermissions', mockMedia)
    eventBus = new EventBus()
    module = new MediaPermissionsIpc()
  })

  it('should have name "media-permissions"', () => {
    expect(module.name).toBe('media-permissions')
  })

  it('should register 5 ipcMain handlers', () => {
    module.register(container, eventBus)
    expect((ipcMain.handle as jest.Mock).mock.calls).toHaveLength(5)
  })

  it('should register all media-permissions channels', () => {
    module.register(container, eventBus)
    const channels = (ipcMain.handle as jest.Mock).mock.calls.map((c: unknown[]) => c[0])
    expect(channels).toContain('media-permissions-get-camera')
    expect(channels).toContain('media-permissions-get-microphone')
    expect(channels).toContain('media-permissions-request-camera')
    expect(channels).toContain('media-permissions-request-microphone')
    expect(channels).toContain('media-permissions-get-devices')
  })
})
