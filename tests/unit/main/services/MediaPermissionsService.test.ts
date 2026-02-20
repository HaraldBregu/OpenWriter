/**
 * Tests for MediaPermissionsService.
 * Validates platform-specific media permission handling.
 */
import { systemPreferences } from 'electron'
import { MediaPermissionsService } from '../../../../src/main/services/media-permissions'

describe('MediaPermissionsService', () => {
  let service: MediaPermissionsService
  const originalPlatform = process.platform

  beforeEach(() => {
    jest.clearAllMocks()
    service = new MediaPermissionsService()
  })

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform })
  })

  describe('requestMicrophonePermission', () => {
    it('should return granted on non-darwin platform', async () => {
      Object.defineProperty(process, 'platform', { value: 'win32' })
      const status = await service.requestMicrophonePermission()
      expect(status).toBe('granted')
    })

    it('should check system preferences on darwin', async () => {
      Object.defineProperty(process, 'platform', { value: 'darwin' })
      ;(systemPreferences.getMediaAccessStatus as jest.Mock).mockReturnValueOnce('granted')
      const status = await service.requestMicrophonePermission()
      expect(systemPreferences.getMediaAccessStatus).toHaveBeenCalledWith('microphone')
      expect(status).toBe('granted')
    })

    it('should ask for access on darwin when not-determined', async () => {
      Object.defineProperty(process, 'platform', { value: 'darwin' })
      ;(systemPreferences.getMediaAccessStatus as jest.Mock).mockReturnValueOnce('not-determined')
      ;(systemPreferences.askForMediaAccess as jest.Mock).mockResolvedValueOnce(true)
      const status = await service.requestMicrophonePermission()
      expect(systemPreferences.askForMediaAccess).toHaveBeenCalledWith('microphone')
      expect(status).toBe('granted')
    })

    it('should return denied when access not granted on darwin', async () => {
      Object.defineProperty(process, 'platform', { value: 'darwin' })
      ;(systemPreferences.getMediaAccessStatus as jest.Mock).mockReturnValueOnce('not-determined')
      ;(systemPreferences.askForMediaAccess as jest.Mock).mockResolvedValueOnce(false)
      const status = await service.requestMicrophonePermission()
      expect(status).toBe('denied')
    })

    it('should return denied on error', async () => {
      Object.defineProperty(process, 'platform', { value: 'darwin' })
      ;(systemPreferences.getMediaAccessStatus as jest.Mock).mockImplementationOnce(() => {
        throw new Error('fail')
      })
      const status = await service.requestMicrophonePermission()
      expect(status).toBe('denied')
    })
  })

  describe('requestCameraPermission', () => {
    it('should return granted on non-darwin platform', async () => {
      Object.defineProperty(process, 'platform', { value: 'linux' })
      const status = await service.requestCameraPermission()
      expect(status).toBe('granted')
    })

    it('should check system preferences on darwin', async () => {
      Object.defineProperty(process, 'platform', { value: 'darwin' })
      ;(systemPreferences.getMediaAccessStatus as jest.Mock).mockReturnValueOnce('granted')
      const status = await service.requestCameraPermission()
      expect(systemPreferences.getMediaAccessStatus).toHaveBeenCalledWith('camera')
      expect(status).toBe('granted')
    })
  })

  describe('getMicrophonePermissionStatus', () => {
    it('should return granted on non-darwin', async () => {
      Object.defineProperty(process, 'platform', { value: 'win32' })
      const status = await service.getMicrophonePermissionStatus()
      expect(status).toBe('granted')
    })

    it('should query system preferences on darwin', async () => {
      Object.defineProperty(process, 'platform', { value: 'darwin' })
      ;(systemPreferences.getMediaAccessStatus as jest.Mock).mockReturnValueOnce('denied')
      const status = await service.getMicrophonePermissionStatus()
      expect(status).toBe('denied')
    })

    it('should return not-determined on error', async () => {
      Object.defineProperty(process, 'platform', { value: 'darwin' })
      ;(systemPreferences.getMediaAccessStatus as jest.Mock).mockImplementationOnce(() => {
        throw new Error('fail')
      })
      const status = await service.getMicrophonePermissionStatus()
      expect(status).toBe('not-determined')
    })
  })

  describe('getCameraPermissionStatus', () => {
    it('should return granted on non-darwin', async () => {
      Object.defineProperty(process, 'platform', { value: 'win32' })
      const status = await service.getCameraPermissionStatus()
      expect(status).toBe('granted')
    })

    it('should return not-determined on error (darwin)', async () => {
      Object.defineProperty(process, 'platform', { value: 'darwin' })
      ;(systemPreferences.getMediaAccessStatus as jest.Mock).mockImplementationOnce(() => {
        throw new Error('fail')
      })
      const status = await service.getCameraPermissionStatus()
      expect(status).toBe('not-determined')
    })
  })

  describe('getMediaDevices', () => {
    it('should return empty array (placeholder implementation)', async () => {
      const devices = await service.getMediaDevices('audioinput')
      expect(devices).toEqual([])
    })

    it('should return empty array for videoinput', async () => {
      const devices = await service.getMediaDevices('videoinput')
      expect(devices).toEqual([])
    })
  })
})
